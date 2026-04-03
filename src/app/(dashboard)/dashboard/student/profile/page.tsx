"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { UserCircle, Loader2, Save, BookUser } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

export default function StudentProfilePage() {
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [name, setName] = useState("")
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            setProfile(data)
            setName(data?.name || "")
            setLoading(false)
        }
        load()
    }, [])

    async function handleSaveName() {
        if (!profile) return
        setSaving(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ name, updatedAt: new Date().toISOString() })
                .eq('id', profile.id)

            if (error) throw error
            toast.success("Nama berhasil diperbarui!")
            setProfile({ ...profile, name })
        } catch {
            toast.error("Gagal menyimpan nama")
        } finally {
            setSaving(false)
        }
    }

    async function handleChangePassword() {
        if (!newPassword || newPassword.length < 6) {
            toast.error("Password baru minimal 6 karakter")
            return
        }
        setSaving(true)
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword })
            if (error) throw error
            toast.success("Password berhasil diubah!")
            setCurrentPassword("")
            setNewPassword("")
        } catch (e: any) {
            toast.error(e.message || "Gagal mengubah password")
        } finally {
            setSaving(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    )

    return (
        <div className="space-y-5 max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-primary">Profil Saya</h2>

            {/* Info Akun */}
            <Card>
                <CardHeader className="flex flex-row items-center gap-3 pb-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                        <BookUser className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">Informasi Akun</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground">Email</Label>
                            <Input value={profile?.email || ""} disabled className="bg-muted/50" />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground">NIS</Label>
                            <Input value={profile?.nis || "-"} disabled className="bg-muted/50" />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground">Kelas</Label>
                            <Input value={profile?.class || "-"} disabled className="bg-muted/50" />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs text-muted-foreground">Role</Label>
                            <Input value={profile?.role || "STUDENT"} disabled className="bg-muted/50" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Ganti Password */}
            <Card>
                <CardHeader className="flex flex-row items-center gap-3 pb-3">
                    <div className="p-2 bg-orange-50 rounded-full">
                        <Save className="h-5 w-5 text-orange-500" />
                    </div>
                    <CardTitle className="text-base">Ganti Password</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-1.5">
                        <Label>Password Baru</Label>
                        <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 karakter" />
                    </div>
                    <Button onClick={handleChangePassword} disabled={saving} variant="outline" className="gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Ubah Password
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
