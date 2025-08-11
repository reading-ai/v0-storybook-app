"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Key, Sparkles, ExternalLink, CheckCircle, XCircle, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function SettingsPage() {
  const [aiStatus, setAiStatus] = useState<{ aiAvailable: boolean; message: string; provider?: string } | null>(null)

  useEffect(() => {
    checkAIStatus()
  }, [])

  const checkAIStatus = async () => {
    try {
      const response = await fetch("/api/check-ai-status")
      const data = await response.json()
      setAiStatus(data)
    } catch (error) {
      console.error("Error checking AI status:", error)
      setAiStatus({ aiAvailable: false, message: "Unable to check AI status" })
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
              <Key className="h-5 w-5 text-purple-600" />
              <span className="font-semibold text-gray-900">Settings</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            App Settings
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">Configure your AI features and app preferences</p>
        </div>

        <div className="space-y-6">
          {/* AI Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                AI Features Status
                <Badge variant="outline" className="ml-2">
                  <Zap className="h-3 w-3 mr-1" />
                  DeepSeek Provider
                </Badge>
              </CardTitle>
              <CardDescription>
                Check if AI story generation is available with the official DeepSeek provider
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aiStatus ? (
                <div className="flex items-center gap-3">
                  {aiStatus.aiAvailable ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600" />
                  )}
                  <div>
                    <p className={`font-medium ${aiStatus.aiAvailable ? "text-green-700" : "text-red-700"}`}>
                      {aiStatus.aiAvailable ? "DeepSeek AI Features Enabled" : "AI Features Disabled"}
                    </p>
                    <p className="text-sm text-gray-600">{aiStatus.message}</p>
                    {aiStatus.provider && (
                      <p className="text-xs text-gray-500 mt-1">Using: {aiStatus.provider} via @ai-sdk/deepseek</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">Checking AI status...</p>
              )}

              <Button onClick={checkAIStatus} variant="outline" size="sm" className="mt-4 bg-transparent">
                Refresh Status
              </Button>
            </CardContent>
          </Card>

          {/* Setup Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Enable AI Features with DeepSeek</CardTitle>
              <CardDescription>
                Follow these steps to enable AI-powered story generation using the official DeepSeek provider
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  This app uses the official <code>@ai-sdk/deepseek</code> provider for optimal performance and
                  reliability. AI features are optional - you can create and manage stories manually without an API key.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="border-l-4 border-purple-200 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Step 1: Get a DeepSeek API Key</h3>
                  <p className="text-gray-600 mb-2">
                    Visit DeepSeek's platform to create an account and get your API key. DeepSeek offers excellent
                    performance at competitive rates with fast inference speeds.
                  </p>
                  <Link href="https://platform.deepseek.com/api_keys" target="_blank">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Get DeepSeek API Key
                    </Button>
                  </Link>
                </div>

                <div className="border-l-4 border-purple-200 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Step 2: Add Environment Variable</h3>
                  <p className="text-gray-600 mb-2">
                    Add your API key as an environment variable named{" "}
                    <code className="bg-gray-100 px-2 py-1 rounded">DEEPSEEK_API_KEY</code>
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm">DEEPSEEK_API_KEY=your_api_key_here</div>
                </div>

                <div className="border-l-4 border-purple-200 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Step 3: Restart the Application</h3>
                  <p className="text-gray-600">
                    After adding the environment variable, restart the application to enable AI features powered by the
                    official DeepSeek provider.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Why DeepSeek with Official Provider?
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Native integration with Vercel AI SDK for optimal performance</li>
                  <li>• Competitive pricing and fast inference speeds</li>
                  <li>• High-quality text generation capabilities</li>
                  <li>• Built-in streaming support for real-time story generation</li>
                  <li>• Automatic error handling and retry mechanisms</li>
                  <li>• Full TypeScript support and type safety</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* App Features */}
          <Card>
            <CardHeader>
              <CardTitle>Available Features</CardTitle>
              <CardDescription>What you can do with and without AI</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-semibold text-green-700">✅ Always Available</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Create story projects</li>
                    <li>• Write chapters manually</li>
                    <li>• Beautiful book viewer</li>
                    <li>• Story organization</li>
                    <li>• Rich template chapters</li>
                    <li>• Export and sharing</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-purple-700 flex items-center gap-1">
                    🤖 With DeepSeek AI
                    <Badge variant="secondary" className="text-xs">
                      Official Provider
                    </Badge>
                  </h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• AI-generated creative titles</li>
                    <li>• Streaming chapter generation</li>
                    <li>• Contextual story continuation</li>
                    <li>• Creative writing prompts</li>
                    <li>• Character and plot development</li>
                    <li>• Genre-specific storytelling</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
