"use client"

import type React from "react"

import { useState } from "react"
import { Layout } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { PlusCircle, X } from "lucide-react"

interface TeamMember {
  name: string
  role: string
  skills: string
}

export default function ApplyPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    loanPurpose: "",
    loanAmount: "",
    role: "",
    skills: "",
    teamMembers: [] as TeamMember[],
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, loanPurpose: value }))
  }

  const addTeamMember = () => {
    if (formData.teamMembers.length < 4) {
      setFormData((prev) => ({
        ...prev,
        teamMembers: [...prev.teamMembers, { name: "", role: "", skills: "" }],
      }))
    }
  }

  const removeTeamMember = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((_, i) => i !== index),
    }))
  }

  const updateTeamMember = (index: number, field: keyof TeamMember, value: string) => {
    setFormData((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.map((member, i) => (i === index ? { ...member, [field]: value } : member)),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted:", formData)
    const encodedFormData = encodeURIComponent(JSON.stringify(formData))
    router.push(`/ai-interview?formData=${encodedFormData}`)
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Apply for a Group Loan</CardTitle>
            <CardDescription>Please fill in your group's information to start the application process.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Primary Applicant Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Your Role in the Team</Label>
                    <Input id="role" name="role" value={formData.role} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skills">Your Skills</Label>
                  <Textarea
                    id="skills"
                    name="skills"
                    value={formData.skills}
                    onChange={handleInputChange}
                    placeholder="List your key skills and experiences"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Team Members</h3>
                {formData.teamMembers.map((member, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`memberName-${index}`}>Name</Label>
                          <Input
                            id={`memberName-${index}`}
                            value={member.name}
                            onChange={(e) => updateTeamMember(index, "name", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`memberRole-${index}`}>Role</Label>
                          <Input
                            id={`memberRole-${index}`}
                            value={member.role}
                            onChange={(e) => updateTeamMember(index, "role", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor={`memberSkills-${index}`}>Skills</Label>
                          <Textarea
                            id={`memberSkills-${index}`}
                            value={member.skills}
                            onChange={(e) => updateTeamMember(index, "skills", e.target.value)}
                            placeholder="List key skills and experiences"
                            required
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => removeTeamMember(index)}
                      >
                        <X className="mr-2 h-4 w-4" /> Remove Team Member
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                {formData.teamMembers.length < 4 && (
                  <Button type="button" variant="outline" onClick={addTeamMember}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Team Member
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Loan Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="loanPurpose">Loan Purpose</Label>
                    <Select onValueChange={handleSelectChange} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select loan purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="homeImprovement">Home Improvement</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loanAmount">Loan Amount ($)</Label>
                    <Input
                      id="loanAmount"
                      name="loanAmount"
                      type="number"
                      value={formData.loanAmount}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full">
                Proceed to AI Interview
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </Layout>
  )
}

