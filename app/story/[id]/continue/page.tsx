"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Sparkles, BookOpen, Edit, Wand2, FileText, Zap, Clock, Square, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import ReactMarkdown from "react-markdown"
import Link from "next/link"

interface Story {
  id: string
  title: string
  genre: string
  characters: string
  setting: string
  theme: string
  chapters: Chapter[]
  createdAt: string
  coverColor: string
  language: string
}

interface Chapter {
  id: string
  title: string
  content: string
  chapterNumber: number
}

interface StreamingEvent {
  event: string
  data: any
}

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
]

export default function ContinueStoryPage() {
  const params = useParams()
  const router = useRouter()
  const [story, setStory] = useState<Story | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [chapterPrompt, setChapterPrompt] = useState("")
  const [generatedContent, setGeneratedContent] = useState("")
  const [streamingContent, setStreamingContent] = useState("")
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [streamingStatus, setStreamingStatus] = useState<string>("")
  const [eventSource, setEventSource] = useState<EventSource | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState("en")

  useEffect(() => {
    const savedStories = localStorage.getItem("ai-storybook-stories")
    let foundStory: Story | null = null
    if (savedStories) {
      const stories: Story[] = JSON.parse(savedStories)
      foundStory = stories.find((s) => s.id === params.id)
      if (foundStory) {
        setStory(foundStory)
        // Set default prompt for next chapter
        const nextChapterNum = foundStory.chapters.length + 1
        if (nextChapterNum === 1) {
          setChapterPrompt(
            `Begin the story by introducing ${foundStory.characters} in ${foundStory.setting}. Set up the main conflict or adventure.`,
          )
        } else {
          setChapterPrompt(
            `Continue the story from where chapter ${foundStory.chapters.length} left off. Advance the plot and develop the characters further.`,
          )
        }
      } else {
        router.push("/")
      }
    } else {
      router.push("/")
    }

    // Load language from story
    if (foundStory && foundStory.language) {
      setSelectedLanguage(foundStory.language)
    }

    // Check AI availability
    checkAIStatus()

    // Cleanup on unmount
    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [params.id, router])

  useEffect(() => {
    // Update word count when content changes
    const content = isGenerating ? streamingContent : generatedContent
    const words = content
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0)
    setWordCount(words.length)
  }, [generatedContent, streamingContent, isGenerating])

  const checkAIStatus = async () => {
    try {
      const response = await fetch("/api/check-ai-status")
      const data = await response.json()
      setAiAvailable(data.aiAvailable)
    } catch (error) {
      setAiAvailable(false)
    }
  }

  const generateChapter = async () => {
    if (!story || !chapterPrompt.trim()) return

    setIsGenerating(true)
    setGeneratedContent("")
    setStreamingContent("")
    setStreamingStatus("Connecting to AI...")

    try {
      const nextChapterNum = story.chapters.length + 1
      const previousChapters = story.chapters
        .map((ch) => `Chapter ${ch.chapterNumber}: ${ch.content.substring(0, 200)}...`)
        .join("\n")

      // Check if AI is available for streaming
      if (!aiAvailable) {
        // Fallback to template with simulated streaming
        const templateContent = generateTemplateChapter(
          nextChapterNum,
          story.characters,
          story.setting,
          story.genre,
          chapterPrompt,
          selectedLanguage,
        )
        await simulateSSEStreaming(templateContent)
        return
      }

      // Send the request data via POST to start streaming
      fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: chapterPrompt,
          genre: story.genre,
          characters: story.characters,
          setting: story.setting,
          chapterNumber: nextChapterNum,
          previousChapters: previousChapters,
          language: selectedLanguage, // Include language in the request
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to start generation")
          }
          return response.body
        })
        .then((body) => {
          if (!body) throw new Error("No response body")

          const reader = body.getReader()
          const decoder = new TextDecoder()

          const processStream = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) {
                  // Handle stream completion
                  console.log("SSE stream completed")
                  if (isGenerating) {
                    // If we're still in generating state, finalize the content
                    if (streamingContent) {
                      setGeneratedContent(streamingContent)
                      setStreamingContent("")
                    }
                    setStreamingStatus("Chapter complete!")
                    setIsGenerating(false)
                  }
                  break
                }

                const chunk = decoder.decode(value, { stream: true })
                const lines = chunk.split("\n")

                let currentEvent = "text" // default event type

                for (const line of lines) {
                  if (line.startsWith("event:")) {
                    currentEvent = line.substring(6).trim()
                    continue
                  }

                  if (line.startsWith("data:")) {
                    const data = line.substring(5).trim()
                    if (data) {
                      try {
                        const parsed = JSON.parse(data)
                        handleSSEEvent(currentEvent, parsed)
                      } catch (e) {
                        console.warn("Failed to parse SSE data:", data)
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.error("Stream processing error:", error)
              handleSSEError(error)
            } finally {
              // Cleanup: ensure we're not in generating state
              if (isGenerating) {
                console.log("Cleaning up SSE stream")
                setIsGenerating(false)
                if (streamingContent) {
                  setGeneratedContent(streamingContent)
                  setStreamingContent("")
                  setStreamingStatus("Chapter complete!")
                }
              }
            }
          }

          processStream()
        })
        .catch((error) => {
          console.error("Generation request failed:", error)
          handleSSEError(error)
        })
    } catch (error) {
      console.error("Error starting chapter generation:", error)
      handleSSEError(error)
    }
  }

  const handleSSEEvent = (event: string, data: any) => {
    switch (event) {
      case "connected":
        setStreamingStatus("Connected to AI service...")
        break

      case "start":
        setStreamingStatus("AI is analyzing your story...")
        break

      case "text":
        setStreamingContent(data.fullContent || "")
        setStreamingStatus("Writing your chapter...")
        break

      case "complete":
        console.log("Received complete event")
        setGeneratedContent(data.fullContent || streamingContent || "")
        setStreamingContent("")
        setStreamingStatus("Chapter complete!")
        setIsGenerating(false)
        // Clean up any event source
        if (eventSource) {
          eventSource.close()
          setEventSource(null)
        }
        break

      case "error":
        console.error("SSE Error:", data.error)
        if (data.fallback) {
          setGeneratedContent(data.fallback)
          setStreamingContent("")
        } else if (streamingContent) {
          // Use whatever content we have so far
          setGeneratedContent(streamingContent)
          setStreamingContent("")
        }
        setStreamingStatus("Error occurred, using available content")
        setIsGenerating(false)
        if (eventSource) {
          eventSource.close()
          setEventSource(null)
        }
        break

      default:
        console.log(`Unhandled SSE event: ${event}`, data)
        break
    }
  }

  const handleSSEError = async (error: any) => {
    console.error("SSE connection error:", error)

    // Fallback to template
    if (story) {
      const nextChapterNum = story.chapters.length + 1
      const templateContent = generateTemplateChapter(
        nextChapterNum,
        story.characters,
        story.setting,
        story.genre,
        chapterPrompt,
        selectedLanguage,
      )
      await simulateSSEStreaming(templateContent)
    }
  }

  // Simulate SSE streaming for fallback content
  const simulateSSEStreaming = async (content: string) => {
    setStreamingStatus("Generating template...")
    setStreamingContent("")

    const words = content.split(" ")
    let currentContent = ""

    for (let i = 0; i < words.length; i++) {
      currentContent += (i > 0 ? " " : "") + words[i]
      setStreamingContent(currentContent)
      setStreamingStatus("Writing your chapter...")

      // Simulate realistic typing speed
      await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 100))
    }

    setGeneratedContent(content)
    setStreamingContent("")
    setStreamingStatus("Chapter complete!")
    setIsGenerating(false)
  }

  const cancelGeneration = () => {
    if (eventSource) {
      eventSource.close()
      setEventSource(null)
    }
    setIsGenerating(false)
    setStreamingContent("")
    setStreamingStatus("")
  }

  const generateTemplateChapter = (
    chapterNumber: number,
    characters: string,
    setting: string,
    genre: string,
    prompt?: string,
    language = "en",
  ): string => {
    // This would be expanded with more language templates
    const isFirstChapter = chapterNumber === 1

    if (language === "es") {
      return isFirstChapter
        ? `# Capítulo ${chapterNumber}: El Comienzo

**${characters}** se encontraba en el umbral de *${setting}*, con el corazón acelerado por la expectación...

${prompt ? `\n### Dirección de la Historia\n*${prompt}*` : ""}

---

*Este es un capítulo de plantilla. Edita este contenido para que coincida con tu visión, o habilita las funciones de DeepSeek AI en configuración para generación automática.*`
        : `# Capítulo ${chapterNumber}: La Aventura Continúa

El viaje de **${characters}** a través de *${setting}* había tomado giros inesperados...

${prompt ? `\n### Dirección de la Historia\n*${prompt}*` : ""}

---

*Este es un capítulo de plantilla. Edita este contenido para que coincida con tu visión, o habilita las funciones de DeepSeek AI en configuración para generación automática.*`
    }

    // Default English template
    return isFirstChapter
      ? `# Chapter ${chapterNumber}: The Beginning

**${characters}** stood at the threshold of *${setting}*, their hearts racing with anticipation...

${prompt ? `\n### Story Direction\n*${prompt}*` : ""}

---

*This is a template chapter. Edit this content to match your vision, or enable DeepSeek AI in settings for automated generation.*`
      : `# Chapter ${chapterNumber}: The Adventure Continues

The journey of **${characters}** through *${setting}* had taken unexpected turns...

${prompt ? `\n### Story Direction\n*${prompt}*` : ""}

---

*This is a template chapter. Edit this content to match your vision, or enable DeepSeek AI in settings for automated generation.*`
  }

  const createManualChapter = () => {
    if (!story) return

    const nextChapterNum = story.chapters.length + 1
    const templateContent = `# Chapter ${nextChapterNum}

Write your chapter content here...

${
  nextChapterNum === 1
    ? `This is the beginning of your **${story.genre.toLowerCase()}** story featuring *${story.characters}* in ${story.setting}.

## Getting Started

You can use **markdown formatting** to make your story more engaging:

- **Bold text** for emphasis
- *Italic text* for thoughts or emphasis
- > Blockquotes for special narration
- Lists for organizing information

Start writing your amazing story!`
    : `Continue your story from where the previous chapter left off.

## Chapter ${nextChapterNum}

Use markdown to format your text and make it more engaging for readers.`
}`

    setGeneratedContent(templateContent)
    setManualMode(true)
  }

  const saveChapter = () => {
    if (!story || !generatedContent.trim()) return

    const newChapter: Chapter = {
      id: Date.now().toString(),
      title: `Chapter ${story.chapters.length + 1}`,
      content: generatedContent,
      chapterNumber: story.chapters.length + 1,
    }

    const updatedStory = {
      ...story,
      chapters: [...story.chapters, newChapter],
    }

    const savedStories = localStorage.getItem("ai-storybook-stories")
    if (savedStories) {
      const stories: Story[] = JSON.parse(savedStories)
      const updatedStories = stories.map((s) => (s.id === story.id ? updatedStory : s))
      localStorage.setItem("ai-storybook-stories", JSON.stringify(updatedStories))
    }

    router.push(`/story/${story.id}`)
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  const estimatedReadTime = Math.ceil(wordCount / 200) // Average reading speed
  const currentContent = isGenerating ? streamingContent : generatedContent
  const currentLanguage = SUPPORTED_LANGUAGES.find((lang) => lang.code === selectedLanguage)

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href={`/story/${story.id}`}>
              <Button variant="ghost" className="flex items-center">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Story
              </Button>
            </Link>
            <div className="text-center">
              <h2 className="font-semibold text-gray-900">{story.title}</h2>
              <p className="text-sm text-gray-600">Chapter {story.chapters.length + 1}</p>
            </div>
            <div className="w-24" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!aiAvailable && (
          <Alert className="mb-6">
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              DeepSeek AI features are not available. You can still create chapters manually or{" "}
              <Link href="/settings" className="underline">
                enable DeepSeek AI features in settings
              </Link>
              .
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-8 lg:grid-cols-5">
          {/* AI Generation Block */}
          <div className="lg:col-span-2">
            <Card className="h-fit shadow-lg border-0 bg-gradient-to-br from-purple-50 to-indigo-50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {aiAvailable ? (
                      <>
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg">
                          <Wand2 className="h-4 w-4 text-white" />
                        </div>
                        AI Story Generator
                      </>
                    ) : (
                      <>
                        <div className="p-2 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg">
                          <Edit className="h-4 w-4 text-white" />
                        </div>
                        Manual Chapter Creator
                      </>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {aiAvailable && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                        <Zap className="h-3 w-3 mr-1" />
                        DeepSeek AI
                      </Badge>
                    )}
                    {currentLanguage && (
                      <Badge variant="outline" className="text-xs">
                        <Globe className="h-3 w-3 mr-1" />
                        {currentLanguage.nativeName}
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {aiAvailable
                    ? `Generate chapters in ${currentLanguage?.name || "English"} for this story.`
                    : "Create your next chapter manually or enable AI features for automated generation."}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {aiAvailable && (
                  <>
                    <div className="space-y-3">
                      <Label htmlFor="prompt" className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Chapter Direction
                      </Label>
                      <Textarea
                        id="prompt"
                        value={chapterPrompt}
                        onChange={(e) => setChapterPrompt(e.target.value)}
                        placeholder="What should happen in this chapter? Be specific about plot points, character development, or scenes you'd like to include..."
                        rows={5}
                        className="resize-none border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                        disabled={isGenerating}
                      />
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        More detailed prompts lead to better results
                      </div>
                    </div>

                    {isGenerating && (
                      <div className="space-y-3 p-4 bg-white/50 rounded-lg border border-purple-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
                            <Sparkles className="h-4 w-4 animate-spin" />
                            DeepSeek AI is writing...
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelGeneration}
                            className="h-7 px-2 text-red-600 hover:text-red-700"
                          >
                            <Square className="h-3 w-3 mr-1" />
                            Stop
                          </Button>
                        </div>
                        <div className="text-xs text-gray-600">
                          <span>{streamingStatus}</span>
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={generateChapter}
                      disabled={!chapterPrompt.trim() || isGenerating}
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg h-12"
                      size="lg"
                    >
                      {isGenerating ? (
                        <>
                          <Sparkles className="h-5 w-5 mr-2 animate-spin" />
                          Generating Chapter...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-5 w-5 mr-2" />
                          Generate Chapter {story.chapters.length + 1}
                        </>
                      )}
                    </Button>
                  </>
                )}

                <div className="relative">
                  {aiAvailable && (
                    <>
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                      <div className="absolute inset-x-0 top-0 flex justify-center">
                        <span className="bg-gradient-to-br from-purple-50 to-indigo-50 px-3 text-sm text-gray-500">
                          or
                        </span>
                      </div>
                    </>
                  )}
                  <Button
                    onClick={createManualChapter}
                    variant="outline"
                    disabled={isGenerating}
                    className={`w-full h-12 border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 ${aiAvailable ? "mt-6" : ""}`}
                    size="lg"
                  >
                    <Edit className="h-5 w-5 mr-2" />
                    Write Chapter Manually
                  </Button>
                </div>

                {/* Story Context */}
                <div className="p-4 bg-white/70 rounded-lg border border-purple-100">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Story Context</h4>
                  <div className="space-y-1 text-xs text-gray-600">
                    <p>
                      <span className="font-medium">Genre:</span> {story.genre}
                    </p>
                    <p>
                      <span className="font-medium">Characters:</span> {story.characters}
                    </p>
                    <p>
                      <span className="font-medium">Setting:</span> {story.setting}
                    </p>
                    {story.theme && (
                      <p>
                        <span className="font-medium">Theme:</span> {story.theme}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Language:</span> {currentLanguage?.name || "English"}
                    </p>
                    <p>
                      <span className="font-medium">Previous Chapters:</span> {story.chapters.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chapter Content Block */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
                      <BookOpen className="h-4 w-4 text-white" />
                    </div>
                    Chapter Content
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {currentContent && (
                      <>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <Badge variant="outline" className="text-xs">
                            {wordCount} words
                          </Badge>
                          {wordCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />~{estimatedReadTime} min read
                            </Badge>
                          )}
                        </div>
                        {!isGenerating && (
                          <div className="flex rounded-lg border border-gray-200 p-1">
                            <Button
                              variant={!isPreviewMode ? "default" : "ghost"}
                              size="sm"
                              onClick={() => setIsPreviewMode(false)}
                              className="h-7 px-3 text-xs"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant={isPreviewMode ? "default" : "ghost"}
                              size="sm"
                              onClick={() => setIsPreviewMode(true)}
                              className="h-7 px-3 text-xs"
                            >
                              <BookOpen className="h-3 w-3 mr-1" />
                              Preview
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <CardDescription>
                  {currentContent
                    ? isGenerating
                      ? "Watch your chapter being written in real-time by AI"
                      : "Review and edit your chapter content before saving. Use markdown for formatting!"
                    : "Your chapter content will appear here once generated or written"}
                </CardDescription>
              </CardHeader>

              <CardContent>
                {currentContent ? (
                  <div className="space-y-6">
                    <div className="relative">
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200 min-h-[400px]">
                        {(isPreviewMode && !isGenerating) || isGenerating ? (
                          <div className="prose prose-gray max-w-none">
                            <ReactMarkdown
                              components={{
                                h1: ({ children }) => (
                                  <h1 className="text-3xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-2">
                                    {children}
                                  </h1>
                                ),
                                h2: ({ children }) => (
                                  <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-8">{children}</h2>
                                ),
                                h3: ({ children }) => (
                                  <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">{children}</h3>
                                ),
                                p: ({ children }) => (
                                  <p className="text-gray-700 leading-relaxed mb-4 text-base">{children}</p>
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-semibold text-gray-900">{children}</strong>
                                ),
                                em: ({ children }) => <em className="italic text-gray-800">{children}</em>,
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-4 border-purple-300 pl-4 py-2 my-4 bg-purple-50 italic text-gray-700">
                                    {children}
                                  </blockquote>
                                ),
                                ul: ({ children }) => (
                                  <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>
                                ),
                                li: ({ children }) => <li className="text-gray-700">{children}</li>,
                                hr: () => <hr className="my-8 border-gray-300" />,
                                code: ({ children }) => (
                                  <code className="bg-gray-200 px-2 py-1 rounded text-sm font-mono">{children}</code>
                                ),
                              }}
                            >
                              {currentContent}
                            </ReactMarkdown>
                            {isGenerating && <div className="inline-block w-2 h-5 bg-purple-600 animate-pulse ml-1" />}
                          </div>
                        ) : (
                          <Textarea
                            value={generatedContent}
                            onChange={(e) => setGeneratedContent(e.target.value)}
                            className="min-h-[350px] border-none bg-transparent resize-none focus:ring-0 text-gray-800 leading-relaxed text-base"
                            placeholder="Write your chapter content here... You can use markdown formatting:

# Chapter Title
## Section Heading
**Bold text** for emphasis
*Italic text* for thoughts
> Blockquotes for special narration

- Bullet points
- For lists

---

Horizontal lines for scene breaks"
                          />
                        )}
                      </div>

                      {/* Writing Stats */}
                      <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 text-xs text-gray-500 border">
                        {wordCount} words • {currentContent.length} characters
                        {isGenerating && <span className="text-green-600 ml-2">● Live</span>}
                      </div>
                    </div>

                    {/* Markdown Help */}
                    {!isPreviewMode && !isGenerating && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Markdown Formatting Tips</h4>
                        <div className="text-xs text-blue-800 grid grid-cols-2 gap-2">
                          <div>
                            <code className="bg-blue-100 px-1 rounded"># Title</code> - Large heading
                          </div>
                          <div>
                            <code className="bg-blue-100 px-1 rounded">**bold**</code> - Bold text
                          </div>
                          <div>
                            <code className="bg-blue-100 px-1 rounded">## Subtitle</code> - Medium heading
                          </div>
                          <div>
                            <code className="bg-blue-100 px-1 rounded">*italic*</code> - Italic text
                          </div>
                          <div>
                            <code className="bg-blue-100 px-1 rounded">&gt; Quote</code> - Blockquote
                          </div>
                          <div>
                            <code className="bg-blue-100 px-1 rounded">---</code> - Horizontal line
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        onClick={saveChapter}
                        disabled={isGenerating}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg h-12"
                        size="lg"
                      >
                        <BookOpen className="h-5 w-5 mr-2" />
                        Save Chapter & Continue Reading
                      </Button>
                      <Button
                        variant="outline"
                        disabled={isGenerating}
                        onClick={() => {
                          setGeneratedContent("")
                          setStreamingContent("")
                          setManualMode(false)
                          setIsPreviewMode(false)
                        }}
                        className="px-6 h-12 border-2"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="mb-6">
                      <div className="inline-flex p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-4">
                        <FileText className="h-12 w-12 text-gray-400" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Create</h3>
                    <p className="text-gray-600 max-w-md mx-auto mb-4">
                      {aiAvailable
                        ? `Use the AI generator to create stories in ${currentLanguage?.name || "English"}.`
                        : "Click 'Write Chapter Manually' to start creating your next chapter."}
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 max-w-md mx-auto">
                      <p className="text-sm text-amber-800">
                        💡 <strong>Pro tip:</strong> Experience real-time streaming as your story comes to life in your
                        chosen language!
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
