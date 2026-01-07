"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Clock, LayoutDashboard } from "lucide-react"
import Image from "next/image"

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Naked Media" width={40} height={40} className="object-contain" />
            <span className="text-xl font-bold">Time Portal</span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant={pathname === "/" ? "default" : "ghost"}>
                <Clock className="w-4 h-4 mr-2" />
                Clock In/Out
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant={pathname === "/admin" ? "default" : "ghost"}>
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
