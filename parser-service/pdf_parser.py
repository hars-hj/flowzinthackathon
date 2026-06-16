from fastapi import UploadFile
import fitz
import pymupdf4llm

async def parse_pdf(file: UploadFile):
    pdf_bytes = await file.read()

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    pages = []

    for i in range(doc.page_count):
        md = pymupdf4llm.to_markdown(
            fitz.open(stream=pdf_bytes, filetype="pdf"),
            pages=[i]
        )

        pages.append({
            "page": i + 1,
            "markdown": md
        })
       
        
    return {
            "filename": file.filename,
            "pages": pages
            }