"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AdminMenuPage() {
  const [menus, setMenus] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMenus()
  }, [])

  async function fetchMenus() {
    try {
      const res = await fetch("/api/admin/menus")
      if (res.ok) {
        setMenus(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8">Loading menus...</div>

  // Group by Vendor
  const groupedMenus: Record<string, any[]> = {}
  menus.forEach(menu => {
    const vendorName = menu.vendor?.vendorName || menu.vendor?.name || "Unknown Vendor"
    if (!groupedMenus[vendorName]) groupedMenus[vendorName] = []
    groupedMenus[vendorName].push(menu)
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary">Menu Mingguan</h2>
        <p className="text-muted-foreground">Daftar menu yang disediakan oleh para vendor.</p>
      </div>

      {Object.keys(groupedMenus).length === 0 ? (
        <p>Belum ada menu tersedia.</p>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedMenus).map(([vendorName, vendorMenus]) => (
            <div key={vendorName} className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="w-2 h-8 bg-primary rounded-full"></span>
                {vendorName}
              </h3>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {vendorMenus.map((menu) => (
                  <Card key={menu.id} className="overflow-hidden">
                    {menu.imageUrl && (
                      <div className="h-48 w-full overflow-hidden">
                        <img src={menu.imageUrl} alt={menu.name} className="w-full h-full object-cover transition-transform hover:scale-105" />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{menu.name}</CardTitle>
                        <Badge variant="secondary">Rp {menu.price.toLocaleString("id-ID")}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">{menu.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
