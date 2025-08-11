"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Sparkles, BookOpen, Edit, Wand2, FileText, Zap, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [wordCount, setWordCount] = useState(0)

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
    const words = generatedContent
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0)
    setWordCount(words.length)
  }, [generatedContent])

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
    setGenerationProgress(0)

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 90) return prev
        return prev + Math.random() * 10
      })
    }, 500)

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

        let content = ""
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split("\n")

            for (const line of lines) {
              if (line.startsWith("0:")) {
                try {
                  const data = JSON.parse(line.slice(2))
                  if (data.type === "text-delta") {
                    content += data.textDelta
                    setGeneratedContent(content)
                    // Update progress based on content length
                    const estimatedProgress = Math.min(90, (content.length / 500) * 90)
                    setGenerationProgress(estimatedProgress)
                  }
                } catch (e) {
                  // Ignore parsing errors for individual chunks
                }
              }
            }
          }
          setGenerationProgress(100)
        } finally {
          reader.releaseLock()
        }

        // If no content was generated from streaming, provide a fallback
        if (!content.trim()) {
          throw new Error("No content generated from streaming")
        }
      }
    } catch (error) {
      console.error("Error generating chapter:", error)

      // Provide a helpful fallback chapter
      const nextChapterNum = story.chapters.length + 1
      const fallbackContent = `Chapter ${nextChapterNum}

The adventure continues for ${story.characters} in the world of ${story.setting}. 

${
  nextChapterNum === 1
    ? `This marks the beginning of an exciting ${story.genre.toLowerCase()} story. ${story.characters} find themselves in ${story.setting}, where new adventures await.

The story unfolds as our characters discover the challenges and mysteries that lie ahead. What will happen next in this thrilling tale?`
    : `The story continues from the previous chapter, building upon the adventures of ${story.characters}. 

New developments arise as the plot thickens, and our characters face fresh challenges in their journey through ${story.setting}.`
}

[This is a template chapter. You can edit this text to write your own content, or try enabling DeepSeek AI features in settings.]`

      setGeneratedContent(fallbackContent)
      setGenerationProgress(100)
    } finally {
      clearInterval(progressInterval)
      setIsGenerating(false)
    }
  }

  const createManualChapter = () => {
    if (!story) return

    const nextChapterNum = story.chapters.length + 1
    const templateContent = `Chapter ${nextChapterNum}

Write your chapter content here...

${
  nextChapterNum === 1
    ? `This is the beginning of your ${story.genre.toLowerCase()} story featuring ${story.characters} in ${story.setting}.`
    : `Continue your story from where the previous chapter left off.`
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
                    ? "Describe your chapter direction and let AI craft an engaging story for you."
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
                      />
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        More detailed prompts lead to better results
                      </div>
                    </div>

                    {isGenerating && (
                      <div className="space-y-3 p-4 bg-white/50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
                          <Sparkles className="h-4 w-4 animate-spin" />
                          DeepSeek AI is crafting your chapter...
                        </div>
                        <Progress value={generationProgress} className="h-2" />
                        <div className="text-xs text-gray-600">
                          {generationProgress < 30 && "Analyzing your story context..."}
                          {generationProgress >= 30 && generationProgress < 60 && "Generating creative content..."}
                          {generationProgress >= 60 && generationProgress < 90 && "Refining the narrative..."}
                          {generationProgress >= 90 && "Finalizing your chapter..."}
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
                      <span className="font-medium">Previous Chapters:</span> {story.chapters.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chapter Content Block - Enhanced */}
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
                  {generatedContent && (
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
                  )}
                </div>
                <CardDescription>
                  {generatedContent
                    ? "Review and edit your chapter content before saving"
                    : "Your chapter content will appear here once generated or written"}
                </CardDescription>
              </CardHeader>

              <CardContent>
                {generatedContent ? (
                  <div className="space-y-6">
                    <div className="relative">
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200 min-h-[400px]">
                        <Textarea
                          value={generatedContent}
                          onChange={(e) => setGeneratedContent(e.target.value)}
                          className="min-h-[350px] border-none bg-transparent resize-none focus:ring-0 text-gray-800 leading-relaxed text-base"
                          placeholder="Write your chapter content here..."
                        />
                      </div>

                      {/* Writing Stats */}
                      <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 text-xs text-gray-500 border">
                        {wordCount} words • {generatedContent.length} characters
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        onClick={saveChapter}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg h-12"
                        size="lg"
                      >
                        <BookOpen className="h-5 w-5 mr-2" />
                        Save Chapter & Continue Reading
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setGeneratedContent("")
                          setManualMode(false)
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
                    <p className="text-gray-600 max-w-md mx-auto">
                      {aiAvailable
                        ? "Use the AI generator to create your chapter, or write it manually using your own creativity."
                        : "Click 'Write Chapter Manually' to start creating your next chapter."}
                    </p>
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
