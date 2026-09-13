import { NextRequest, NextResponse } from 'next/server'
import { analyzeStatementPdf } from '@/lib/statement-parser'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const sampleName = formData.get('sample') as string | null

    let buffer: Buffer
    let fileName: string

    if (file && file.size > 0) {
      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        return NextResponse.json(
          { error: 'Only PDF files are supported.' },
          { status: 400 }
        )
      }
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      fileName = file.name
    } else if (sampleName) {
      // Safe check on sample file name
      const safeName = path.basename(sampleName)
      const samplePath = path.join(process.cwd(), 'public', 'samples', safeName)
      if (!fs.existsSync(samplePath)) {
        return NextResponse.json(
          { error: `Sample file "${safeName}" not found.` },
          { status: 404 }
        )
      }
      buffer = fs.readFileSync(samplePath)
      fileName = safeName
    } else {
      return NextResponse.json(
        { error: 'No PDF file or sample name was provided.' },
        { status: 400 }
      )
    }

    const result = await analyzeStatementPdf(buffer, fileName)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error analyzing statement PDF:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process and analyze statement PDF.' },
      { status: 500 }
    )
  }
}
