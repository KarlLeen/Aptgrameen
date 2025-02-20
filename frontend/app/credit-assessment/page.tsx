import { Layout } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Mic, Play, CircleStopIcon as Stop } from "lucide-react"

export default function CreditAssessmentPage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900">AI Credit Assessment Interview</h1>
        <p className="mt-2 text-gray-600">Answer the AI agent's questions to determine your creditworthiness.</p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Interview in Progress</CardTitle>
            <CardDescription>Speak clearly into your microphone</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-center">
                <Mic className="h-16 w-16 text-indigo-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium">Current Question:</p>
                <p className="text-gray-600">"Can you describe your current source of income?"</p>
              </div>
              <div className="flex justify-center space-x-4">
                <Button size="icon">
                  <Play className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline">
                  <Stop className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Real-time Credit Score</CardTitle>
            <CardDescription>Your score updates as you answer questions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <span className="text-4xl font-bold text-indigo-600">685</span>
              <Progress value={68} className="mt-2" />
              <p className="text-sm text-gray-500 mt-2">Good</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>AI Feedback</CardTitle>
            <CardDescription>Suggestions to improve your creditworthiness</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Consider diversifying your income sources</li>
              <li>Maintain a consistent savings habit</li>
              <li>Improve your financial literacy through our educational resources</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Complete Assessment</Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  )
}

