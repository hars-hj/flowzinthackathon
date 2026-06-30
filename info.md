# Flowzinthackathon Project Overview

## Purpose

This repository implements a full-stack knowledge-based chatbot application called NexaSupport.
It combines:
- a React frontend for authentication, chat sessions, and admin document upload
- an Express backend for auth, chat, and file ingestion
- a Python parser service to extract text from uploaded PDFs
- a RAG (Retrieval-Augmented Generation) pipeline using embeddings and LLM chat completion

## Backend (`backend/`)

### Entry point
- `backend/src/index.ts`
- Sets up an Express server on port `4000`
- Enables CORS for `http://localhost:5173`
- Mounts three API routers:
  - `/api/auth` for authentication
  - `/api/chat` for chatbot queries
  - `/api/uploadFile` for PDF uploads and document management

### Authentication
- `backend/src/routes/authRouter.ts`
- `backend/src/controllers/auth.controller.ts`
- Uses Supabase auth via `backend/lib/supabaseClient.ts`
- Supports:
  - user registration (`/api/auth/register`)
  - admin registration with secret code (`/api/auth/admin/register`)
  - login (`/api/auth/login`)
  - token refresh (`/api/auth/refresh`)
  - current user info (`/api/auth/me`)
- `backend/src/middleware/auth.middleware.ts` verifies JWTs using Supabase JWKS and attaches user info to requests.
- `backend/src/middleware/role.middleware.ts` enforces admin-only and authenticated-user access.

### File upload and ingestion
- `backend/src/routes/uploadFile.ts`
- `backend/src/controllers/uploadController.ts`
- Admin-only upload endpoint accepts PDF files via multer memory storage.
- Uploaded PDFs are forwarded to the parser service at `http://localhost:8000/parse`.
- Parsed output is chunked, embedded, and stored in Supabase by:
  - `backend/src/controllers/chunkService.ts`
  - `backend/src/controllers/embeddingService.ts`
  - `backend/src/controllers/embeddingToDb.ts`
- Admin can also list uploaded files and chunk counts.

### Chat and RAG pipeline
- `backend/src/routes/chatRoutes.ts`
- `backend/src/controllers/chatbotController.ts`
- `backend/src/controllers/ragService.ts`
- Chat endpoints (all require authentication via JWT):
  - `GET /api/chat/sessions` — loads the current user's chat sessions and message history
  - `POST /api/chat` — sends a message and returns `{ reply, sessionId }`
  - `DELETE /api/chat/:sessionId` — deletes the session conversation history and removes the `user_session` link for the authenticated user
  - `GET /api/chat/analytics` — query analytics for admins
- Session ownership is managed by the backend in the `user_session` table (`user_id`, `session_id`).
  - On `POST /api/chat`, if `sessionId` is missing or `"new"`, the backend generates a UUID and creates a `user_session` row for the authenticated user.
  - If a `sessionId` is provided but not yet linked, the backend creates the `user_session` row before processing the message.
- Message history is stored in the `conversations` table (`session_id`, `role`, `content`, `created_at`) via the service-role Supabase client.
- RAG chat flow (`POST /api/chat`):
  1. User sends `sessionId` (optional) and `message` to `/api/chat`
  2. Backend ensures the session is linked to the user in `user_session`
  3. Backend embeds the user query using Google GenAI (`gemini-embedding-001`)
  4. Supabase vector search RPC `match_chunks` retrieves top matching document chunks
  5. Conversation history for the session is loaded from `conversations`
  6. A system prompt is built with retrieved context and sent to Groq LLM chat completion
  7. Answer is returned and both question and response are saved to `conversations`
  8. Response includes `{ reply, sessionId }` so the frontend can adopt the server-assigned session id
- If no relevant chunks are found, the bot returns a fallback answer: `I don't have that information, please contact our sales team.`

### External services and environment
- Uses Supabase with both anonymous and service-role clients
- Uses Google GenAI for embeddings and Groq for chat completions
- Requires environment variables like:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_ANON_KEY`
  - `EMBEDING_API_KEY`
  - `GROQ_API_KEY`
  - `ADMIN_REGISTRATION_SECRET`

## Parser service (`parser-service/`)

### Purpose
- Extracts text from uploaded PDF documents and returns page-by-page markdown.

### Implementation
- `parser-service/main.py`
- `parser-service/pdf_parser.py`
- FastAPI application exposing POST `/parse`
- Supports `application/pdf` uploads only
- Uses `fitz` and `pymupdf4llm` to convert each PDF page into markdown
- Returns:
  - `filename`
  - `pages`: list of `{ page, markdown }`

## Frontend (`frontend/`)

### Application structure
- React + TypeScript + Vite
- Routes in `frontend/src/App.tsx`:
  - `/` landing page
  - `/login` login page
  - `/signup` signup page
  - `/chat` and `/chats` protected chat interface
  - `/admin` protected admin document management page
- Uses `frontend/src/context/AuthContext.tsx` for auth state and token persistence
- Uses `frontend/src/api/client.ts` to manage auth headers, refresh tokens, and API requests

### Auth flow
- `frontend/src/pages/LoginPage.tsx` logs users in and stores auth tokens in local storage
- `frontend/src/pages/SignupPage.tsx` supports both regular user signup and admin signup with secret code
- `frontend/src/api/auth.ts` wraps API calls to `/api/auth`
- `frontend/src/context/AuthContext.tsx` restores sessions and refreshes current user info

### Chat UI
- `frontend/src/pages/ChatPage.tsx` renders the chat interface
- `frontend/src/hooks/useChat.ts` manages session state, message history, and chat sending
- `frontend/src/api/chat.ts` wraps chat API calls:
  - `fetchChatSessions()` — `GET /api/chat/sessions` to load the sidebar and conversation history
  - `postChat(sessionId, message)` — `POST /api/chat`, returns `{ reply, sessionId }`
- Chat data is loaded and persisted through the backend API only (not via direct Supabase reads from the frontend).
- On login, sessions are fetched from the backend and shown in the sidebar (newest first).
- Sending the first message auto-creates a local session; the backend links it to the user in `user_session` and saves messages to `conversations`.
- **New chat** creates an empty local session; the backend creates the `user_session` row when the first message is sent.
- Local state includes multiple sessions, message lists, and loading states

### Admin UI
- `frontend/src/pages/AdminPage.tsx`
- `frontend/src/api/upload.ts` handles listing files and uploading PDFs to `/api/uploadFile/`
- Admin page allows uploading PDF documents and viewing processed documents in the knowledge base

## Overall workflow

1. An admin uploads a PDF from the frontend admin page.
2. The backend forwards the PDF to the parser service.
3. The parser service converts the PDF to markdown pages.
4. The backend chunks the markdown, embeds it, and stores it in Supabase.
5. A logged-in user opens the chat page; the frontend loads their sessions via `GET /api/chat/sessions`.
6. The user sends a chat message; the backend creates or verifies the session in `user_session`, then runs the RAG pipeline.
7. The backend retrieves relevant chunks and conversation history from Supabase.
8. The backend calls an LLM to generate an answer grounded in the uploaded documents.
9. The answer and messages are saved to `conversations`; `{ reply, sessionId }` is returned to the frontend.
10. The frontend updates the conversation window and sidebar; on refresh, history reloads from the backend.

## Notes

- The project is designed for local development with `frontend` on `localhost:5173`, `backend` on `localhost:4000`, and parser service on `localhost:8000`.
- The frontend uses protected routes and token-based auth to secure chat and admin pages.
- The backend enforces admin-only access for uploading and listing files.
- The core value is a document-powered chatbot that can answer questions from uploaded PDF knowledge bases.
