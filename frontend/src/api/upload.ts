import { apiFetch } from './client'

export interface UploadedFile {
  documentId: string
  filename: string
  chunkCount: number
}

export async function listFiles(): Promise<UploadedFile[]> {
  const data = await apiFetch<{ files: UploadedFile[] }>('/api/uploadFile/')
  return data.files
}

export async function uploadPdf(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const data = await apiFetch<{ message: string }>('/api/uploadFile/', {
    method: 'POST',
    body: formData,
  })
  return data.message
}
