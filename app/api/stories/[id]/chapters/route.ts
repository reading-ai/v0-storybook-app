import { NextResponse } from "next/server"
import { createChapter } from "@/lib/db"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const chapterData = await request.json()
    const chapter = await createChapter({
      ...chapterData,
      story_id: params.id,
    })
    return NextResponse.json(chapter)
  } catch (error) {
    console.error("Error creating chapter:", error)
    return NextResponse.json({ error: "Failed to create chapter" }, { status: 500 })
  }
}
