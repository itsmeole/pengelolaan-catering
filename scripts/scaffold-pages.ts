
import fs from 'fs';
import path from 'path';

const pages = [
    'src/app/(dashboard)/dashboard/admin/menus/page.tsx',
    'src/app/(dashboard)/dashboard/admin/orders/page.tsx',
    'src/app/(dashboard)/dashboard/admin/users/page.tsx',
    'src/app/(dashboard)/dashboard/admin/reports/page.tsx',

    'src/app/(dashboard)/dashboard/vendor/orders/page.tsx',
    'src/app/(dashboard)/dashboard/vendor/history/page.tsx',
    'src/app/(dashboard)/dashboard/vendor/revenue/page.tsx',

    'src/app/(dashboard)/dashboard/student/history/page.tsx',
    'src/app/(dashboard)/dashboard/student/profile/page.tsx',
];

const content = `
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
`;

pages.forEach(p => {
    const fullPath = path.resolve(process.cwd(), p);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }

    if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, content);
        console.log(`Created page: ${p}`);
    } else {
        console.log(`Skipped existing: ${p}`);
    }
});
