import { streamText, generateText } from "ai"
import { deepseek } from "@ai-sdk/deepseek"

export async function POST(req: Request) {
  try {
    const { prompt, genre, characters, setting, chapterNumber, previousChapters } = await req.json()

    // Validate required fields
    if (!prompt || !genre || !characters || !setting) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if API key is available
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      console.log("DeepSeek API key not found, returning template chapter")
      // Return a template chapter when no API key is available
      const templateChapter = generateTemplateChapter(chapterNumber, characters, setting, genre, prompt)

      return Response.json({
        content: templateChapter,
        isAIGenerated: false,
        message: "Template chapter created. Add DeepSeek API key for AI generation.",
      })
    }

    try {
      console.log(`Attempting to generate chapter ${chapterNumber} with DeepSeek...`)

      const systemPrompt = `You are a creative storyteller. Generate engaging, age-appropriate stories based on the user's preferences.

Story Details:
- Genre: ${genre}
- Main Characters: ${characters}
- Setting: ${setting}
- Chapter Number: ${chapterNumber}

${previousChapters ? `Previous chapters summary: ${previousChapters}` : ""}

Write a compelling chapter that:
1. Is approximately 300-500 words
2. Advances the plot meaningfully
3. Maintains consistency with previous chapters
4. Includes dialogue and descriptive scenes
5. Ends with a hook for the next chapter (unless it's the final chapter)

Format the response as a complete chapter with proper paragraphs.`

      // Try streaming first, fallback to regular generation if streaming fails
      try {
        console.log("Attempting streaming generation...")
        const result = streamText({
          model: deepseek("deepseek-chat"),
          system: systemPrompt,
          prompt: prompt,
          maxTokens: 800,
          temperature: 0.7,
        })

        // Check if toDataStreamResponse method exists
        if (typeof result.toDataStreamResponse === "function") {
          console.log("Streaming response available, using streaming...")
          return result.toDataStreamResponse()
        } else {
          console.log("Streaming response method not available, falling back to regular generation...")
          throw new Error("Streaming not supported")
        }
      } catch (streamError) {
        console.log("Streaming failed, falling back to regular text generation:", streamError)

        // Fallback to regular text generation
        const { text } = await generateText({
          model: deepseek("deepseek-chat"),
          system: systemPrompt,
          prompt: prompt,
          maxTokens: 800,
          temperature: 0.7,
        })

        console.log("Successfully generated chapter with regular generation")
        return Response.json({
          content: text,
          isAIGenerated: true,
          message: "Chapter generated successfully (non-streaming)",
        })
      }
    } catch (aiError) {
      console.error("DeepSeek API error:", aiError)

      // Return a template chapter when AI generation fails
      const templateChapter = generateTemplateChapter(chapterNumber, characters, setting, genre, prompt)

      return Response.json({
        content: templateChapter,
        isAIGenerated: false,
        message: "AI generation failed. Template chapter provided.",
        error: aiError instanceof Error ? aiError.message : "Unknown AI error",
      })
    }
  } catch (error) {
    console.error("Error in generate-story route:", error)
    return Response.json({ error: "Failed to generate story content" }, { status: 500 })
  }
}

function generateTemplateChapter(
  chapterNumber: number,
  characters: string,
  setting: string,
  genre: string,
  prompt?: string,
): string {
  const isFirstChapter = chapterNumber === 1

  if (isFirstChapter) {
    return `Chapter ${chapterNumber}: The Beginning

${characters} stood at the threshold of ${setting}, their hearts racing with anticipation. This was the moment that would change everything - the beginning of their extraordinary ${genre.toLowerCase()} adventure.

The air around them seemed charged with possibility. Every shadow held mystery, every sound carried the promise of discovery. They had heard stories about this place, whispered tales that spoke of wonders and dangers in equal measure.

"Are you ready for this?" one of them asked, their voice barely audible above the ambient sounds of ${setting}.

The others exchanged glances, each seeing their own mixture of excitement and apprehension reflected in their companions' eyes. They had come too far to turn back now.

"We've prepared for this moment our entire lives," came the determined reply. "Whatever lies ahead, we'll face it together."

As they took their first steps forward, the very air seemed to shimmer with magic and possibility. Their ${genre.toLowerCase()} journey was about to begin, and none of them could imagine where it would lead.

The first chapter of their legend was being written with each footstep into the unknown.

${prompt ? `\n[Story direction: ${prompt}]` : ""}

[This is a template chapter. Edit this content to match your vision, or enable DeepSeek AI in settings for automated generation.]`
  } else {
    return `Chapter ${chapterNumber}: The Adventure Continues

The journey of ${characters} through ${setting} had taken unexpected turns, each more thrilling than the last. What had begun as a simple quest had evolved into something far more complex and meaningful.

${prompt ? `Following their current path - ${prompt.toLowerCase()} - they found themselves` : "They found themselves"} facing challenges that tested not only their skills but their very understanding of the world around them.

The ${genre.toLowerCase()} elements of their story continued to unfold in surprising ways. Ancient mysteries revealed themselves slowly, relationships deepened through shared trials, and the true scope of their adventure became clearer with each passing day.

"Look how far we've come," one of them said, pausing to gaze back at the path they had traveled.

"And yet," another replied thoughtfully, "I have the feeling our greatest challenges still lie ahead."

The wind carried whispers of distant places and untold stories, reminding them that their adventure was far from over. Each step forward brought new revelations, new allies, and new mysteries to unravel.

As they prepared for whatever came next, they knew that their bond had grown stronger and their purpose clearer. The next chapter of their story awaited.

${prompt ? `\n[Story direction: ${prompt}]` : ""}

[This is a template chapter. Edit this content to match your vision, or enable DeepSeek AI in settings for automated generation.]`
  }
}
