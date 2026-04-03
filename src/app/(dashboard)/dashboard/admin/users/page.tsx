"use client"

import { useEffect, useState, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { FileUp, Plus, Trash2, KeyRound, Pencil, Download } from "lucide-react"
import * as XLSX from 'xlsx'

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary">Kelola User</h2>
        <p className="text-muted-foreground">Tambah, edit, dan kelola akun Siswa dan Vendor.</p>
      </div>

      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students">Siswa</TabsTrigger>
          <TabsTrigger value="vendors">Vendor</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          <StudentManager />
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <VendorManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StudentManager() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form State
  const [formData, setFormData] = useState<any>({ name: "", email: "", nis: "", class: "" })

  useEffect(() => { fetchStudents() }, [])

  async function fetchStudents() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/users/students")
      if (res.ok) setStudents(await res.json())
    } catch (e) { toast.error("Gagal load data siswa") }
    finally { setLoading(false) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.id) return
    try {
      const res = await fetch("/api/admin/users/students", {
        method: "PUT",
        body: JSON.stringify({ ...formData, type: "UPDATE_INFO" })
      })
      if (res.ok) {
        toast.success("Data siswa diperbarui")
        fetchStudents()
      } else {
        toast.error("Gagal update siswa")
      }
    } catch (e) { toast.error("Error sistem") }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch("/api/admin/users/students", {
        method: "POST",
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Siswa berhasil ditambahkan")
        setIsAddOpen(false)
        setFormData({ name: "", email: "", nis: "", class: "" })
        fetchStudents()
      } else {
        toast.error(data.error || "Gagal tambah siswa. Email/NIS mungkin duplikat.")
      }
    } catch (e: any) { toast.error(e.message || "Error sistem") }
  }

  async function handleDownloadTemplate() {
    const template = [
      { Nama: "Contoh Siswa 1", Email: "siswa1@sekolah.sch.id", NIS: "123456", Kelas: "10-A" },
      { Nama: "Contoh Siswa 2", Email: "siswa2@sekolah.sch.id", NIS: "123457", Kelas: "11-B" }
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Template")
    XLSX.writeFile(wb, "template_import_siswa.xlsx")
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)

        // Expect columns: NAME, EMAIL, NIS, CLASS
        // Map keys to lower case
        const formatted = data.map((row: any) => ({
          name: row['Name'] || row['NAME'] || row['Nama'],
          email: row['Email'] || row['EMAIL'],
          nis: String(row['NIS'] || row['nis']),
          class: row['Class'] || row['CLASS'] || row['Kelas']
        })).filter(r => r.name && r.email)

        if (formatted.length === 0) {
          toast.error("Format Excel tidak valid atau kosong")
          return
        }

        const res = await fetch("/api/admin/users/students", {
          method: "POST",
          body: JSON.stringify(formatted)
        })
        const resData = await res.json()

        if (resData.success) {
          toast.success(`Berhasil import ${resData.count} siswa`)
          if (resData.errors.length > 0) {
            toast.warning(`${resData.errors.length} data dilewati (Duplikat)`)
          }
          fetchStudents()
        }

      } catch (err) {
        toast.error("Gagal membaca file Excel")
      }
    }
    reader.readAsBinaryString(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus siswa ini?")) return
    await fetch(`/api/admin/users/students?id=${id}`, { method: "DELETE" })
    toast.success("Siswa dihapus")
    fetchStudents()
  }

  async function handleResetPass(id: string) {
    if (!confirm("Reset password ke default (123456)?")) return
    await fetch(`/api/admin/users/students`, {
      method: "PUT",
      body: JSON.stringify({ id, type: "RESET_PASSWORD" })
    })
    toast.success("Password direset ke 123456")
  }

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.nis.includes(search) ||
    s.class.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <Input
          placeholder="Cari siswa (Nama, NIS, Kelas)..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          <input type="file" ref={fileInputRef} hidden accept=".xlsx, .xls" onChange={handleImport} />
          <Button variant="outline" onClick={handleDownloadTemplate} title="Download Template Excel">
            <Download className="mr-2 h-4 w-4" /> Template
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <FileUp className="mr-2 h-4 w-4" /> Import Excel
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Tambah Siswa</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Tambah Siswa Baru</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nama Lengkap</Label>
                  <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>NIS</Label>
                    <Input required value={formData.nis} onChange={e => setFormData({ ...formData, nis: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Kelas</Label>
                    <Input required value={formData.class} onChange={e => setFormData({ ...formData, class: e.target.value })} />
                  </div>
                </div>
                <Button type="submit" className="w-full">Simpan</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>NIS</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kelas</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center h-24">Tidak ada data</TableCell></TableRow>
            ) : (
              filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell>{s.nis}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.class}</TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setFormData({ name: s.name || "", email: s.email || "", nis: s.nis || "", class: s.class || "", id: s.id })}>
                          <Pencil className="h-4 w-4 text-blue-500" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Edit Siswa</DialogTitle></DialogHeader>
                        <form onSubmit={handleEdit} className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Nama Lengkap</Label>
                            <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>NIS</Label>
                              <Input required value={formData.nis} onChange={e => setFormData({ ...formData, nis: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                              <Label>Kelas</Label>
                              <Input required value={formData.class} onChange={e => setFormData({ ...formData, class: e.target.value })} />
                            </div>
                          </div>
                          <Button type="submit" className="w-full">Simpan Perubahan</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="icon" onClick={() => handleResetPass(s.id)} title="Reset Password">
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function VendorManager() {
  const [vendors, setVendors] = useState<any[]>([])
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [formData, setFormData] = useState<any>({ name: "", email: "", vendorName: "", password: "" })

  useEffect(() => { fetchVendors() }, [])

  async function fetchVendors() {
    const res = await fetch("/api/admin/users/vendors")
    if (res.ok) setVendors(await res.json())
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch("/api/admin/users/vendors", {
        method: "POST",
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Vendor berhasil dibuat")
        setIsAddOpen(false)
        setFormData({ name: "", email: "", vendorName: "", password: "" })
        fetchVendors()
      } else {
        toast.error(data.error || "Gagal buat vendor")
      }
    } catch (e: any) { toast.error(e.message || "Error") }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.id) return
    try {
      const res = await fetch("/api/admin/users/vendors", {
        method: "PUT",
        body: JSON.stringify(formData) // Handles password update if provided, otherwise generic info
      })
      if (res.ok) {
        toast.success("Data vendor diperbarui")
        setFormData({ name: "", email: "", vendorName: "", password: "" }) // Reset form
        // Ideally we should close a separate edit dialog, relying on reusing the Add dialog or a new one?
        // Let's use a separate Dialog for Edit to avoid confusion or reuse properly.
        // For simplicity in this interaction, I'll inline a Dialog in the table row like StudentManager.
        fetchVendors()
      } else {
        toast.error("Gagal update vendor")
      }
    } catch (e) { toast.error("Error") }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus vendor ini?")) return
    await fetch(`/api/admin/users/vendors?id=${id}`, { method: "DELETE" })
    toast.success("Vendor dihapus")
    fetchVendors()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Tambah Vendor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Vendor Baru</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Pemilik</Label>
                <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nama Kantin (Brand)</Label>
                <Input required value={formData.vendorName} onChange={e => setFormData({ ...formData, vendorName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email Login</Label>
                <Input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <PasswordInput required value={formData.password} onChange={(e: any) => setFormData({ ...formData, password: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">Buat Akun Vendor</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Kantin</TableHead>
              <TableHead>Pemilik</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map(v => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.vendorName}</TableCell>
                <TableCell>{v.name}</TableCell>
                <TableCell>{v.email}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setFormData({ name: v.name || "", email: v.email || "", vendorName: v.vendorName || "", password: "", id: v.id })}>
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Edit Vendor</DialogTitle></DialogHeader>
                      <form onSubmit={handleEdit} className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Nama Pemilik</Label>
                          <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Nama Kantin (Brand)</Label>
                          <Input required value={formData.vendorName} onChange={e => setFormData({ ...formData, vendorName: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Email Login</Label>
                          <Input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Password Baru (Opsional)</Label>
                          <PasswordInput
                            placeholder="Biarkan kosong jika tidak diubah"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                          />
                        </div>
                        <Button type="submit" className="w-full">Simpan Perubahan</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(v.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
