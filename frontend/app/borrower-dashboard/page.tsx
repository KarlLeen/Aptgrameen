import { Layout } from "@/components/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Check, AlertTriangle, Clock } from "lucide-react"

export default function BorrowerDashboardPage() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900">Borrower Dashboard</h1>
        <p className="mt-2 text-gray-600">Track your loan status and manage your account</p>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Loan Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">Active</div>
              <p className="text-sm text-gray-500 mt-2">Next payment due in 7 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Repayment Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">65%</div>
              <Progress value={65} className="mt-2" />
              <p className="text-sm text-gray-500 mt-2">$3,250 remaining</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Credit Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">720</div>
              <p className="text-sm text-gray-500 mt-2">Improved by 15 points</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Repayment Schedule</CardTitle>
            <CardDescription>Upcoming payments for your current loan</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>July 1, 2023</TableCell>
                  <TableCell>$250</TableCell>
                  <TableCell className="text-green-600">Paid</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>August 1, 2023</TableCell>
                  <TableCell>$250</TableCell>
                  <TableCell className="text-amber-600">Upcoming</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>September 1, 2023</TableCell>
                  <TableCell>$250</TableCell>
                  <TableCell className="text-gray-400">Pending</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Group Repayment Status</CardTitle>
            <CardDescription>Track your team's repayment progress</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Last Payment</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="flex items-center space-x-2">
                    <Avatar>
                      <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Alice" />
                      <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                    <span>Alice</span>
                  </TableCell>
                  <TableCell>July 1, 2023</TableCell>
                  <TableCell>$250</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-green-600">Paid</span>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="flex items-center space-x-2">
                    <Avatar>
                      <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Bob" />
                      <AvatarFallback>B</AvatarFallback>
                    </Avatar>
                    <span>Bob</span>
                  </TableCell>
                  <TableCell>July 1, 2023</TableCell>
                  <TableCell>$250</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <AlertTriangle className="w-4 h-4 text-red-500 mr-1" />
                      <span className="text-red-600">Late</span>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="flex items-center space-x-2">
                    <Avatar>
                      <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Charlie" />
                      <AvatarFallback>C</AvatarFallback>
                    </Avatar>
                    <span>Charlie</span>
                  </TableCell>
                  <TableCell>August 1, 2023</TableCell>
                  <TableCell>$250</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 text-amber-500 mr-1" />
                      <span className="text-amber-600">Upcoming</span>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Group Discussion</CardTitle>
            <CardDescription>Communicate with your group members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="font-medium">Alice:</p>
                <p>
                  Hey everyone, just a reminder that our next payment is due soon. Let's make sure we're all prepared.
                </p>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="font-medium">Bob:</p>
                <p>Thanks for the reminder, Alice! I've set aside my portion already.</p>
              </div>
              <Textarea placeholder="Type your message here..." />
              <Button>Send Message</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Credit Growth Tips</CardTitle>
            <CardDescription>Improve your credit score with these suggestions</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              <li>Make all loan payments on time</li>
              <li>Participate actively in group discussions</li>
              <li>Complete financial literacy courses offered by APL</li>
              <li>Refer new reliable members to join the platform</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

