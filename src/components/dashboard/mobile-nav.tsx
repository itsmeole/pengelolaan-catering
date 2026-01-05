"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SidebarNav } from "./sidebar-nav"
import { Menu } from "lucide-react"
import { useState } from "react"

export function MobileNav({ role }: { role: any }) {
    const [open, setOpen] = useState(false)
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
                <div className="flex items-center h-14 border-b px-4">
                    <span className="font-bold text-lg text-primary">Go Catering</span>
                </div>
                <div className="p-4">
                    <SidebarNav role={role} onClick={() => setOpen(false)} />
                </div>
            </SheetContent>
        </Sheet>
    )
}
