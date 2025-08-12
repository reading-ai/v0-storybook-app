"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

export default function EditStoryPage() {
  const params = useParams()
  const router = useRouter()
  const [story, setStory] = useState<Story | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editedStory, setEditedStory] = useState({
    title: "",
    genre: "",
    characters: "",
    setting: "",
    theme: "",
  })

  useEffect(() => {
    const loadStory = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/stories/${params.id}`)
        if (response.ok) {
          const storyData = await response.json()
          setStory(storyData)
          setEditedStory({
            title: storyData.title,
            genre: storyData.genre,
            characters: storyData.characters,
            setting: storyData.setting,
            theme: storyData.theme || "",
          })
        } else if (response.status === 404) {
          // Fallback to localStorage if not found in database
          const savedStories = localStorage.getItem("ai-storybook-stories")
          if (savedStories) {
            const stories: Story[] = JSON.parse(savedStories)
            const foundStory = stories.find((s) => s.id === params.id)
            if (foundStory) {
              setStory(foundStory)
              setEditedStory({
                title: foundStory.title,
                genre: foundStory.genre,
                characters: foundStory.characters,
                setting: foundStory.setting,
                theme: foundStory.theme || "",
              })
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
            setEditedStory({
              title: foundStory.title,
              genre: foundStory.genre,
              characters: foundStory.characters,
              setting: foundStory.setting,
              theme: foundStory.theme || "",
            })
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

  const handleSave = async () => {
    if (!story || !editedStory.title.trim()) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/stories/${story.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editedStory.title,
          genre: editedStory.genre || "General",
          characters: editedStory.characters,
          setting: editedStory.setting,
          theme: editedStory.theme,
        }),
      })

      if (response.ok) {
        router.push(`/story/${story.id}`)
      } else {
        throw new Error("Failed to save to database")
      }
    } catch (err) {
      console.error("Error saving story:", err)
      // Fallback to localStorage on error
      const savedStories = localStorage.getItem("ai-storybook-stories")
      if (savedStories) {
        const stories: Story[] = JSON.parse(savedStories)
        const updatedStories = stories.map((s) =>
          s.id === story.id
            ? {
                ...s,
                title: editedStory.title,
                genre: editedStory.genre || "General",
                characters: editedStory.characters,
                setting: editedStory.setting,
                theme: editedStory.theme,
              }
            : s,
        )
        localStorage.setItem("ai-storybook-stories", JSON.stringify(updatedStories))
        router.push(`/story/${story.id}`)
      } else {
        setError("Failed to save story")
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <div>Loading story...</div>
        </div>
      </div>
    )
  }

  if (error || !story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Story not found</h2>
          <p className="text-gray-600 mb-4">{error || "The story you're trying to edit doesn't exist."}</p>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href={`/story/${story.id}`}>
              <Button variant="ghost" className="flex items-center">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Story
              </Button>
            </Link>
            <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Edit Story</CardTitle>
            <CardDescription>Make changes to your story details. Changes are saved to the database.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editedStory.title}
                onChange={(e) => setEditedStory({ ...editedStory, title: e.target.value })}
                placeholder="Enter story title..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="genre">Genre</Label>
              <Input
                id="genre"
                value={editedStory.genre}
                onChange={(e) => setEditedStory({ ...editedStory, genre: e.target.value })}
                placeholder="e.g., Fantasy, Mystery, Romance..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="characters">Characters</Label>
              <Textarea
                id="characters"
                value={editedStory.characters}
                onChange={(e) => setEditedStory({ ...editedStory, characters: e.target.value })}
                placeholder="Main characters in your story..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="setting">Setting</Label>
              <Textarea
                id="setting"
                value={editedStory.setting}
                onChange={(e) => setEditedStory({ ...editedStory, setting: e.target.value })}
                placeholder="Where and when your story takes place..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="theme">Theme (Optional)</Label>
              <Textarea
                id="theme"
                value={editedStory.theme}
                onChange={(e) => setEditedStory({ ...editedStory, theme: e.target.value })}
                placeholder="Central theme or message of your story..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
