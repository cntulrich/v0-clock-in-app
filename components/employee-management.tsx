"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Users, Upload } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Employee = {
  id: string
  name: string
  email: string
  manager?: string
  created_at: string
}

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from("employees").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error loading employees:", error)
      return
    }

    setEmployees(data || [])
  }

  const handleAddEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const name = formData.get("name") as string
    const manager = formData.get("manager") as string

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address")
      return
    }

    const supabase = createClient()

    // Check if employee already exists
    const { data: existingEmployee } = await supabase.from("employees").select("*").ilike("name", name).single()

    if (existingEmployee) {
      alert("Employee name already exists. Please use a unique name.")
      return
    }

    const { error } = await supabase.from("employees").insert([{ email, name, manager: manager || null }])

    if (error) {
      alert("Failed to add employee. Please try again.")
      console.error("[v0] Error adding employee:", error)
      return
    }

    loadEmployees()
    setShowAddForm(false)
    ;(e.target as HTMLFormElement).reset()
  }

  const handleDeleteEmployee = async (id: string) => {
    if (confirm("Are you sure you want to remove this employee? This will also delete all their time entries.")) {
      const supabase = createClient()
      const { error } = await supabase.from("employees").delete().eq("id", id)

      if (error) {
        alert("Failed to delete employee. Please try again.")
        console.error("[v0] Error deleting employee:", error)
        return
      }

      loadEmployees()
    }
  }

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)

    try {
      const text = await file.text()
      const lines = text.split("\n").filter((line) => line.trim())

      if (lines.length === 0) {
        alert("CSV file is empty")
        setIsImporting(false)
        return
      }

      const headerLine = lines[0].toLowerCase()
      const headers =
        headerLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map((h) => h.replace(/^"|"$/g, "").trim()) || []

      console.log("[v0] CSV Headers found:", headers)

      // Find column indices
      const teamIndex = headers.findIndex((h) => h === "teams" || h === "team")
      const agentNameIndex = headers.findIndex((h) => h === "agent name" || h === "agent" || h === "name")
      const companyIndex = headers.findIndex((h) => h === "company")
      const locationIndex = headers.findIndex((h) => h === "location")

      console.log("[v0] Column indices:", { teamIndex, agentNameIndex, companyIndex, locationIndex })

      if (agentNameIndex === -1) {
        alert("CSV must contain an 'Agent Name' column")
        setIsImporting(false)
        return
      }

      // Skip header row
      const dataLines = lines.slice(1)

      const supabase = createClient()
      const employeesToAdd = []
      const errors = []

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim()
        if (!line) continue

        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)
        if (!matches || matches.length < Math.max(teamIndex, agentNameIndex, companyIndex, locationIndex) + 1) {
          errors.push(`Line ${i + 2}: Invalid format or missing columns`)
          continue
        }

        const name = agentNameIndex >= 0 ? matches[agentNameIndex].replace(/^"|"$/g, "").trim() : ""
        const company = companyIndex >= 0 ? matches[companyIndex].replace(/^"|"$/g, "").trim() : ""
        const manager = teamIndex >= 0 ? matches[teamIndex].replace(/^"|"$/g, "").trim() : null
        let location = locationIndex >= 0 ? matches[locationIndex].replace(/^"|"$/g, "").trim() : null

        // Map WFH to Remote
        if (location && location.toLowerCase() === "wfh") {
          location = "Remote"
        }

        if (!name) {
          errors.push(`Line ${i + 2}: Missing agent name`)
          continue
        }

        console.log("[v0] Processing employee:", { name, company, manager, location })

        const { data: existingEmployee } = await supabase.from("employees").select("*").ilike("name", name).single()

        if (existingEmployee) {
          errors.push(`Line ${i + 2}: Name "${name}" already exists`)
          continue
        }

        employeesToAdd.push({
          name,
          email: company || "", // Use company as email placeholder
          manager,
        })
      }

      // Bulk insert employees
      if (employeesToAdd.length > 0) {
        const { error } = await supabase.from("employees").insert(employeesToAdd)

        if (error) {
          alert(`Failed to import employees: ${error.message}`)
          console.error("[v0] Bulk insert error:", error)
        } else {
          alert(
            `Successfully imported ${employeesToAdd.length} employee(s).${
              errors.length > 0 ? `\n\n${errors.length} error(s):\n${errors.join("\n")}` : ""
            }`,
          )
          loadEmployees()
        }
      } else {
        alert(`No employees imported.\n\n${errors.join("\n")}`)
      }
    } catch (error) {
      alert("Failed to parse CSV file. Please check the format.")
      console.error("[v0] CSV parse error:", error)
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const downloadCSVTemplate = () => {
    const template =
      "Agent Name,Company,Teams,Location\nJohn Doe,Company A,Sarah Johnson,Office\nJane Smith,Company B,Sarah Johnson,Hybrid\nBob Wilson,Company C,Mike Davis,WFH\n\nNOTE:\n- 'Agent Name' column is the employee's full name (required for login)\n- 'Company' column is the company name (required for login)\n- 'Teams' column is the manager's name (optional)\n- 'Location' can be: Office, Hybrid, WFH (WFH will be converted to Remote)\n- WFH = Work From Home (Remote)"
    const blob = new Blob([template], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "employee-import-template.csv"
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Employee Management</h2>
          <p className="text-muted-foreground">
            Manage your workforce - employees use their name and company name to login
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadCSVTemplate}>
            Download Template
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
            <Upload className="w-4 h-4 mr-2" />
            {isImporting ? "Importing..." : "Import CSV"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {showAddForm && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Add New Employee</h3>
          <form onSubmit={handleAddEmployee} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name (Used for Login)</label>
              <input
                name="name"
                type="text"
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="John Doe"
              />
              <p className="text-xs text-muted-foreground mt-1">Employee will use this name + company name to login</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email (Optional)</label>
              <input
                name="email"
                type="email"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="john@company.com"
              />
              <p className="text-xs text-muted-foreground mt-1">For contact purposes only</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Manager (Optional)</label>
              <input
                name="manager"
                type="text"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Sarah Johnson"
              />
              <p className="text-xs text-muted-foreground mt-1">Name of the employee's direct manager</p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Add Employee
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Employee Name (Login)</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Manager</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Registered</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No employees added yet</p>
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-xs text-muted-foreground">Uses name + company name to login</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{employee.email || "-"}</td>
                    <td className="px-6 py-4 text-sm">{employee.manager || "-"}</td>
                    <td className="px-6 py-4 text-sm">{new Date(employee.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteEmployee(employee.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
