# Backend Progress

## Completed work

- Created a TypeScript backend structure under `backend/`.
- Added `index.ts` with Express setup and `/api/chat` route wiring.
- Created `routes/chatRoutes.ts` and `controllers/chatbotController.ts`.
- Added `lib/supabaseClient.ts` to initialize the Supabase client from environment variables.
- Implemented session-based conversation memory using `sessionId`.
- Integrated a RAG pipeline in `src/controllers/ragService.ts`.
- Implemented document chunk embedding support in `src/controllers/embeddingService.ts`.
- Connected Google Gemini embeddings via `@google/genai`.
- Connected LLM chat completions through `groq-sdk`.
- Added Supabase vector search using the `match_chunks` RPC for retrieval.

## Current RAG pipeline

- `chat(sessionId, question)` in `src/controllers/ragService.ts` is the main pipeline entry point.
- The user question is embedded with Gemini (`gemini-embedding-001`).
- Relevant chunks are retrieved from Supabase vector search using `match_chunks`.
- Recent conversation history is fetched from the `conversations` table and sorted chronologically.
- The user message is saved before answer generation and the assistant response is saved afterward.
- The answer is generated via GROQ chat completions using a system prompt that includes retrieved chunk context and session history.
- The system prompt enforces answering only from provided document context and returning a safe fallback if the answer is not present.

## Document embedding pipeline

- `src/controllers/embeddingService.ts` embeds document chunks with Gemini.
- Each chunk includes `content` and metadata such as `filename`, `chunkIndex`, and `page`.
- The embedding service returns vectors ready for storage in the database.

## API behavior

- `POST /api/chat` accepts `sessionId` and `question`.
- `src/controllers/chatbotController.ts` forwards requests to `chat(sessionId, question)`.
- The endpoint returns JSON with `reply`.

## Next steps

- Persist chunk embeddings and metadata in Supabase.
- Add robust error handling for Supabase and model API calls.
- Add validation for incoming request payloads.
- Add unit and integration tests for the RAG pipeline.
- Add prompt tuning and fallback handling for out-of-context queries.