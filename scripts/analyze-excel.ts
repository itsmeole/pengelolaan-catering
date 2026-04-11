import * as XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

const filePath = path.join(process.cwd(), 'scripts', 'template_import_siswa (1).xlsx')

function analyze() {
    if (!fs.existsSync(filePath)) {
        console.error("File tidak ditemukan:", filePath)
        return
    }

    const fileBuffer = fs.readFileSync(filePath)
    const wb = XLSX.read(fileBuffer)
    const wsname = wb.SheetNames[0]
    const ws = wb.Sheets[wsname]
    const data = XLSX.utils.sheet_to_json(ws)

    console.log("--- ANALISIS EXCEL ---")
    console.log(`Total Baris: ${data.length}`)
    
    if (data.length > 0) {
        console.log("Headers ditemukan:", Object.keys(data[0] as object))
        console.log("Sample baris pertama:", data[0])
    }
}

analyze()
