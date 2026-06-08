from time import time

from fastapi import FastAPI, UploadFile
import fitz
import pymupdf4llm

async def parse_pdf(file:UploadFile):
   # print(f"PDF loaded in {time() :.2f} seconds")
    pdf_bytes = await file.read()
   
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    #print(f"PDF loaded in {time() :.2f} seconds")
    markdown = pymupdf4llm.to_markdown(doc)
   # print(f"PDF parsed in {time() :.2f} seconds")
    doc.close()
    return {
        "filename": file.filename,
        "markdown": markdown
    }
