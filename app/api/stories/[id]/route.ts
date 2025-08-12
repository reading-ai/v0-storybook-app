import { NextResponse } from "next/server"
import { getStoryById, updateStory, deleteStory } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const story = await getStoryById(params.id)
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 })
    }
    return NextResponse.json(story)
  } catch (error) {
    console.error("Error fetching story:", error)
    return NextResponse.json({ error: "Failed to fetch story" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const updates = await request.json()
    const story = await updateStory(params.id, updates)
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 })
    }
    return NextResponse.json(story)
  } catch (error) {
    console.error("Error updating story:", error)
    return NextResponse.json({ error: "Failed to update story" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const success = await deleteStory(params.id)
    if (!success) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting story:", error)
    return NextResponse.json({ error: "Failed to delete story" }, { status: 500 })
  }
}
