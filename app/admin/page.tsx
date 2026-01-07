"use client"

import { useState } from "react"
import { AdminDashboard } from "@/components/admin-dashboard"
import { EmployeeManagement } from "@/components/employee-management"
import { AuditLogs } from "@/components/audit-logs"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, FileText } from "lucide-react"

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "employees" | "audit">("dashboard")

  return (
    <main className="bg-background min-h-screen">
      <div className="border-b">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 pt-4">
            <Button
              variant={activeTab === "dashboard" ? "default" : "ghost"}
              onClick={() => setActiveTab("dashboard")}
              className="rounded-b-none"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant={activeTab === "employees" ? "default" : "ghost"}
              onClick={() => setActiveTab("employees")}
              className="rounded-b-none"
            >
              <Users className="w-4 h-4 mr-2" />
              Employees
            </Button>
            <Button
              variant={activeTab === "audit" ? "default" : "ghost"}
              onClick={() => setActiveTab("audit")}
              className="rounded-b-none"
            >
              <FileText className="w-4 h-4 mr-2" />
              Audit Logs
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {activeTab === "dashboard" ? (
          <AdminDashboard />
        ) : activeTab === "employees" ? (
          <EmployeeManagement />
        ) : (
          <AuditLogs />
        )}
      </div>
    </main>
  )
}
