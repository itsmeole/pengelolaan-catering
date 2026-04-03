"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { User, Store, Lock } from "lucide-react"
import { PasswordInput } from "@/components/ui/password-input"
export default function ProfilePage() {
    const [loading, setLoading] = useState(false)
    const [userRole, setUserRole] = useState("STUDENT")
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        vendorName: "",
        currentPassword: "",
        newPassword: ""
    })

    useEffect(() => {
        // Fetch fresh data from API
        fetch("/api/user/profile").then(res => res.json()).then(data => {
            if (data && !data.error) {
                setFormData(prev => ({
                    ...prev,
                    name: data.name || "",
                    email: data.email || "",
                    vendorName: data.vendorName || ""
                }))
                if (data.role) setUserRole(data.role)
            }
        }).catch(err => console.error(err))
    }, [])

    async function handleUpdateProfile(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch("/api/user/profile", {
                method: "PUT",
                body: JSON.stringify({
                    type: "INFO",
                    name: formData.name,
                    email: formData.email,
                    vendorName: formData.vendorName
                })
            })

            if (res.ok) {
                toast.success("Profil berhasil diperbarui")
                // Force reload session would be ideal here
            } else {
                toast.error("Gagal update profil")
            }
        } catch (e) {
            toast.error("Error sistem")
        } finally {
            setLoading(false)
        }
    }

    async function handleUpdatePassword(e: React.FormEvent) {
        e.preventDefault()
        if (!formData.newPassword) return

        setLoading(true)
        try {
            const res = await fetch("/api/user/profile", {
                method: "PUT",
                body: JSON.stringify({
                    type: "PASSWORD",
                    password: formData.newPassword
                })
            })

            if (res.ok) {
                toast.success("Password diperbarui")
                setFormData(prev => ({ ...prev, newPassword: "", currentPassword: "" }))
            } else {
                toast.error("Gagal update password")
            }
        } catch (e) {
            toast.error("Error sistem")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-primary">Edit Profil</h2>
                <p className="text-muted-foreground">Kelola informasi akun dan keamanan Anda.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">

                {/* Profile Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" /> Informasi Dasar
                        </CardTitle>
                        <CardDescription>Update nama dan identitas usaha Anda.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nama Lengkap / Admin</Label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            {userRole === "VENDOR" && (
                                <div className="space-y-2">
                                    <Label>Nama Kantin (Brand)</Label>
                                    <div className="relative">
                                        <Store className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-9"
                                            value={formData.vendorName}
                                            onChange={e => setFormData({ ...formData, vendorName: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            <Button type="submit" disabled={loading}>Simpan Profil</Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Security */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5" /> Keamanan
                        </CardTitle>
                        <CardDescription>Ubah password akun Anda.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Password Baru</Label>
                                <PasswordInput
                                    value={formData.newPassword}
                                    onChange={(e: any) => setFormData({ ...formData, newPassword: e.target.value })}
                                    placeholder="Minimal 6 karakter"
                                />
                            </div>
                            <Button type="submit" variant="secondary" disabled={loading || !formData.newPassword}>
                                Update Password
                            </Button>
                        </form>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
