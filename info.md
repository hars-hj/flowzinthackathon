# Flowzinthackathon Project Overview

## Purpose

This repository implements a full-stack knowledge-based chatbot application called NexaSupport.
It combines:
- a React frontend for authentication, chat sessions, and admin document upload
- an Express backend for auth, chat, and file ingestion
- a Python parser service to extract text from uploaded PDFs
- a RAG (Retrieval-Augmented Generation) pipeline using embeddings and LLM chat completion
- a multi-tenant organization model, where each admin account creates and owns an organization with its own widget key, widget configuration, and agents

## Backend (`backend/`)

### Entry point
- `backend/src/index.ts`
- Sets up an Express server on port `4000`
- Enables CORS for `http://localhost:5173`
- Mounts API routers:
  - `/api/auth` for authentication
  - `/api/chat` for chatbot queries
  - `/api/uploadFile` for PDF uploads and document management
  - `/api/settings` for organization settings, widget configuration, and widget key management
  - `/api/agents` for admin-managed agent accounts

### Authentication
- `backend/src/routes/authRouter.ts`
- `backend/src/controllers/auth.controller.ts`
- Uses Supabase auth via `backend/lib/supabaseClient.ts`
- Supports:
  - admin registration (`/api/auth/admin/register`) — creates a new organization and its first admin account (see **Organizations** below); this is now the only public signup path
  - login (`/api/auth/login`) — returns the user's profile role and their organization membership (`org_id`, org name, `widget_key`, `plan`, org-level role)
  - token refresh (`/api/auth/refresh`)
  - current user info (`/api/auth/me`)
- `backend/src/middleware/auth.middleware.ts` verifies JWTs using Supabase JWKS and attaches user info to requests.
- `backend/src/middleware/role.middleware.ts` enforces admin-only and authenticated-user access.
- Standalone user self-registration and the shared `ADMIN_REGISTRATION_SECRET` code have been removed. Admin accounts are created as part of organization creation, and all other org members (agents) are created by an existing admin rather than signing up themselves.

### Organizations and multi-tenancy
- Tables: `organizations`, `organization_members`
- `organizations`
  - `id` (uuid, primary key — referred to as `org_id` elsewhere)
  - `name`
  - `widget_key` (text, format `wk_live_<uuid>`) — public identifier embedded in the client-side install script tag
  - `plan`
  - `created_at`
- `organization_members`
  - `id`, `org_id` (references `organizations.id`), `user_id` (references the Supabase auth user), `role` (`admin` | `agent`), `created_at`
  - `role` here is the org-scoped role and is separate from the global `profiles.role` set during account creation
- Signing up (`POST /api/auth/admin/register`) with `{ email, password, organizationName }`:
  1. Creates a row in `organizations` with a freshly generated `widget_key`
  2. Creates the Supabase auth user
  3. Sets `profiles.role` to `admin`
  4. Inserts an `organization_members` row linking the new user to the new org with `role: 'admin'`
  4. If any step after org creation fails, the organization row is rolled back to avoid orphaned orgs
- Every other org-scoped resource (widget config, agents, widget key) is looked up through the caller's `organization_members` row rather than a request parameter, so admins only ever act on their own organization.

### Settings and widget configuration
- `backend/src/routes/settingsRouter.ts` → mounted at `/api/settings`
- `backend/src/controllers/settingsController.ts`
- Table: `widget_configs` (one row per `org_id`) — `primary_color`, `bot_name`, `avatar_url`, `welcome_message`, `quick_questions` (jsonb array), `bubble_position`, `show_history_tab`, `escalation_enabled`, `updated_at`
- All endpoints require an authenticated admin (verified via the caller's `organization_members` row):
  - `GET /api/settings` — returns the caller's `organization` (including `widget_key`) and current `widget_configs` row (`null` if not yet configured)
  - `PUT /api/settings/widget-config` — upserts the `widget_configs` row for the caller's org (keyed on `org_id`)
  - `POST /api/settings/regenerate-key` — generates a new `wk_live_<uuid>` and overwrites `organizations.widget_key`; any previously installed script tag using the old key stops working immediately
- The widget key is treated as a public, non-secret identifier (it ships in client-side HTML), not an access credential — access control for widget requests happens on the backend, not by hiding the key.

### Agents
- Agents are org members with `organization_members.role = 'agent'`, used for ticket handling.
- `backend/src/controllers/agentController.ts` — `POST /api/agents` (admin-only)
  1. Confirms the caller is an admin and resolves their `org_id` from `organization_members`
  2. Creates a Supabase auth user for the agent (`email`, `password`)
  3. Sets `profiles.role` to `agent`
  4. Inserts an `organization_members` row for the new user with `role: 'agent'` under the admin's org
- Agents cannot self-register; accounts are created exclusively by an admin from the admin panel.

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
- `ADMIN_REGISTRATION_SECRET` is no longer used now that admin signup creates an organization directly instead of being gated by a shared secret.

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
  - `/signup` admin/organization signup page
  - `/chat` and `/chats` protected chat interface
  - `/admin` protected admin document management page (Knowledge base)
  - `/settings` protected admin settings page (widget install snippet, widget configuration, key regeneration)
  - `/dashboard` protected tickets page
  - `/analytics` protected analytics page
- Uses `frontend/src/context/AuthContext.tsx` for auth state and token persistence
- Uses `frontend/src/api/client.ts` (`apiFetch`) to manage auth headers, token refresh-and-retry on `401`, and JSON parsing for all API requests

### Auth flow
- `frontend/src/pages/LoginPage.tsx` logs users in and stores auth tokens in local storage
- `frontend/src/pages/SignupPage.tsx` creates a new organization and its admin account in one step — fields are organization name, email, and password. Self-service user signup and the admin-secret-code field have been removed.
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
- `frontend/src/pages/AdminPage.tsx` — Knowledge base page for uploading and listing PDF documents
- `frontend/src/api/upload.ts` handles listing files and uploading PDFs to `/api/uploadFile/`
- Admin header nav links to Analytics, Tickets, and Settings, plus logout

### Settings UI
- `frontend/src/pages/SettingsPage.tsx` — admin-only page with two sections:
  - **Install widget** — displays the `<script>` embed tag built from the org's `widget_key`, with copy-to-clipboard and a "Regenerate key" action (confirmation required, since it invalidates the previous script tag)
  - **Widget configuration** — form for `bot_name`, `primary_color`, `avatar_url`, `welcome_message`, `quick_questions` (add/remove list), `bubble_position`, `show_history_tab`, `escalation_enabled`, saved via a single "Save configuration" action
- `frontend/src/api/settings.ts` wraps API calls to `/api/settings`:
  - `getSettings()` — `GET /api/settings`, returns `{ organization, widgetConfig }`
  - `updateWidgetConfig(config)` — `PUT /api/settings/widget-config`
  - `regenerateWidgetKey()` — `POST /api/settings/regenerate-key`
- Styling matches `AdminPage.tsx` (same header/footer shell, `border-border` / `bg-surface` / `text-text-*` / `bg-accent` tokens, `font-ui` typography) so Settings feels like a native part of the admin panel rather than a bolted-on page.

## Overall workflow

1. An admin signs up, creating both an organization (with a generated `widget_key`) and their own admin account in one step.
2. The admin uploads a PDF from the Knowledge base page; the backend forwards it to the parser service, which converts it to markdown pages.
3. The backend chunks the markdown, embeds it, and stores it in Supabase.
4. The admin visits Settings to copy the install script tag (containing their `widget_key`) onto their site, and optionally customizes widget behavior (bot name, colors, welcome message, quick questions, etc.) via widget configuration.
5. The admin can create agent accounts from the admin panel; agents are added to the organization with an `agent` role for handling tickets.
6. A logged-in user opens the chat page; the frontend loads their sessions via `GET /api/chat/sessions`.
7. The user sends a chat message; the backend creates or verifies the session in `user_session`, then runs the RAG pipeline.
8. The backend retrieves relevant chunks and conversation history from Supabase.
9. The backend calls an LLM to generate an answer grounded in the uploaded documents.
10. The answer and messages are saved to `conversations`; `{ reply, sessionId }` is returned to the frontend.
11. The frontend updates the conversation window and sidebar; on refresh, history reloads from the backend.

## Notes

- The project is designed for local development with `frontend` on `localhost:5173`, `backend` on `localhost:4000`, and parser service on `localhost:8000`.
- The frontend uses protected routes and token-based auth to secure chat and admin pages.
- The backend enforces admin-only access for uploading and listing files, managing settings/widget configuration, regenerating the widget key, and creating agent accounts.
- Every admin-scoped backend endpoint resolves the organization from the authenticated caller's `organization_members` row rather than trusting a client-supplied org id, so admins can only ever read or modify their own organization's data.
- The core value is a document-powered chatbot that can answer questions from uploaded PDF knowledge bases, deployed per-organization via an embeddable widget.