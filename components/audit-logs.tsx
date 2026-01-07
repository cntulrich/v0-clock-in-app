"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Download, Calendar, Filter } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type AuditLog = {
  id: string
  action_type: string
  employee_email: string | null
  employee_name: string | null
  ip_address: string | null
  location_data: any
  details: any
  created_at: string
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0])

  useEffect(() => {
    loadLogs()
  }, [dateFilter])

  useEffect(() => {
    filterLogs()
  }, [logs, actionFilter])

  const loadLogs = async () => {
    const supabase = createClient()

    // Get start and end of selected date
    const startDate = new Date(dateFilter)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(dateFilter)
    endDate.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error loading audit logs:", error)
      return
    }

    setLogs(data || [])
  }

  const filterLogs = () => {
    let filtered = logs

    if (actionFilter !== "all") {
      filtered = filtered.filter((log) => log.action_type === actionFilter)
    }

    setFilteredLogs(filtered)
  }

  const getActionBadge = (actionType: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      clock_in: { variant: "default", label: "Clock In" },
      clock_out: { variant: "secondary", label: "Clock Out" },
      employee_registered: { variant: "default", label: "Registration" },
      employee_added: { variant: "outline", label: "Added by Admin" },
      admin_login: { variant: "destructive", label: "Admin Login" },
      employee_login: { variant: "outline", label: "Employee Login" },
    }

    const config = variants[actionType] || { variant: "outline", label: actionType }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const exportToCSV = () => {
    const csvContent = [
      ["Timestamp", "Action", "Employee", "Email", "IP Address", "Location", "Details"],
      ...filteredLogs.map((log) => [
        new Date(log.created_at).toLocaleString(),
        log.action_type,
        log.employee_name || "-",
        log.employee_email || "-",
        log.ip_address || "-",
        log.location_data ? `${log.location_data.city}, ${log.location_data.country}` : "-",
        JSON.stringify(log.details || {}),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-logs-${dateFilter}.csv`
    a.click()
  }

  const actionTypes = [
    { value: "all", label: "All Actions" },
    { value: "clock_in", label: "Clock In" },
    { value: "clock_out", label: "Clock Out" },
    { value: "employee_registered", label: "Registrations" },
    { value: "employee_login", label: "Employee Logins" },
    { value: "admin_login", label: "Admin Logins" },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Audit Logs</h2>
          <p className="text-muted-foreground">Track all system activities and employee actions</p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Action Type</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none bg-background"
              >
                {actionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Timestamp</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Action</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Employee</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">IP Address</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No audit logs found for selected filters</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 text-sm">
                      <div>{new Date(log.created_at).toLocaleDateString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">{getActionBadge(log.action_type)}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium">{log.employee_name || "-"}</div>
                        <div className="text-xs text-muted-foreground">{log.employee_email || "-"}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono">{log.ip_address || "-"}</td>
                    <td className="px-6 py-4 text-sm">
                      {log.location_data ? (
                        <div>
                          <div>{log.location_data.city}</div>
                          <div className="text-xs text-muted-foreground">{log.location_data.country}</div>
                        </div>
                      ) : (
                        "-"
                      )}
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
