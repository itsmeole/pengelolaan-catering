"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
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
                <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
                <div className="flex items-center h-14 border-b px-4 gap-2">
                    <img src="/logo-kujang.png" alt="Logo Pupuk Kujang" className="h-8 w-8 object-contain rounded-full bg-white p-0.5" />
                    <span className="font-bold text-lg text-primary">Go Catering</span>
                </div>
                <div className="p-4">
                    <SidebarNav role={role} onClick={() => setOpen(false)} />
                </div>
            </SheetContent>
        </Sheet>
    )
}
