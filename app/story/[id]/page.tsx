"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus, BookOpen, ChevronLeft, ChevronRight, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  language?: string
}

interface Chapter {
  id: string
  title: string
  content: string
  chapterNumber: number
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

export default function StoryViewerPage() {
  const params = useParams()
  const router = useRouter()
  const [story, setStory] = useState<Story | null>(null)
  const [currentChapter, setCurrentChapter] = useState(0)
  const [showCover, setShowCover] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadStory = async () => {
      try {
        setLoading(true)
        setError(null)

        // Try to load from database first
        const response = await fetch(`/api/stories/${params.id}`)
        if (response.ok) {
          const storyData = await response.json()
          setStory(storyData)
        } else if (response.status === 404) {
          // Fallback to localStorage if not found in database
          const savedStories = localStorage.getItem("ai-storybook-stories")
          if (savedStories) {
            const stories: Story[] = JSON.parse(savedStories)
            const foundStory = stories.find((s) => s.id === params.id)
            if (foundStory) {
              setStory(foundStory)
            } else {
              setError("Story not found")
              router.push("/")
            }
          } else {
            setError("Story not found")
            router.push("/")
          }
        } else {
          throw new Error("Failed to load story")
        }
      } catch (err) {
        console.error("Error loading story:", err)
        // Fallback to localStorage on error
        const savedStories = localStorage.getItem("ai-storybook-stories")
        if (savedStories) {
          const stories: Story[] = JSON.parse(savedStories)
          const foundStory = stories.find((s) => s.id === params.id)
          if (foundStory) {
            setStory(foundStory)
          } else {
            setError("Story not found")
            router.push("/")
          }
        } else {
          setError("Failed to load story")
          router.push("/")
        }
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadStory()
    }
  }, [params.id, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <div>Loading story...</div>
        </div>
      </div>
    )
  }

  if (error || !story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error || "Story not found"}</div>
          <Link href="/">
            <Button>Return to Library</Button>
          </Link>
        </div>
      </div>
    )
  }

  const nextChapter = () => {
    if (showCover) {
      if (story.chapters.length === 0) {
        router.push(`/story/${story.id}/continue`)
        return
      }
      setShowCover(false)
      setCurrentChapter(0)
    } else if (currentChapter < story.chapters.length - 1) {
      setCurrentChapter(currentChapter + 1)
    }
  }

  const prevChapter = () => {
    if (currentChapter > 0) {
      setCurrentChapter(currentChapter - 1)
    } else if (!showCover) {
      setShowCover(true)
    }
  }

  const canGoNext = showCover ? story.chapters.length > 0 : currentChapter < story.chapters.length - 1
  const canGoPrev = !showCover

  const currentLanguage = SUPPORTED_LANGUAGES.find((lang) => lang.code === story.language) || SUPPORTED_LANGUAGES[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" className="flex items-center">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Library
              </Button>
            </Link>

            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="flex items-center gap-2 justify-center mb-1">
                  <h2 className="font-semibold text-gray-900">{story.title}</h2>
                  {story.language && story.language !== "en" && (
                    <Badge variant="outline" className="text-xs">
                      <Globe className="h-3 w-3 mr-1" />
                      {currentLanguage.nativeName}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {showCover ? "Cover" : `Chapter ${currentChapter + 1} of ${story.chapters.length}`}
                </p>
              </div>
            </div>

            <Link href={`/story/${story.id}/continue`}>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Chapter
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="relative">
          {/* Book Container */}
          <div
            className="bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{ aspectRatio: "3/4", minHeight: "600px" }}
          >
            {showCover ? (
              // Cover Page
              <div
                className={`h-full bg-gradient-to-br ${story.coverColor} relative flex flex-col justify-center items-center text-white p-8`}
              >
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative z-10 text-center">
                  <BookOpen className="h-16 w-16 mx-auto mb-6 opacity-90" />
                  <h1 className="text-4xl font-bold mb-4 leading-tight">{story.title}</h1>
                  <div className="space-y-2 mb-8">
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                      {story.genre}
                    </Badge>
                    {story.language && story.language !== "en" && (
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30 ml-2">
                        <Globe className="h-3 w-3 mr-1" />
                        {currentLanguage.name}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm opacity-90 space-y-1">
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
                  </div>
                  <div className="mt-8">
                    <p className="text-lg opacity-90">
                      {story.chapters.length === 0 ? "No chapters yet" : `${story.chapters.length} Chapters`}
                    </p>
                    {story.chapters.length === 0 && (
                      <p className="text-sm opacity-75 mt-2">Click "Add Chapter" or "Next" to start writing</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Chapter Page with Markdown Rendering
              <div className="h-full p-8 flex flex-col">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{story.chapters[currentChapter]?.title}</h2>
                  <div className="w-16 h-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full" />
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="prose prose-gray max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-2xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-xl font-semibold text-gray-800 mb-3 mt-6">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-4">{children}</h3>
                        ),
                        p: ({ children }) => <p className="text-gray-800 leading-relaxed mb-4 text-base">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                        em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-purple-300 pl-4 py-2 my-4 bg-purple-50/50 italic text-gray-700">
                            {children}
                          </blockquote>
                        ),
                        ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="text-gray-800">{children}</li>,
                        hr: () => <hr className="my-6 border-gray-300" />,
                        code: ({ children }) => (
                          <code className="bg-gray-200 px-2 py-1 rounded text-sm font-mono">{children}</code>
                        ),
                      }}
                    >
                      {story.chapters[currentChapter]?.content || ""}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Chapter Navigation */}
                <div className="flex justify-between items-center mt-6 pt-6 border-t">
                  <Button variant="ghost" onClick={prevChapter} disabled={!canGoPrev} className="flex items-center">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  <div className="flex space-x-2">
                    {Array.from({ length: story.chapters.length }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentChapter(i)}
                        className={`w-3 h-3 rounded-full transition-colors ${
                          i === currentChapter ? "bg-purple-600" : "bg-gray-300 hover:bg-gray-400"
                        }`}
                      />
                    ))}
                  </div>

                  <Button variant="ghost" onClick={nextChapter} disabled={!canGoNext} className="flex items-center">
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Side Navigation */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16">
            <Button
              variant="outline"
              size="icon"
              onClick={prevChapter}
              disabled={!canGoPrev}
              className="rounded-full shadow-lg bg-white/90 backdrop-blur-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16">
            <Button
              variant="outline"
              size="icon"
              onClick={nextChapter}
              disabled={!canGoNext}
              className="rounded-full shadow-lg bg-white/90 backdrop-blur-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Story Info */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">{showCover ? "Click next to start reading" : `Reading ${story.title}`}</p>
        </div>
      </main>
    </div>
  )
}
