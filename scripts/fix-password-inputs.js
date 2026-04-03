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

    // Replace <Input type="password" with <PasswordInput
    content = content.replace(/<Input([^>]*)type="password"([^>]*)>/g, '<PasswordInput$1$2>')
    content = content.replace(/<Input([^>]*)type=\{"password"\}([^>]*)>/g, '<PasswordInput$1$2>')

    // Add import if missing
    if (!content.includes('import { PasswordInput }')) {
        // Insert after lucide-react or sonner or ui/input
        content = content.replace(/(import .* from "@/components/ui/input")/, '$1\nimport { PasswordInput } from "@/components/ui/password-input"')
    }

    // Fix the accidental toast deletion in login/register
    if (file.includes('login') || file.includes('register')) {
        if (!content.includes('import { toast } from "sonner"')) {
            content = content.replace(/(import .*PasswordInput.*)/, '$1\nimport { toast } from "sonner"')
        }
    }

    fs.writeFileSync(fullPath, content)
    console.log("Patched password input in", file)
})
