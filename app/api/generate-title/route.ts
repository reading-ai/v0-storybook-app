import { generateText } from "ai"
import { deepseek } from "@ai-sdk/deepseek"
import { LANGUAGE_CONFIGS } from "./language-configs" // Assuming language-configs is a separate file

// Function to generate a fallback title
function generateFallbackTitle(genre: string, characters: string, setting: string, language = "en"): string {
  const characterName = characters.split(" ")[0] || "Heroes"
  const settingWord = setting.split(" ")[0] || "Adventure"

  const titleTemplates = {
    en: [
      `The ${genre} of ${characterName}`,
      `${characterName} and the ${setting.split(" ").slice(-2).join(" ")}`,
      `Chronicles of ${settingWord}`,
      `The ${settingWord} ${genre}`,
      `${characterName}'s Quest`,
      `Legends of ${setting.split(" ").slice(0, 2).join(" ")}`,
      `The ${genre} Chronicles`,
      `${characterName} in ${settingWord}`,
    ],
    es: [
      `El ${genre} de ${characterName}`,
      `${characterName} y el ${setting.split(" ").slice(-2).join(" ")}`,
      `Crónicas de ${settingWord}`,
      `El ${genre} de ${settingWord}`,
      `La Búsqueda de ${characterName}`,
      `Leyendas de ${setting.split(" ").slice(0, 2).join(" ")}`,
      `Las Crónicas del ${genre}`,
      `${characterName} en ${settingWord}`,
    ],
    fr: [
      `Le ${genre} de ${characterName}`,
      `${characterName} et le ${setting.split(" ").slice(-2).join(" ")}`,
      `Chroniques de ${settingWord}`,
      `Le ${genre} de ${settingWord}`,
      `La Quête de ${characterName}`,
      `Légendes de ${setting.split(" ").slice(0, 2).join(" ")}`,
      `Les Chroniques du ${genre}`,
      `${characterName} dans ${settingWord}`,
    ],
    // Add more languages as needed...
  }

  const templates = titleTemplates[language as keyof typeof titleTemplates] || titleTemplates.en
  return templates[Math.floor(Math.random() * templates.length)]
}

export async function POST(req: Request) {
  try {
    const { genre, characters, setting, theme, language = "en" } = await req.json()

    // Validate required fields
    if (!genre || !characters || !setting) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get language configuration
    const languageConfig = LANGUAGE_CONFIGS[language as keyof typeof LANGUAGE_CONFIGS] || LANGUAGE_CONFIGS.en

    // Check if API key is available
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      console.log("DeepSeek API key not found, using fallback title")
      // Return a fallback title when no API key is available
      const fallbackTitle = generateFallbackTitle(genre, characters, setting, language)
      return Response.json({ title: fallbackTitle, isAIGenerated: false })
    }

    try {
      console.log(`Attempting to generate title with DeepSeek in ${languageConfig.name}...`)

      const { text } = await generateText({
        model: deepseek("deepseek-chat"),
        prompt: `${languageConfig.instruction}

Generate a creative and engaging book title for a ${genre} story featuring ${characters} set in ${setting}. ${theme ? `The theme involves ${theme}.` : ""} 

The title should be:
- Creative and memorable
- Appropriate for the ${genre} genre
- Written in ${languageConfig.name}
- Between 2-8 words long

Return only the title, nothing else.`,
        maxTokens: 50,
      })

      console.log("Successfully generated title:", text.trim())
      return Response.json({ title: text.trim(), isAIGenerated: true, language: languageConfig.name })
    } catch (aiError) {
      console.error("DeepSeek API error:", aiError)

      // Return a creative fallback title when AI generation fails
      const fallbackTitle = generateFallbackTitle(genre, characters, setting, language)
      return Response.json({
        title: fallbackTitle,
        isAIGenerated: false,
        message: "AI generation failed, using creative fallback",
      })
    }
  } catch (error) {
    console.error("Error in generate-title route:", error)

    // Return a basic fallback title if everything fails
    const fallbackTitle = language === "en" ? "An Untitled Adventure" : "Una Aventura Sin Título"
    return Response.json({
      title: fallbackTitle,
      isAIGenerated: false,
      error: "Title generation failed",
    })
  }
}
