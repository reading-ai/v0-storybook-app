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
  description: string
  content: string
  genre: string
  createdAt: string
  updatedAt: string
}

export default function EditStoryPage() {
  const params = useParams()
  const router = useRouter()
  const [story, setStory] = useState<Story | null>(null)
  const [editedStory, setEditedStory] = useState({
    title: "",
    description: "",
    content: "",
    genre: "",
  })

  useEffect(() => {
    const savedStories = localStorage.getItem("my-storybook-stories")
    if (savedStories) {
      const stories: Story[] = JSON.parse(savedStories)
      const foundStory = stories.find((s) => s.id === params.id)
      if (foundStory) {
        setStory(foundStory)
        setEditedStory({
          title: foundStory.title,
          description: foundStory.description,
          content: foundStory.content,
          genre: foundStory.genre,
        })
      } else {
        router.push("/")
      }
    } else {
      router.push("/")
    }
  }, [params.id, router])

  const handleSave = () => {
    if (!story || !editedStory.title.trim()) return

    const savedStories = localStorage.getItem("my-storybook-stories")
    if (savedStories) {
      const stories: Story[] = JSON.parse(savedStories)
      const updatedStories = stories.map((s) =>
        s.id === story.id
          ? {
              ...s,
              title: editedStory.title,
              description: editedStory.description,
              content: editedStory.content,
              genre: editedStory.genre || "General",
              updatedAt: new Date().toISOString().split("T")[0],
            }
          : s,
      )
      localStorage.setItem("my-storybook-stories", JSON.stringify(updatedStories))
      router.push(`/story/${story.id}`)
    }
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Story not found</h2>
          <p className="text-gray-600 mb-4">The story you're trying to edit doesn't exist.</p>
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
            <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Edit Story</CardTitle>
            <CardDescription>Make changes to your story. All changes are saved locally.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editedStory.description}
                onChange={(e) => setEditedStory({ ...editedStory, description: e.target.value })}
                placeholder="Brief description of your story..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content">Story Content</Label>
              <Textarea
                id="content"
                value={editedStory.content}
                onChange={(e) => setEditedStory({ ...editedStory, content: e.target.value })}
                placeholder="Write your story..."
                rows={15}
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
