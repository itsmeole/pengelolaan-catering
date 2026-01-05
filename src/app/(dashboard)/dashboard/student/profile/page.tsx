
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Construction } from "lucide-react"

export default function PlaceholderPage() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
       <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
         <Construction className="h-12 w-12 text-yellow-600 dark:text-yellow-500" />
       </div>
       <h2 className="text-2xl font-bold tracking-tight">Fitur Dalam Pengembangan</h2>
       <p className="text-muted-foreground max-w-sm">
         Halaman ini sedang kami persiapkan. Silakan kembali lagi nanti.
       </p>
    </div>
  )
}
