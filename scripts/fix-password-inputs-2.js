const fs = require('fs')
const path = require('path')

const filesToPatch = [
    "src/app/(auth)/login/page.tsx",
    "src/app/(auth)/register/page.tsx",
    "src/app/(dashboard)/dashboard/profile/page.tsx",
    "src/app/(dashboard)/dashboard/admin/users/page.tsx"
]

filesToPatch.forEach(file => {
    const fullPath = path.join(process.cwd(), file)
    if (!fs.existsSync(fullPath)) return

    let content = fs.readFileSync(fullPath, 'utf-8')

    // Simplify the approach: replace all occurrences of 'type="password"' inside an <Input> tag
    // Because Next.js passes props like <Input type="password" /> or <Input required type="password" />
    const lines = content.split('\\n')
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('<Input') && lines[i].includes('type="password"')) {
            lines[i] = lines[i].replace('<Input', '<PasswordInput')
            lines[i] = lines[i].replace('type="password"', '') // Optional: remove type since PasswordInput handles it, but leaving it is fine too if we just change the tag. Let's just change tag and remove type.
        } else if (lines[i].includes('<Input') && lines[i].includes('type={"password"}')) {
            lines[i] = lines[i].replace('<Input', '<PasswordInput')
            lines[i] = lines[i].replace('type={"password"}', '')
        }
    }
    content = lines.join('\\n')

    // Add import if missing
    if (!content.includes('PasswordInput')) {
        content = content.replace(/(import .* from "@/components/ui/input")/, '$1\\nimport { PasswordInput } from "@/components/ui/password-input"')
    }

    // Fix missing toast manually
    if (file.includes('login') || file.includes('register')) {
        if (!content.includes('import { toast }')) {
            content = content.replace('import { PasswordInput }', 'import { toast } from "sonner"\\nimport { PasswordInput }')
        }
    }

    fs.writeFileSync(fullPath, content)
    console.log("Patched", file)
})
