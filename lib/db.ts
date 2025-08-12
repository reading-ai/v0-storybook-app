import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface Story {
  id: string
  title: string
  genre: string
  characters: string
  setting: string
  theme: string
  created_at: string
  cover_color: string
  language: string
}

export interface Chapter {
  id: string
  story_id: string
  title: string
  content: string
  chapter_number: number
  created_at: string
}

export interface StoryWithChapters extends Story {
  chapters: Chapter[]
}

function transformStoryForFrontend(dbStory: any): any {
  return {
    id: dbStory.id,
    title: dbStory.title,
    genre: dbStory.genre,
    characters: dbStory.characters,
    setting: dbStory.setting,
    theme: dbStory.theme,
    createdAt: dbStory.created_at,
    coverColor: dbStory.cover_color,
    language: dbStory.language || "en",
  }
}

function transformChapterForFrontend(dbChapter: any): any {
  return {
    id: dbChapter.id,
    title: dbChapter.title,
    content: dbChapter.content,
    chapterNumber: dbChapter.chapter_number,
  }
}

export async function getAllStories(): Promise<StoryWithChapters[]> {
  try {
    const results = await sql`
      SELECT 
        s.id as story_id,
        s.title as story_title,
        s.genre,
        s.characters,
        s.setting,
        s.theme,
        s.created_at as story_created_at,
        s.cover_color,
        s.language,
        c.id as chapter_id,
        c.title as chapter_title,
        c.content,
        c.chapter_number,
        c.created_at as chapter_created_at
      FROM public.stories s
      LEFT JOIN public.chapters c ON s.id = c.story_id
      ORDER BY s.created_at DESC, c.chapter_number ASC
    `

    // Group results by story
    const storiesMap = new Map<string, StoryWithChapters>()

    for (const row of results) {
      const storyId = row.story_id

      if (!storiesMap.has(storyId)) {
        // Create story entry
        const story = transformStoryForFrontend({
          id: row.story_id,
          title: row.story_title,
          genre: row.genre,
          characters: row.characters,
          setting: row.setting,
          theme: row.theme,
          created_at: row.story_created_at,
          cover_color: row.cover_color,
          language: row.language,
        })

        storiesMap.set(storyId, {
          ...story,
          chapters: [],
        })
      }

      // Add chapter if it exists
      if (row.chapter_id) {
        const chapter = transformChapterForFrontend({
          id: row.chapter_id,
          title: row.chapter_title,
          content: row.content,
          chapter_number: row.chapter_number,
          created_at: row.chapter_created_at,
        })

        storiesMap.get(storyId)!.chapters.push(chapter)
      }
    }

    return Array.from(storiesMap.values())
  } catch (error) {
    console.error("Database error in getAllStories:", error)
    throw error
  }
}

export async function getStoryById(id: string): Promise<StoryWithChapters | null> {
  try {
    const results = await sql`
      SELECT 
        s.id as story_id,
        s.title as story_title,
        s.genre,
        s.characters,
        s.setting,
        s.theme,
        s.created_at as story_created_at,
        s.cover_color,
        s.language,
        c.id as chapter_id,
        c.title as chapter_title,
        c.content,
        c.chapter_number,
        c.created_at as chapter_created_at
      FROM public.stories s
      LEFT JOIN public.chapters c ON s.id = c.story_id
      WHERE s.id = ${id}
      ORDER BY c.chapter_number ASC
    `

    if (results.length === 0) return null

    const firstRow = results[0]
    const story = transformStoryForFrontend({
      id: firstRow.story_id,
      title: firstRow.story_title,
      genre: firstRow.genre,
      characters: firstRow.characters,
      setting: firstRow.setting,
      theme: firstRow.theme,
      created_at: firstRow.story_created_at,
      cover_color: firstRow.cover_color,
      language: firstRow.language,
    })

    const chapters = results
      .filter((row) => row.chapter_id) // Only include rows with chapters
      .map((row) =>
        transformChapterForFrontend({
          id: row.chapter_id,
          title: row.chapter_title,
          content: row.content,
          chapter_number: row.chapter_number,
          created_at: row.chapter_created_at,
        }),
      )

    return {
      ...story,
      chapters,
    }
  } catch (error) {
    console.error("Database error in getStoryById:", error)
    throw error
  }
}

export async function createStory(story: Omit<Story, "created_at">): Promise<Story> {
  try {
    const result = await sql`
      INSERT INTO public.stories (id, title, genre, characters, setting, theme, cover_color, language)
      VALUES (${story.id}, ${story.title}, ${story.genre}, ${story.characters}, ${story.setting}, ${story.theme}, ${story.cover_color}, ${story.language})
      RETURNING *
    `

    return transformStoryForFrontend(result[0])
  } catch (error) {
    console.error("Database error in createStory:", error)
    throw error
  }
}

export async function createChapter(chapter: Omit<Chapter, "created_at">): Promise<Chapter> {
  try {
    const result = await sql`
      INSERT INTO public.chapters (id, story_id, title, content, chapter_number)
      VALUES (${chapter.id}, ${chapter.story_id}, ${chapter.title}, ${chapter.content}, ${chapter.chapter_number})
      RETURNING *
    `

    return transformChapterForFrontend(result[0])
  } catch (error) {
    console.error("Database error in createChapter:", error)
    throw error
  }
}

export async function updateStory(
  id: string,
  updates: Partial<Omit<Story, "id" | "created_at">>,
): Promise<Story | null> {
  try {
    const updateFields = Object.keys(updates)
    if (updateFields.length === 0) return null

    const setClause = updateFields
      .map((field, index) => {
        // Convert camelCase to snake_case for database fields
        const dbField = field === "coverColor" ? "cover_color" : field
        return `${dbField} = $${index + 1}`
      })
      .join(", ")

    const values = Object.values(updates)
    values.push(id)

    const result = await sql`
      UPDATE public.stories 
      SET ${sql.unsafe(setClause)}
      WHERE id = $${values.length}
      RETURNING *
    `.apply(null, values)

    return result.length > 0 ? transformStoryForFrontend(result[0]) : null
  } catch (error) {
    console.error("Database error in updateStory:", error)
    throw error
  }
}

export async function deleteStory(id: string): Promise<boolean> {
  try {
    await sql`
      DELETE FROM public.chapters 
      WHERE story_id = ${id}
    `

    const result = await sql`
      DELETE FROM public.stories 
      WHERE id = ${id}
    `

    return result.count > 0
  } catch (error) {
    console.error("Database error in deleteStory:", error)
    throw error
  }
}
