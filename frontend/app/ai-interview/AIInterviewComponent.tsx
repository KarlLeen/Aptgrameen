"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { AIClient } from "@/lib/ai-client"
import { useContract } from "@/context/contract-context"

interface TeamMember {
  name: string
  role: string
  skills: string
}

interface FormData {
  fullName: string
  email: string
  phoneNumber: string
  loanPurpose: string
  loanAmount: string
  role: string
  skills: string
  teamMembers: TeamMember[]
}

interface InterviewScore {
  groupSolidarity: number
  businessViability: number
  character: number
  loanUse: number
  riskLevel: number
}

export default function AIInterviewComponent({ formData }: { formData: string }) {
  const router = useRouter()
  const { contractClient } = useContract()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState("")
  const [currentResponse, setCurrentResponse] = useState("")
  const [interviewStarted, setInterviewStarted] = useState(false)
  const [interviewCompleted, setInterviewCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedFormData, setParsedFormData] = useState<FormData | null>(null)
  const [loading, setLoading] = useState(false)
  const [responses, setResponses] = useState<string[]>([])
  const [scores, setScores] = useState<InterviewScore[]>([])
  const [finalReport, setFinalReport] = useState<any>(null)
  const [progress, setProgress] = useState(0)

  const aiClient = new AIClient(process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || '');

  useEffect(() => {
    if (!formData) {
      setError("No form data provided");
      return;
    }

    try {
      const decoded = decodeURIComponent(formData);
      const parsed = JSON.parse(decoded);

      // 验证必要的字段
      const requiredFields = ['fullName', 'role', 'loanPurpose', 'loanAmount', 'skills', 'teamMembers'];
      const missingFields = requiredFields.filter(field => !parsed[field]);

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      if (!Array.isArray(parsed.teamMembers)) {
        throw new Error('Team members must be an array');
      }

      setParsedFormData(parsed);
      setError(null);
    } catch (e) {
      console.error("Error parsing form data:", e);
      setError(`Invalid form data: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }, [formData])

  const requestCameraPermission = async () => {
    try {
      // 首先检查浏览器是否支持getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera access');
      }

      // 检查是否已经有权限
      const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
      
      if (permissions.state === 'denied') {
        throw new Error('Camera access is blocked. Please enable it in your browser settings.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setError(null);
    } catch (err) {
      console.error('Error accessing the camera:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera access was denied. Please allow camera access and try again.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera device was found. Please connect a camera and try again.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Your camera is in use by another application. Please close other apps using the camera.');
      } else {
        setError(`Unable to access the camera: ${err.message}`);
      }
      setIsCameraOn(false);
    }
  };

  useEffect(() => {
    if (isCameraOn) {
      requestCameraPermission();
    } else if (videoRef.current?.srcObject) {
      // 关闭摄像头时停止所有轨道
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, [isCameraOn])

  useEffect(() => {
    if (interviewCompleted && finalReport) {
      const submitResults = async () => {
        try {
          // Submit interview results to the blockchain
          await contractClient.submitInterviewResult(
            finalReport.finalScore,
            JSON.stringify(finalReport)
          );
          const timer = setTimeout(() => {
            router.push("/borrower-dashboard")
          }, 3000)
          return () => clearTimeout(timer)
        } catch (e) {
          console.error("Error submitting interview results:", e)
          setError("Failed to submit interview results to the blockchain")
        }
      };
      submitResults();
    }
  }, [interviewCompleted, finalReport, router, contractClient])

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn)
  }

  const startInterview = async () => {
    if (!parsedFormData) {
      setError("No form data available. Please try again.");
      return;
    }

    if (!process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY) {
      setError("API key not configured. Please contact support.");
      return;
    }

    try {
      // 在设置状态之前先验证API调用
      const result = await aiClient.conductInterview(
        parsedFormData,
        "Let's begin the interview. Please introduce yourself and your team.",
        []
      );

      if (!result || !result.nextQuestion || !result.scores) {
        throw new Error("Invalid response from AI service");
      }

      // API调用成功后再设置状态
      setError(null);
      setInterviewStarted(true);
      setCurrentQuestion(result.nextQuestion);
      setProgress(0);
    } catch (e) {
      console.error("Error starting interview:", e);
      if (e.response?.status === 401) {
        setError("Invalid API key. Please contact support.");
      } else if (e.response?.status === 429) {
        setError("Too many requests. Please try again later.");
      } else {
        setError(`Failed to start the interview: ${e.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  const submitResponse = async () => {
    if (!parsedFormData) {
      setError("No form data available. Please try again.");
      return;
    }

    if (!currentResponse.trim()) {
      setError("Please provide a response before continuing.");
      return;
    }

    if (!process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY) {
      setError("API key not configured. Please contact support.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Add current Q&A to responses
      const newResponses = [...responses, `Q: ${currentQuestion}\nA: ${currentResponse}`];
      setResponses(newResponses);

      // Get AI analysis and next question
      const result = await aiClient.conductInterview(
        parsedFormData,
        currentQuestion,
        newResponses
      );

      if (!result || !result.scores || !result.nextQuestion) {
        throw new Error("Invalid response from AI service");
      }

      // Update scores
      const newScores = [...scores, result.scores];
      setScores(newScores);

      // Check if we should end the interview
      if (newScores.length >= 5) {
        const report = await aiClient.generateFinalReport(
          parsedFormData,
          newResponses,
          newScores
        );

        if (!report || !report.recommendation) {
          throw new Error("Invalid final report from AI service");
        }

        setFinalReport(report);
        setInterviewCompleted(true);
        setCurrentQuestion(`Thank you for your time. ${report.recommendation}`);
      } else {
        setCurrentQuestion(result.nextQuestion);
        setProgress((newScores.length / 5) * 100);
      }

      setCurrentResponse("");
    } catch (e) {
      console.error("Error processing response:", e);
      setError(`Failed to process your response: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Video Interview</CardTitle>
          <CardDescription>Ensure you're in a well-lit, quiet environment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden relative">
            {isCameraOn ? (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover" 
                />
                {loading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-gray-500">Camera is off</p>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-col items-center">
            <Button 
              onClick={toggleCamera} 
              className="mb-2"
              variant={isCameraOn ? "destructive" : "default"}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2"></div>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center space-x-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={isCameraOn 
                        ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"}
                    />
                  </svg>
                  <span>{isCameraOn ? "Turn Camera Off" : "Turn Camera On"}</span>
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>AI Interviewer</CardTitle>
          <CardDescription>The AI will conduct a thorough interview based on your application</CardDescription>
          {interviewStarted && !interviewCompleted && (
            <Progress value={progress} className="mt-2" />
          )}
        </CardHeader>
        <CardContent>
          {!interviewStarted ? (
            <Button onClick={startInterview} disabled={!isCameraOn || loading}>
              {loading ? "Starting Interview..." : "Start Interview"}
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="font-medium">Question:</p>
                <p className="mt-2 text-lg">{currentQuestion}</p>
              </div>
              
              {!interviewCompleted && (
                <div>
                  <p className="font-medium">Your Response:</p>
                  <Textarea
                    value={currentResponse}
                    onChange={(e) => setCurrentResponse(e.target.value)}
                    placeholder="Type your response here..."
                    className="mt-2"
                    rows={4}
                  />
                </div>
              )}

              {interviewCompleted && finalReport && (
                <div className="mt-4">
                  <p className="font-medium">Final Assessment:</p>
                  <p className="mt-2">Score: {finalReport.finalScore}/100</p>
                  <p className="mt-2">{finalReport.riskAssessment}</p>
                  <p className="mt-4 text-green-600">Redirecting to Borrower Dashboard...</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
        {interviewStarted && !interviewCompleted && (
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setInterviewStarted(false)} 
              disabled={loading}
            >
              End Interview
            </Button>
            <Button 
              onClick={submitResponse} 
              disabled={!currentResponse.trim() || loading}
            >
              {loading ? "Processing..." : "Submit Response"}
            </Button>
          </CardFooter>
        )}
      </Card>
    </>
  )
}

