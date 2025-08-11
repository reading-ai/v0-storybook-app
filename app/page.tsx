"use client"

import { useState, useEffect } from "react"
import { BookOpen, Plus, Sparkles, Library, Settings, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

export default function HomePage() {
  const [stories, setStories] = useState<Story[]>([])
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    const savedStories = localStorage.getItem("ai-storybook-stories")
    if (savedStories) {
      setStories(JSON.parse(savedStories))
    }

    // Check AI availability
    checkAIStatus()
  }, [])

  const checkAIStatus = async () => {
    try {
      const response = await fetch("/api/check-ai-status")
      const data = await response.json()
      setAiAvailable(data.aiAvailable)
    } catch (error) {
      setAiAvailable(false)
    }
  }

  const coverColors = [
    "from-purple-400 to-pink-400",
    "from-blue-400 to-cyan-400",
    "from-green-400 to-emerald-400",
    "from-orange-400 to-red-400",
    "from-indigo-400 to-purple-400",
    "from-teal-400 to-blue-400",
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  My Storybook
                </h1>
                <p className="text-gray-600 flex items-center gap-2">
                  Create magical stories with DeepSeek AI
                  {aiAvailable !== null && (
                    <Badge variant={aiAvailable ? "default" : "secondary"} className="text-xs">
                      {aiAvailable ? (
                        <>
                          <Zap className="h-3 w-3 mr-1" />
                          DeepSeek AI Enabled
                        </>
                      ) : (
                        "Manual Mode"
                      )}
                    </Badge>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/settings">
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
              <Link href="/create">
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Story
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {stories.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-8">
              <div className="inline-flex p-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full mb-4">
                <Library className="h-16 w-16 text-purple-600" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Your AI Storybook</h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Create personalized stories with our intuitive story builder powered by the official DeepSeek AI provider.
              {aiAvailable
                ? " Use AI to generate content or write manually - the choice is yours!"
                : " Write your stories manually, or enable DeepSeek AI features in settings for automated generation."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/create">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Story
                </Button>
              </Link>
              {!aiAvailable && (
                <Link href="/settings">
                  <Button size="lg" variant="outline">
                    <Sparkles className="h-5 w-5 mr-2" />
                    Enable DeepSeek AI
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Story Collection</h2>
              <p className="text-gray-600">
                {stories.length} {stories.length === 1 ? "story" : "stories"} in your magical library
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {stories.map((story) => (
                <Card
                  key={story.id}
                  className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                >
                  <div className={`h-48 bg-gradient-to-br ${story.coverColor} relative`}>
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-white font-bold text-lg leading-tight line-clamp-2">{story.title}</h3>
                    </div>
                    <div className="absolute top-4 right-4">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full px-2 py-1">
                        <span className="text-white text-xs font-medium">{story.genre}</span>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Characters:</span> {story.characters}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Setting:</span> {story.setting}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Chapters:</span> {story.chapters.length}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/story/${story.id}`} className="flex-1">
                        <Button variant="outline" className="w-full bg-transparent">
                          <BookOpen className="h-4 w-4 mr-2" />
                          Read
                        </Button>
                      </Link>
                      <Link href={`/story/${story.id}/continue`}>
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
