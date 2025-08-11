import { streamText } from "ai"
import { deepseek } from "@ai-sdk/deepseek"

// Language configuration for AI prompts
const LANGUAGE_CONFIGS = {
  en: { name: "English", instruction: "Write in clear, engaging English." },
  es: { name: "Spanish", instruction: "Escribe en español claro y atractivo." },
  fr: { name: "French", instruction: "Écrivez en français clair et engageant." },
  de: { name: "German", instruction: "Schreiben Sie in klarem, ansprechendem Deutsch." },
  it: { name: "Italian", instruction: "Scrivi in italiano chiaro e coinvolgente." },
  pt: { name: "Portuguese", instruction: "Escreva em português claro e envolvente." },
  ru: { name: "Russian", instruction: "Пишите на ясном, увлекательном русском языке." },
  ja: { name: "Japanese", instruction: "明確で魅力的な日本語で書いてください。" },
  ko: { name: "Korean", instruction: "명확하고 매력적인 한국어로 작성하세요." },
  zh: { name: "Chinese", instruction: "用清晰、引人入胜的中文写作。" },
  ar: { name: "Arabic", instruction: "اكتب باللغة العربية الواضحة والجذابة." },
  hi: { name: "Hindi", instruction: "स्पष्ट, आकर्षक हिंदी में लिखें।" },
  nl: { name: "Dutch", instruction: "Schrijf in helder, boeiend Nederlands." },
  sv: { name: "Swedish", instruction: "Skriv på klar, engagerande svenska." },
  no: { name: "Norwegian", instruction: "Skriv på klar, engasjerende norsk." },
  da: { name: "Danish", instruction: "Skriv på klart, engagerende dansk." },
  fi: { name: "Finnish", instruction: "Kirjoita selkeää, mukaansatempaavaa suomea." },
  pl: { name: "Polish", instruction: "Pisz w jasnym, angażującym języku polskim." },
  tr: { name: "Turkish", instruction: "Açık, ilgi çekici Türkçe yazın." },
  th: { name: "Thai", instruction: "เขียนเป็นภาษาไทยที่ชัดเจนและน่าสนใจ" },
}

export async function POST(req: Request) {
  try {
    const { prompt, genre, characters, setting, chapterNumber, previousChapters, language = "en" } = await req.json()

    // Validate required fields
    if (!prompt || !genre || !characters || !setting) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get language configuration
    const languageConfig = LANGUAGE_CONFIGS[language as keyof typeof LANGUAGE_CONFIGS] || LANGUAGE_CONFIGS.en

    // Check if API key is available
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      console.log("DeepSeek API key not found, returning template chapter")
      // Return a template chapter when no API key is available
      const templateChapter = generateTemplateChapter(chapterNumber, characters, setting, genre, prompt, language)

      return Response.json({
        content: templateChapter,
        isAIGenerated: false,
        message: "Template chapter created. Add DeepSeek API key for AI generation.",
      })
    }

    try {
      console.log(`Attempting to generate chapter ${chapterNumber} with DeepSeek in ${languageConfig.name}...`)

      const systemPrompt = `You are a creative storyteller. Generate engaging, age-appropriate stories based on the user's preferences.

IMPORTANT: ${languageConfig.instruction}

Story Details:
- Genre: ${genre}
- Main Characters: ${characters}
- Setting: ${setting}
- Chapter Number: ${chapterNumber}
- Language: ${languageConfig.name}

${previousChapters ? `Previous chapters summary: ${previousChapters}` : ""}

Write a compelling chapter that:
1. Is approximately 300-500 words
2. Advances the plot meaningfully
3. Maintains consistency with previous chapters
4. Includes dialogue and descriptive scenes
5. Ends with a hook for the next chapter (unless it's the final chapter)
6. Uses markdown formatting for better readability (headings, emphasis, etc.)
7. Is written entirely in ${languageConfig.name}

Format the response as a complete chapter with proper paragraphs and markdown formatting. Ensure all text, including dialogue, narration, and descriptions, is in ${languageConfig.name}.`

      // Use streaming with SSE
      console.log("Starting SSE streaming generation...")
      const result = streamText({
        model: deepseek("deepseek-chat"),
        system: systemPrompt,
        prompt: prompt,
        maxTokens: 800,
        temperature: 0.7,
      })

      // Create SSE response
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send initial connection event
            controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "connected" })}\n\n`))

            // Send generation start event
            controller.enqueue(
              encoder.encode(
                `event: start\ndata: ${JSON.stringify({
                  chapterNumber,
                  genre,
                  characters,
                  language: languageConfig.name,
                  timestamp: new Date().toISOString(),
                })}\n\n`,
              ),
            )

            let fullContent = ""
            let wordCount = 0

            // Stream the text content
            for await (const textPart of result.textStream) {
              fullContent += textPart
              const words = fullContent
                .trim()
                .split(/\s+/)
                .filter((word) => word.length > 0)
              wordCount = words.length

              // Send text chunk event
              controller.enqueue(
                encoder.encode(
                  `event: text\ndata: ${JSON.stringify({
                    delta: textPart,
                    fullContent,
                    wordCount,
                    language: languageConfig.name,
                  })}\n\n`,
                ),
              )

              // Add small delay for better UX (optional)
              await new Promise((resolve) => setTimeout(resolve, 50))
            }

            // Send completion event
            controller.enqueue(
              encoder.encode(
                `event: complete\ndata: ${JSON.stringify({
                  fullContent,
                  wordCount,
                  isAIGenerated: true,
                  language: languageConfig.name,
                  timestamp: new Date().toISOString(),
                })}\n\n`,
              ),
            )

            controller.close()
          } catch (error) {
            console.error("Streaming error:", error)

            // Send error event
            controller.enqueue(
              encoder.encode(
                `event: error\ndata: ${JSON.stringify({
                  error: error instanceof Error ? error.message : "Unknown streaming error",
                  fallback: generateTemplateChapter(chapterNumber, characters, setting, genre, prompt, language),
                })}\n\n`,
              ),
            )

            controller.close()
          }
        },
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Cache-Control",
        },
      })
    } catch (aiError) {
      console.error("DeepSeek API error:", aiError)

      // Return a template chapter when AI generation fails
      const templateChapter = generateTemplateChapter(chapterNumber, characters, setting, genre, prompt, language)

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
  language = "en",
): string {
  const isFirstChapter = chapterNumber === 1

  // Template content in different languages
  const templates = {
    en: {
      beginning: `# Chapter ${chapterNumber}: The Beginning

**${characters}** stood at the threshold of *${setting}*, their hearts racing with anticipation. This was the moment that would change everything - the beginning of their extraordinary ${genre.toLowerCase()} adventure.

## The Journey Begins

The air around them seemed charged with possibility. Every shadow held mystery, every sound carried the promise of discovery. They had heard stories about this place, whispered tales that spoke of wonders and dangers in equal measure.

> "Are you ready for this?" one of them asked, their voice barely audible above the ambient sounds of ${setting}.

The others exchanged glances, each seeing their own mixture of excitement and apprehension reflected in their companions' eyes. They had come too far to turn back now.

**"We've prepared for this moment our entire lives,"** came the determined reply. **"Whatever lies ahead, we'll face it together."**

As they took their first steps forward, the very air seemed to shimmer with magic and possibility. Their ${genre.toLowerCase()} journey was about to begin, and none of them could imagine where it would lead.`,
      continuation: `# Chapter ${chapterNumber}: The Adventure Continues

The journey of **${characters}** through *${setting}* had taken unexpected turns, each more thrilling than the last. What had begun as a simple quest had evolved into something much more complex and meaningful.

## New Developments

${prompt ? `Following their current path - *${prompt.toLowerCase()}* - they found themselves` : "They found themselves"} facing challenges that tested not only their skills but their very understanding of the world around them.

The ${genre.toLowerCase()} elements of their story continued to unfold in surprising ways. Ancient mysteries revealed themselves slowly, relationships deepened through shared trials, and the true scope of their adventure became clearer with each passing day.

> "Look how far we've come," one of them said, pausing to gaze back at the path they had traveled.

> "And yet," another replied thoughtfully, "I have the feeling our greatest challenges still lie ahead."

The wind carried whispers of distant places and untold stories, reminding them that their adventure was far from over. Each step forward brought new revelations, new allies, and new mysteries to unravel.`,
    },
    es: {
      beginning: `# Capítulo ${chapterNumber}: El Comienzo

**${characters}** se encontraba en el umbral de *${setting}*, con el corazón acelerado por la expectación. Este era el momento que lo cambiaría todo: el comienzo de su extraordinaria aventura de ${genre.toLowerCase()}.

## El Viaje Comienza

El aire a su alrededor parecía cargado de posibilidades. Cada sombra guardaba misterio, cada sonido llevaba la promesa del descubrimiento. Habían escuchado historias sobre este lugar, relatos susurrados que hablaban de maravillas y peligros a partes iguales.

> "¿Estás listo para esto?" preguntó uno de ellos, su voz apenas audible por encima de los sonidos ambientales de ${setting}.

Los otros intercambiaron miradas, cada uno viendo su propia mezcla de emoción y aprensión reflejada en los ojos de sus compañeros. Habían llegado demasiado lejos para retroceder ahora.

**"Nos hemos preparado para este momento toda la vida,"** llegó la respuesta decidida. **"Pase lo que pase, lo enfrentaremos juntos."**

Mientras daban sus primeros pasos hacia adelante, el aire mismo parecía brillar con magia y posibilidad. Su viaje de ${genre.toLowerCase()} estaba a punto de comenzar, y ninguno de ellos podía imaginar a dónde los llevaría.`,
      continuation: `# Capítulo ${chapterNumber}: La Aventura Continúa

El viaje de **${characters}** a través de *${setting}* había tomado giros inesperados, cada uno más emocionante que el anterior. Lo que había comenzado como una búsqueda simple había evolucionado hacia algo mucho más complejo y significativo.

## Nuevos Desarrollos

${prompt ? `Siguiendo su camino actual - *${prompt.toLowerCase()}* - se encontraron` : "Se encontraron"} enfrentando desafíos que ponían a prueba no solo sus habilidades, sino su comprensión misma del mundo que los rodeaba.

Los elementos de ${genre.toLowerCase()} de su historia continuaban desarrollándose de maneras sorprendentes. Los misterios antiguos se revelaban lentamente, las relaciones se profundizaban a través de las pruebas compartidas, y el verdadero alcance de su aventura se volvía más claro con cada día que pasaba.

> "Mira qué tan lejos hemos llegado," dijo uno de ellos, deteniéndose para contemplar el camino que habían recorrido.

> "Y sin embargo," respondió otro pensativamente, "tengo la sensación de que nuestros mayores desafíos aún están por delante."

El viento llevaba susurros de lugares distantes e historias no contadas, recordándoles que su aventura estaba lejos de terminar. Cada paso hacia adelante traía nuevas revelaciones, nuevos aliados y nuevos misterios por desentrañar.`,
    },
    // Add more languages as needed...
  }

  const languageTemplates = templates[language as keyof typeof templates] || templates.en
  const baseTemplate = isFirstChapter ? languageTemplates.beginning : languageTemplates.continuation

  return `${baseTemplate}

${prompt ? `\n### Story Direction\n*${prompt}*` : ""}

---

*This is a template chapter. Edit this content to match your vision, or enable DeepSeek AI in settings for automated generation.*`
}
