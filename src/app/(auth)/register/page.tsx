"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, ShieldCheck } from "lucide-react"

export default function RegisterPage() {
    const waLink = "https://wa.me/6289676363933?text=Halo%20Admin,%20saya%20ingin%20mendaftar%20akun%20Go%20Catering"

    return (
        <Card className="border-none shadow-xl w-full max-w-md overflow-hidden">
            <div className="h-2 bg-primary w-full" />
            <CardHeader className="space-y-2 text-center pt-8">
                <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold text-slate-800">Pendaftaran Akun</CardTitle>
                <CardDescription className="text-base px-2">
                    Untuk menjamin keamanan dan validitas data, pendaftaran akun siswa & vendor saat ini dilakukan secara terpusat oleh Admin/Pengelola.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex flex-col items-center pb-8">
                <div className="text-sm text-muted-foreground text-center bg-slate-50 p-4 rounded-lg border border-slate-100">
                    Silakan hubungi Admin melalui tombol di bawah ini dengan mengirimkan Nama Lengkap, NIS, dan Kelas Anda.
                </div>
                
                <Button size="lg" className="w-full font-bold h-12 gap-2 text-base shadow-md" asChild>
                    <a href={waLink} target="_blank" rel="noreferrer">
                        <MessageCircle className="h-5 w-5" />
                        Hubungi Admin (WhatsApp)
                    </a>
                </Button>

                <div className="w-full flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-[1px] bg-slate-200 flex-1" />
                    <span>ATAU</span>
                    <div className="h-[1px] bg-slate-200 flex-1" />
                </div>

                <Button variant="outline" className="w-full h-11" asChild>
                    <Link href="/login">Kembali ke Login</Link>
                </Button>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t py-4 text-center justify-center">
                 <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                    Go Catering - Management System
                 </p>
            </CardFooter>
        </Card>
    )
}

