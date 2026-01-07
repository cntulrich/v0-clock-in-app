"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, LogIn, LogOut, MapPin, Wifi, Globe } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"

type ClockEntry = {
  id: string
  employeeId: string
  employeeName: string
  clockIn: string
  clockOut?: string
  location: "office" | "remote" | "hybrid"
  date: string
}

type Employee = {
  id: string
  email: string
  name: string
  created_at: string
}

export function ClockPortal() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [currentEntry, setCurrentEntry] = useState<ClockEntry | null>(null)
  const [employeeId, setEmployeeId] = useState("")
  const [employeeName, setEmployeeName] = useState("")
  const [location, setLocation] = useState<"office" | "remote" | "hybrid">("office")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [ipAddress, setIpAddress] = useState<string>("")
  const [locationData, setLocationData] = useState<any>(null)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchIPAndLocation()
  }, [])

  useEffect(() => {
    const storedEmployee = localStorage.getItem("currentEmployee")
    if (storedEmployee) {
      const employee = JSON.parse(storedEmployee)
      setEmployeeId(employee.id)
      setEmployeeName(employee.name)
      setIsLoggedIn(true)

      // Check if already clocked in today from database
      checkTodayClockStatus(employee.name)
    }
  }, [])

  const fetchIPAndLocation = async () => {
    try {
      const response = await fetch("https://ipapi.co/json/")
      const data = await response.json()
      setIpAddress(data.ip)
      setLocationData({
        city: data.city,
        country: data.country_name,
        timezone: data.timezone,
      })
    } catch (error) {
      console.error("[v0] Error fetching IP/location:", error)
    }
  }

  const logAuditEvent = async (actionType: string, details: any = {}) => {
    const supabase = createClient()
    await supabase.from("audit_logs").insert([
      {
        action_type: actionType,
        employee_email: employeeId,
        employee_name: employeeName,
        ip_address: ipAddress,
        location_data: locationData,
        details,
      },
    ])
  }

  const checkTodayClockStatus = async (employeeName: string) => {
    const supabase = createClient()
    const today = new Date().toLocaleDateString()

    const { data, error } = await supabase
      .from("time_entries")
      .select("*")
      .eq("employee_name", employeeName)
      .is("clock_out", null)
      .order("clock_in", { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const entry = data[0]
      const entryDate = new Date(entry.clock_in).toLocaleDateString()

      if (entryDate === today) {
        setIsClockedIn(true)
        setCurrentEntry({
          id: entry.id,
          employeeId: entry.employee_name,
          employeeName: entry.employee_name,
          clockIn: entry.clock_in,
          location: entry.location,
          date: entryDate,
        })
        setLocation(entry.location)
      }
    }
  }

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const companyName = formData.get("companyName") as string

    if (name && companyName) {
      const supabase = createClient()

      // Check if employee exists in database by name
      const { data: existingEmployee, error } = await supabase
        .from("employees")
        .select("*")
        .ilike("name", name)
        .single()

      if (existingEmployee) {
        // Employee exists, log them in
        const employee = { id: existingEmployee.name, name: existingEmployee.name }
        localStorage.setItem("currentEmployee", JSON.stringify(employee))
        setEmployeeId(existingEmployee.name)
        setEmployeeName(existingEmployee.name)
        setIsLoggedIn(true)
        checkTodayClockStatus(existingEmployee.name)

        await supabase.from("audit_logs").insert([
          {
            action_type: "employee_login",
            employee_email: existingEmployee.email || existingEmployee.name,
            employee_name: existingEmployee.name,
            ip_address: ipAddress,
            location_data: locationData,
          },
        ])
      } else {
        alert("Name not found. Please contact your administrator to add you to the system.")
      }
    }
  }

  const handleClockIn = async () => {
    const supabase = createClient()

    const clockInTime = new Date().toISOString()
    const { data, error } = await supabase
      .from("time_entries")
      .insert([
        {
          employee_email: employeeId,
          employee_name: employeeName,
          clock_in: clockInTime,
          location,
          ip_address: ipAddress,
          city: locationData?.city,
          country: locationData?.country,
          timezone: locationData?.timezone,
        },
      ])
      .select()

    if (error) {
      alert("Failed to clock in. Please try again.")
      console.error("[v0] Clock in error:", error)
      return
    }

    if (data && data.length > 0) {
      const entry = data[0]
      setIsClockedIn(true)
      setCurrentEntry({
        id: entry.id,
        employeeId: entry.employee_name,
        employeeName: entry.employee_name,
        clockIn: entry.clock_in,
        location: entry.location,
        date: new Date(entry.clock_in).toLocaleDateString(),
      })

      await logAuditEvent("clock_in", { location, ip: ipAddress, locationData })
    }
  }

  const handleClockOut = async () => {
    if (!currentEntry) return

    const supabase = createClient()
    const clockOutTime = new Date().toISOString()
    const clockInTime = new Date(currentEntry.clockIn)
    const hoursWorked = (new Date(clockOutTime).getTime() - clockInTime.getTime()) / (1000 * 60 * 60)

    const { error } = await supabase
      .from("time_entries")
      .update({
        clock_out: clockOutTime,
        hours_worked: hoursWorked.toFixed(2),
      })
      .eq("id", currentEntry.id)

    if (error) {
      alert("Failed to clock out. Please try again.")
      console.error("[v0] Clock out error:", error)
      return
    }

    await logAuditEvent("clock_out", {
      hours_worked: hoursWorked.toFixed(2),
      location: currentEntry.location,
    })

    setIsClockedIn(false)
    setCurrentEntry(null)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const calculateHoursWorked = () => {
    if (!currentEntry) return "0:00"
    const clockInTime = new Date(currentEntry.clockIn)
    const now = new Date()
    const diff = now.getTime() - clockInTime.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}:${minutes.toString().padStart(2, "0")}`
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/20 to-background">
        <Card className="w-full max-w-md p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Employee Time Portal</h1>
            <p className="text-muted-foreground">Sign in to clock in or out</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium mb-2">
                Company Name
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter your company name"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Employee Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter your full name"
              />
            </div>

            <Button type="submit" className="w-full" size="lg">
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Don't have access? Contact your administrator to be added to the system.</p>
          </div>

          {ipAddress && locationData && (
            <div className="mt-6 p-3 bg-muted/50 rounded-lg text-xs text-center space-y-1">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Globe className="w-3 h-3" />
                <span>
                  Your location: {locationData.city}, {locationData.country}
                </span>
              </div>
              <div className="text-muted-foreground">IP: {ipAddress}</div>
            </div>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Time Portal</h1>
            <p className="text-muted-foreground">Welcome back, {employeeName}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              localStorage.removeItem("currentEmployee")
              setIsLoggedIn(false)
              setIsClockedIn(false)
              setCurrentEntry(null)
            }}
          >
            Sign Out
          </Button>
        </div>

        {/* Current Time Card */}
        <Card className="p-8 mb-6 text-center shadow-lg">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <Clock className="w-10 h-10 text-primary" />
          </div>
          <div className="text-5xl font-bold mb-2 tabular-nums">{formatTime(currentTime)}</div>
          <div className="text-lg text-muted-foreground">{formatDate(currentTime)}</div>
        </Card>

        {/* Status Card */}
        {isClockedIn && currentEntry && (
          <Card className="p-6 mb-6 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="font-semibold">Currently Clocked In</span>
              </div>
              <Badge variant="secondary" className="gap-1">
                {location === "office" ? (
                  <MapPin className="w-3 h-3" />
                ) : location === "remote" ? (
                  <Wifi className="w-3 h-3" />
                ) : (
                  <Globe className="w-3 h-3" />
                )}
                {location === "office" ? "In Office" : location === "remote" ? "Remote" : "Hybrid"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">Clock In Time</div>
                <div className="font-semibold">{new Date(currentEntry.clockIn).toLocaleTimeString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Hours Worked</div>
                <div className="font-semibold text-primary">{calculateHoursWorked()}</div>
              </div>
            </div>
            {locationData && (
              <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex items-center gap-1">
                <Globe className="w-3 h-3" />
                <span>
                  {locationData.city}, {locationData.country} • IP: {ipAddress}
                </span>
              </div>
            )}
          </Card>
        )}

        {/* Action Card */}
        <Card className="p-8">
          {!isClockedIn ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3">Work Location</label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setLocation("office")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      location === "office" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <MapPin className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-medium">Office</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocation("remote")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      location === "remote" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Wifi className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-medium">Remote</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocation("hybrid")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      location === "hybrid" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Globe className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-medium">Hybrid</div>
                  </button>
                </div>
              </div>

              <Button onClick={handleClockIn} className="w-full" size="lg">
                <LogIn className="w-5 h-5 mr-2" />
                Clock In
              </Button>
            </div>
          ) : (
            <Button onClick={handleClockOut} variant="destructive" className="w-full" size="lg">
              <LogOut className="w-5 h-5 mr-2" />
              Clock Out
            </Button>
          )}
        </Card>

        {/* Employee Info */}
        <div className="mt-6 text-center text-sm text-muted-foreground">Employee: {employeeName}</div>
      </div>
    </div>
  )
}
