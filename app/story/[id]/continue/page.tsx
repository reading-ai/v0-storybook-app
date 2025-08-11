"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Sparkles, BookOpen, Edit, Wand2, FileText, Zap, Clock, Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
}

interface Chapter {
  id: string
  title: string
  content: string
  chapterNumber: number
}

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
  const [generationProgress, setGenerationProgress] = useState(0)
  const [wordCount, setWordCount] = useState(0)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isStreamingPaused, setIsStreamingPaused] = useState(false)
  const [streamingSpeed, setStreamingSpeed] = useState(50) // milliseconds between characters
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  useEffect(() => {
    const savedStories = localStorage.getItem("ai-storybook-stories")
    if (savedStories) {
      const stories: Story[] = JSON.parse(savedStories)
      const foundStory = stories.find((s) => s.id === params.id)
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

    // Check AI availability
    checkAIStatus()
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
    setGenerationProgress(0)
    setIsStreamingPaused(false)

    // Create abort controller for cancellation
    const controller = new AbortController()
    setAbortController(controller)

    try {
      const nextChapterNum = story.chapters.length + 1
      const previousChapters = story.chapters
        .map((ch) => `Chapter ${ch.chapterNumber}: ${ch.content.substring(0, 200)}...`)
        .join("\n")

      const response = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: chapterPrompt,
          genre: story.genre,
          characters: story.characters,
          setting: story.setting,
          chapterNumber: nextChapterNum,
          previousChapters: previousChapters,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to generate chapter")
      }

      // Check if response is JSON (template/error) or stream
      const contentType = response.headers.get("content-type")

      if (contentType?.includes("application/json")) {
        // Handle JSON response (template or regular generation)
        const data = await response.json()
        if (data.content) {
          // Simulate streaming for non-streaming responses
          await simulateStreaming(data.content, controller.signal)
          setGeneratedContent(data.content)
          setGenerationProgress(100)
          if (data.message) {
            console.log("Generation message:", data.message)
          }
        } else {
          throw new Error(data.error || "Failed to generate chapter")
        }
      } else {
        // Handle streaming response
        console.log("Processing streaming response...")
        const reader = response.body?.getReader()
        if (!reader) throw new Error("No reader available")

        let fullContent = ""
        try {
          while (true) {
            if (controller.signal.aborted) break

            const { done, value } = await reader.read()
            if (done) break

            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split("\n")

            for (const line of lines) {
              if (line.startsWith("0:")) {
                try {
                  const data = JSON.parse(line.slice(2))
                  if (data.type === "text-delta") {
                    fullContent += data.textDelta

                    // Stream the content character by character for better UX
                    await streamContentToUI(data.textDelta, controller.signal)

                    // Update progress based on content length
                    const estimatedProgress = Math.min(90, (fullContent.length / 500) * 90)
                    setGenerationProgress(estimatedProgress)
                  }
                } catch (e) {
                  // Ignore parsing errors for individual chunks
                }
              }
            }
          }

          if (!controller.signal.aborted) {
            setGeneratedContent(fullContent)
            setGenerationProgress(100)
          }
        } finally {
          reader.releaseLock()
        }

        // If no content was generated from streaming, provide a fallback
        if (!fullContent.trim() && !controller.signal.aborted) {
          throw new Error("No content generated from streaming")
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Generation was cancelled by user")
        return
      }

      console.error("Error generating chapter:", error)

      // Provide a helpful fallback chapter
      const nextChapterNum = story.chapters.length + 1
      const fallbackContent = `# Chapter ${nextChapterNum}

The adventure continues for **${story.characters}** in the world of *${story.setting}*. 

${
  nextChapterNum === 1
    ? `This marks the beginning of an exciting ${story.genre.toLowerCase()} story. ${story.characters} find themselves in ${story.setting}, where new adventures await.

## The Journey Begins

The story unfolds as our characters discover the challenges and mysteries that lie ahead. What will happen next in this thrilling tale?`
    : `The story continues from the previous chapter, building upon the adventures of ${story.characters}. 

## New Developments

New developments arise as the plot thickens, and our characters face fresh challenges in their journey through ${story.setting}.`
}

---

*This is a template chapter. You can edit this text to write your own content, or try enabling DeepSeek AI features in settings.*`

      await simulateStreaming(fallbackContent, controller.signal)
      setGeneratedContent(fallbackContent)
      setGenerationProgress(100)
    } finally {
      setIsGenerating(false)
      setAbortController(null)
    }
  }

  // Simulate streaming for non-streaming responses
  const simulateStreaming = async (content: string, signal: AbortSignal) => {
    setStreamingContent("")
    for (let i = 0; i < content.length; i++) {
      if (signal.aborted) break

      while (isStreamingPaused && !signal.aborted) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      if (signal.aborted) break

      setStreamingContent(content.substring(0, i + 1))
      await new Promise((resolve) => setTimeout(resolve, streamingSpeed))
    }
  }

  // Stream content character by character for real streaming
  const streamContentToUI = async (newContent: string, signal: AbortSignal) => {
    for (let i = 0; i < newContent.length; i++) {
      if (signal.aborted) break

      while (isStreamingPaused && !signal.aborted) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      if (signal.aborted) break

      setStreamingContent((prev) => prev + newContent[i])
      await new Promise((resolve) => setTimeout(resolve, streamingSpeed))
    }
  }

  const cancelGeneration = () => {
    if (abortController) {
      abortController.abort()
      setIsGenerating(false)
      setGenerationProgress(0)
      setStreamingContent("")
    }
  }

  const toggleStreamingPause = () => {
    setIsStreamingPaused(!isStreamingPaused)
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
          {/* AI Generation Block - Enhanced */}
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
                  {aiAvailable && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                      <Zap className="h-3 w-3 mr-1" />
                      DeepSeek AI
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-sm">
                  {aiAvailable
                    ? "Describe your chapter direction and watch AI craft your story in real-time."
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
                            DeepSeek AI is writing your story...
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={toggleStreamingPause} className="h-7 px-2">
                              {isStreamingPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelGeneration}
                              className="h-7 px-2 text-red-600 hover:text-red-700"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                        <Progress value={generationProgress} className="h-2" />
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>
                            {generationProgress < 30 && "Analyzing story context..."}
                            {generationProgress >= 30 && generationProgress < 60 && "Generating creative content..."}
                            {generationProgress >= 60 && generationProgress < 90 && "Refining narrative..."}
                            {generationProgress >= 90 && "Finalizing chapter..."}
                          </span>
                          <span>{wordCount} words</span>
                        </div>
                        {isStreamingPaused && (
                          <div className="text-xs text-amber-600 flex items-center gap-1">
                            <Pause className="h-3 w-3" />
                            Streaming paused - click play to continue
                          </div>
                        )}
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

                {/* Streaming Controls */}
                {isGenerating && (
                  <div className="p-3 bg-white/70 rounded-lg border border-purple-100">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Streaming Controls</h4>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="speed" className="text-xs">
                        Speed:
                      </Label>
                      <input
                        id="speed"
                        type="range"
                        min="10"
                        max="200"
                        value={streamingSpeed}
                        onChange={(e) => setStreamingSpeed(Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-xs text-gray-600 w-12">
                        {streamingSpeed < 50 ? "Fast" : streamingSpeed < 100 ? "Normal" : "Slow"}
                      </span>
                    </div>
                  </div>
                )}

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
                      <span className="font-medium">Previous Chapters:</span> {story.chapters.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chapter Content Block - Enhanced with Streaming */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
                      <BookOpen className="h-4 w-4 text-white" />
                    </div>
                    Chapter Content
                    {isGenerating && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 animate-pulse">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Live Streaming
                      </Badge>
                    )}
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
                        ? "Use the AI generator to watch your chapter being written in real-time, or write it manually."
                        : "Click 'Write Chapter Manually' to start creating your next chapter."}
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 max-w-md mx-auto">
                      <p className="text-sm text-amber-800">
                        💡 <strong>Pro tip:</strong> Watch the magic happen as AI writes your story live with streaming
                        generation!
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
