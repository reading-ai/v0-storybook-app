import { NextResponse } from "next/server"
import { getAllStories, createStory } from "@/lib/db"

export async function GET() {
  try {
    const stories = await getAllStories()
    return NextResponse.json(stories)
  } catch (error) {
    console.error("Error fetching stories:", error)
    return NextResponse.json({ error: "Failed to fetch stories" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const storyData = await request.json()
    const story = await createStory(storyData)
    return NextResponse.json(story)
  } catch (error) {
    console.error("Error creating story:", error)
    return NextResponse.json({ error: "Failed to create story" }, { status: 500 })
  }
}
