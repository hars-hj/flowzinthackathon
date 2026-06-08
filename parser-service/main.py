from email import parser

from fastapi import FastAPI, UploadFile
import fitz
import pymupdf4llm
import pdf_parser

app = FastAPI()

@app.post("/parse")
async def parse_file(file: UploadFile):
################################################
    content_type = file.content_type

    if content_type == "application/pdf":
        return await pdf_parser.parse_pdf(file);

    # elif content_type in [
    #     "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    # ]:
    #     print("DOCX")

    # elif content_type == "text/plain":
    #     print("TXT")

    else:
        raise ValueError("Unsupported file type")
####################################################################
   