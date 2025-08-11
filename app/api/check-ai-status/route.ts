export async function GET() {
  const hasApiKey = !!process.env.DEEPSEEK_API_KEY

  return Response.json({
    aiAvailable: hasApiKey,
    message: hasApiKey
      ? "DeepSeek AI features are available via official provider"
      : "Add DEEPSEEK_API_KEY environment variable to enable AI features",
    provider: "DeepSeek (@ai-sdk/deepseek)",
    model: "deepseek-chat",
    version: "official-provider",
  })
}
