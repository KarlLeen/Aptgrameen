import { Layout } from "@/components/layout"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Spinner } from "@/components/ui/spinner"

const AIInterviewComponent = dynamic(() => import("./AIInterviewComponent"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-64">
      <Spinner />
    </div>
  ),
})

export default function AIInterviewPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900">AI Interview</h1>
        <p className="mt-2 text-gray-600">Please answer the AI's questions to complete your loan application.</p>
        <Suspense
          fallback={
            <div className="flex justify-center items-center h-64">
              <Spinner />
            </div>
          }
        >
          <AIInterviewComponent formData={(searchParams.formData as string) || ""} />
        </Suspense>
      </div>
    </Layout>
  )
}

