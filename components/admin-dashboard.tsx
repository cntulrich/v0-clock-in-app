"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, MapPin, Wifi, Download, Calendar, Globe } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type ClockEntry = {
  id: string
  employee_email: string
  employee_name: string
  employee_manager?: string // Added employee_manager field
  clock_in: string
  clock_out?: string | null
  location: "office" | "remote" | "hybrid"
  hours_worked?: number | null
  ip_address?: string | null
  city?: string | null
  country?: string | null
  timezone?: string | null
  created_at: string
}

export function AdminDashboard() {
  const [entries, setEntries] = useState<ClockEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<ClockEntry[]>([])
  const [locationFilter, setLocationFilter] = useState<"all" | "office" | "remote" | "hybrid">("all")
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0])
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth")
    if (adminAuth === "true") {
      setIsAdminLoggedIn(true)
      loadEntries()
    }
  }, [])

  useEffect(() => {
    if (isAdminLoggedIn) {
      loadEntries()
    }
  }, [isAdminLoggedIn, dateFilter])

  useEffect(() => {
    filterEntries()
  }, [entries, locationFilter])

  const loadEntries = async () => {
    const supabase = createClient()

    // Get start and end of selected date
    const startDate = new Date(dateFilter)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(dateFilter)
    endDate.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from("time_entries")
      .select(`
        *,
        employees!time_entries_employee_id_fkey (
          manager
        )
      `)
      .gte("clock_in", startDate.toISOString())
      .lte("clock_in", endDate.toISOString())
      .order("clock_in", { ascending: false })

    if (error) {
      console.error("[v0] Error loading entries:", error)
      return
    }

    const entriesWithManager = (data || []).map((entry: any) => ({
      ...entry,
      employee_manager: entry.employees?.manager || null,
    }))

    setEntries(entriesWithManager)
  }

  const filterEntries = () => {
    let filtered = entries

    if (locationFilter !== "all") {
      filtered = filtered.filter((entry) => entry.location === locationFilter)
    }

    setFilteredEntries(filtered)
  }

  const handleAdminLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (adminPassword === "admin123") {
      localStorage.setItem("adminAuth", "true")
      setIsAdminLoggedIn(true)

      const supabase = createClient()
      try {
        const response = await fetch("https://ipapi.co/json/")
        const locationData = await response.json()

        await supabase.from("audit_logs").insert([
          {
            action_type: "admin_login",
            ip_address: locationData.ip,
            location_data: {
              city: locationData.city,
              country_name: locationData.country_name,
              timezone: locationData.timezone,
            },
          },
        ])
      } catch (error) {
        console.error("[v0] Error logging admin login:", error)
      }
    } else {
      alert("Invalid password")
    }
  }

  const calculateHoursWorked = (clockIn: string, clockOut?: string | null) => {
    const clockInTime = new Date(clockIn)
    const clockOutTime = clockOut ? new Date(clockOut) : new Date()
    const diff = clockOutTime.getTime() - clockInTime.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const getTotalHoursToday = () => {
    const totalMinutes = filteredEntries.reduce((acc, entry) => {
      const clockInTime = new Date(entry.clock_in)
      const clockOutTime = entry.clock_out ? new Date(entry.clock_out) : new Date()
      const diff = clockOutTime.getTime() - clockInTime.getTime()
      return acc + Math.floor(diff / (1000 * 60))
    }, 0)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours}h ${minutes}m`
  }

  const getClockedInCount = () => {
    return filteredEntries.filter((entry) => !entry.clock_out).length
  }

  const getOfficeCount = () => {
    return filteredEntries.filter((entry) => entry.location === "office").length
  }

  const getRemoteCount = () => {
    return filteredEntries.filter((entry) => entry.location === "remote").length
  }

  const getHybridCount = () => {
    return filteredEntries.filter((entry) => entry.location === "hybrid").length
  }

  const exportToCSV = () => {
    const csvContent = [
      [
        "Employee Email",
        "Employee Name",
        "Manager", // Added Manager column to CSV export
        "Clock In",
        "Clock Out",
        "Location",
        "Hours Worked",
        "IP Address",
        "City",
        "Country",
        "Date",
      ],
      ...filteredEntries.map((entry) => [
        entry.employee_email,
        entry.employee_name,
        entry.employee_manager || "-", // Include manager in CSV export
        new Date(entry.clock_in).toLocaleTimeString(),
        entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString() : "Still clocked in",
        entry.location,
        calculateHoursWorked(entry.clock_in, entry.clock_out),
        entry.ip_address || "-",
        entry.city || "-",
        entry.country || "-",
        new Date(entry.clock_in).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `time-entries-${dateFilter}.csv`
    a.click()
  }

  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Admin Access</h1>
            <p className="text-muted-foreground">Enter password to continue</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Admin Password
              </label>
              <input
                id="password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter admin password"
              />
            </div>

            <Button type="submit" className="w-full" size="lg">
              Sign In
            </Button>

            <p className="text-xs text-center text-muted-foreground">Demo password: admin123</p>
          </form>
        </Card>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Time Tracking Dashboard</h1>
          <p className="text-muted-foreground">Monitor employee clock entries and hours</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              localStorage.removeItem("adminAuth")
              setIsAdminLoggedIn(false)
            }}
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Currently Clocked In</span>
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div className="text-3xl font-bold">{getClockedInCount()}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">In Office</span>
            <MapPin className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold">{getOfficeCount()}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Remote</span>
            <Wifi className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold">{getRemoteCount()}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Hybrid</span>
            <Globe className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-3xl font-bold">{getHybridCount()}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Hours</span>
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold">{getTotalHoursToday()}</div>
        </Card>
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
            <label className="block text-sm font-medium mb-2">Location</label>
            <div className="flex gap-2">
              <Button
                variant={locationFilter === "all" ? "default" : "outline"}
                onClick={() => setLocationFilter("all")}
                className="flex-1"
              >
                All
              </Button>
              <Button
                variant={locationFilter === "office" ? "default" : "outline"}
                onClick={() => setLocationFilter("office")}
                className="flex-1"
              >
                <MapPin className="w-4 h-4 mr-1" />
                Office
              </Button>
              <Button
                variant={locationFilter === "remote" ? "default" : "outline"}
                onClick={() => setLocationFilter("remote")}
                className="flex-1"
              >
                <Wifi className="w-4 h-4 mr-1" />
                Remote
              </Button>
              <Button
                variant={locationFilter === "hybrid" ? "default" : "outline"}
                onClick={() => setLocationFilter("hybrid")}
                className="flex-1"
              >
                <Globe className="w-4 h-4 mr-1" />
                Hybrid
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Employee</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Manager</th> {/* Added Manager column */}
                <th className="px-6 py-4 text-left text-sm font-semibold">Clock In</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Clock Out</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Location</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">IP / City</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Hours</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    No entries found for selected filters
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">{entry.employee_name}</div>
                        <div className="text-sm text-muted-foreground">{entry.employee_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{entry.employee_manager || "-"}</td>
                    <td className="px-6 py-4 text-sm">{new Date(entry.clock_in).toLocaleTimeString()}</td>
                    <td className="px-6 py-4 text-sm">
                      {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString() : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="gap-1">
                        {entry.location === "office" ? (
                          <MapPin className="w-3 h-3" />
                        ) : entry.location === "remote" ? (
                          <Wifi className="w-3 h-3" />
                        ) : (
                          <Globe className="w-3 h-3" />
                        )}
                        {entry.location === "office" ? "Office" : entry.location === "remote" ? "Remote" : "Hybrid"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {entry.ip_address || entry.city ? (
                        <div className="text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Globe className="w-3 h-3" />
                            <span className="font-mono text-xs">{entry.ip_address || "-"}</span>
                          </div>
                          {entry.city && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {entry.city}, {entry.country}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {calculateHoursWorked(entry.clock_in, entry.clock_out)}
                    </td>
                    <td className="px-6 py-4">
                      {entry.clock_out ? (
                        <Badge variant="outline">Clocked Out</Badge>
                      ) : (
                        <Badge className="bg-green-500 hover:bg-green-600">
                          <div className="w-2 h-2 rounded-full bg-white mr-1 animate-pulse" />
                          Active
                        </Badge>
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
