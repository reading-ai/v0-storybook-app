"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Sparkles, Wand2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

export default function CreateStoryPage() {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [storyParams, setStoryParams] = useState({
    genre: "",
    characters: "",
    setting: "",
    theme: "",
    customPrompt: "",
  })

  const genres = [
    "Fantasy Adventure",
    "Mystery Detective",
    "Science Fiction",
    "Fairy Tale",
    "Animal Adventure",
    "Superhero",
    "Historical Fiction",
    "Comedy",
    "Romance",
    "Thriller",
  ]

  const coverColors = [
    "from-purple-400 to-pink-400",
    "from-blue-400 to-cyan-400",
    "from-green-400 to-emerald-400",
    "from-orange-400 to-red-400",
    "from-indigo-400 to-purple-400",
    "from-teal-400 to-blue-400",
  ]

  const handleCreateStory = async () => {
    if (!storyParams.genre || !storyParams.characters || !storyParams.setting) {
      setError("Please fill in all required fields (Genre, Characters, and Setting)")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // Generate title with comprehensive error handling
      let title = `A ${storyParams.genre} Story`
      let titleMessage = ""

      try {
        console.log("Attempting to generate title...")
        const titleResponse = await fetch("/api/generate-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(storyParams),
        })

        if (titleResponse.ok) {
          const titleData = await titleResponse.json()
          if (titleData.title) {
            title = titleData.title
            if (!titleData.isAIGenerated) {
              titleMessage = titleData.message || "Using creative title template"
            }
          }
        } else {
          console.warn("Title generation API returned error status:", titleResponse.status)
        }
      } catch (titleError) {
        console.warn("Failed to generate title:", titleError)
        titleMessage = "Using fallback title due to API error"
      }

      // Create story object
      const newStory = {
        id: Date.now().toString(),
        title: title,
        genre: storyParams.genre,
        characters: storyParams.characters,
        setting: storyParams.setting,
        theme: storyParams.theme,
        chapters: [],
        createdAt: new Date().toISOString().split("T")[0],
        coverColor: coverColors[Math.floor(Math.random() * coverColors.length)],
      }

      // Save to localStorage
      const savedStories = localStorage.getItem("ai-storybook-stories")
      const stories = savedStories ? JSON.parse(savedStories) : []
      const updatedStories = [newStory, ...stories]
      localStorage.setItem("ai-storybook-stories", JSON.stringify(updatedStories))

      console.log("Story created successfully:", newStory.title)

      // Show message if title was generated with fallback
      if (titleMessage) {
        console.log("Title generation note:", titleMessage)
      }

      // Redirect to generate first chapter
      router.push(`/story/${newStory.id}/continue`)
    } catch (error) {
      console.error("Error creating story:", error)
      setError("There was an error creating your story. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" className="flex items-center">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Library
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <Wand2 className="h-5 w-5 text-purple-600" />
              <span className="font-semibold text-gray-900">Story Creator</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Create Your AI Story
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Tell us about your story preferences, and our AI will craft a personalized tale just for you.
          </p>
        </div>

        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Story Parameters
            </CardTitle>
            <CardDescription>
              Provide details about your story. The app works with or without AI - you can always write chapters
              manually.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="genre">Genre *</Label>
                <Select
                  value={storyParams.genre}
                  onValueChange={(value) => setStoryParams({ ...storyParams, genre: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a genre..." />
                  </SelectTrigger>
                  <SelectContent>
                    {genres.map((genre) => (
                      <SelectItem key={genre} value={genre}>
                        {genre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="characters">Main Characters *</Label>
                <Input
                  id="characters"
                  value={storyParams.characters}
                  onChange={(e) => setStoryParams({ ...storyParams, characters: e.target.value })}
                  placeholder="e.g., A brave young wizard named Alex"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="setting">Setting *</Label>
              <Input
                id="setting"
                value={storyParams.setting}
                onChange={(e) => setStoryParams({ ...storyParams, setting: e.target.value })}
                placeholder="e.g., A magical forest kingdom in medieval times"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">Theme/Plot (Optional)</Label>
              <Input
                id="theme"
                value={storyParams.theme}
                onChange={(e) => setStoryParams({ ...storyParams, theme: e.target.value })}
                placeholder="e.g., Finding courage to overcome fears"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customPrompt">Additional Instructions (Optional)</Label>
              <Textarea
                id="customPrompt"
                value={storyParams.customPrompt}
                onChange={(e) => setStoryParams({ ...storyParams, customPrompt: e.target.value })}
                placeholder="Any specific elements, tone, or style you'd like in your story..."
                rows={3}
              />
            </div>

            <div className="pt-4">
              <Button
                onClick={handleCreateStory}
                disabled={!storyParams.genre || !storyParams.characters || !storyParams.setting || isGenerating}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Wand2 className="h-5 w-5 mr-2 animate-spin" />
                    Creating Your Story...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Create Story & Start Writing
                  </>
                )}
              </Button>
            </div>

            <div className="text-center text-sm text-gray-500">
              <p>
                Don't have DeepSeek AI configured?{" "}
                <Link href="/settings" className="text-purple-600 hover:underline">
                  Set it up in settings
                </Link>{" "}
                or continue with manual writing.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
