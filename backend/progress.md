# Backend Progress

## Completed work

- Created a TypeScript backend structure under `backend/`.
- Added `index.ts` with Express setup and `/api/chat` route wiring.
- Created `routes/chatRoutes.ts` and `controllers/chatbotController.ts`.
- Integrated `groq-sdk` for calling the GROQ chat completions endpoint.
- Added `lib/supabaseClient.ts` to initialize the Supabase client from environment variables.
- Implemented session-based conversation memory using `session_id`.
- Queried the last 10 messages for a session from the `conversations` table.
- Updated Supabase query to match table columns: `id`, `session_id`, `role`, `message`, `timestamp`, `sentiment`, `escalated`.
- Stored incoming user messages and assistant responses back into the `conversations` table.

## Notes

- The API accepts `POST /api/chat` with `session_id` and `message` in the request body.
- Conversation history is loaded before the current request and passed into the chat request body.
- The assistant response is extracted and persisted after a successful chat completion.
- Environment config uses `SUPABASE_URL`, `SUPABASE_KEY`, `GROQ_API_URL`, `GROQ_API_KEY`, and `MODEL`.

## Next steps

- Add sentiment analysis and escalation detection during message storage.
- Add validation and error handling for Supabase inserts and response extraction.
- Add unit tests for the chat flow and Supabase conversation retrieval.

Frontend
    │
    │ Upload PDF/DOCX
    ▼
Node Backend (Express + Multer)
    │
    │ forwards file
    ▼
Python Parser Service (FastAPI)
    │
    │ Extract Markdown
    ▼
Node Backend
    │
    │ Chunk Markdown
    ▼
Embedding Service (Gemini)
    │
    │ Generate vectors
    ▼
database.

use /api/uploadFile to access the embegging pipeline.


Implemented a separate Python parser service for document extraction while keeping the main backend in Node.js (Express).
Frontend uploads PDF/DOCX files to the Node backend, which forwards the file to the Python service using multipart/form-data.
Python service extracts the document into Markdown and returns a JSON response containing:
filename
markdown
Node backend receives the Markdown and splits it into semantic chunks using a Markdown-aware text splitter with overlap for better retrieval quality.
Each chunk is associated with basic metadata (filename, chunkIndex) for future source attribution and document management.
Chunks are then passed to the Google Gemini Embedding model to generate vector embeddings.
The next step is to store {content, embedding, metadata} in databse and integrate retrieval into the chatbot pipeline.