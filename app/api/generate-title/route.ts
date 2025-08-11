import { generateText } from "ai"
import { deepseek } from "@ai-sdk/deepseek"

export async function POST(req: Request) {
  try {
    const { genre, characters, setting, theme } = await req.json()

    // Validate required fields
    if (!genre || !characters || !setting) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if API key is available
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      console.log("DeepSeek API key not found, using fallback title")
      // Return a fallback title when no API key is available
      const fallbackTitle = generateFallbackTitle(genre, characters, setting)
      return Response.json({ title: fallbackTitle, isAIGenerated: false })
    }

    try {
      console.log("Attempting to generate title with DeepSeek...")

      const { text } = await generateText({
        model: deepseek("deepseek-chat"),
        prompt: `Generate a creative and engaging book title for a ${genre} story featuring ${characters} set in ${setting}. ${theme ? `The theme involves ${theme}.` : ""} Return only the title, nothing else.`,
        maxTokens: 50,
      })

      console.log("Successfully generated title:", text.trim())
      return Response.json({ title: text.trim(), isAIGenerated: true })
    } catch (aiError) {
      console.error("DeepSeek API error:", aiError)

      // Return a creative fallback title when AI generation fails
      const fallbackTitle = generateFallbackTitle(genre, characters, setting)
      return Response.json({
        title: fallbackTitle,
        isAIGenerated: false,
        message: "AI generation failed, using creative fallback",
      })
    }
  } catch (error) {
    console.error("Error in generate-title route:", error)

    // Return a basic fallback title if everything fails
    const fallbackTitle = "An Untitled Adventure"
    return Response.json({
      title: fallbackTitle,
      isAIGenerated: false,
      error: "Title generation failed",
    })
  }
}

function generateFallbackTitle(genre: string, characters: string, setting: string): string {
  const titleTemplates = [
    `The ${genre} of ${characters.split(" ")[0] || "Heroes"}`,
    `${characters.split(" ")[0] || "Heroes"} and the ${setting.split(" ").slice(-2).join(" ")}`,
    `Chronicles of ${setting.split(" ")[0] || "Adventure"}`,
    `The ${setting.split(" ")[0] || "Mysterious"} ${genre}`,
    `${characters.split(" ")[0] || "Heroes"}'s Quest`,
    `Legends of ${setting.split(" ").slice(0, 2).join(" ")}`,
    `The ${genre} Chronicles`,
    `${characters.split(" ")[0] || "Heroes"} in ${setting.split(" ")[0] || "Wonderland"}`,
  ]

  return titleTemplates[Math.floor(Math.random() * titleTemplates.length)]
}
