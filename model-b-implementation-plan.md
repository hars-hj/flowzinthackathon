# Multi-Tenant Support Widget Platform — Implementation Plan

**Pattern:** Model B (white-label platform, embeddable iframe widget)
**Session strategy:** Tier 1 (anonymous session_id) + Tier 2 (optional email capture)
**Rendering:** iframe-based widget

---

## 1. High-Level Architecture

```
┌─────────────────────┐         ┌──────────────────────────┐
│  Client Website      │         │   Your Platform            │
│  (e.g. Acme Inc.)    │         │                            │
│                      │         │  ┌──────────────────────┐  │
│  <script              │  loads  │  │  widget.js (loader)   │  │
│   src=".../widget.js" │────────▶│  └──────────┬───────────┘  │
│   data-org="wk_..." > │         │             │ injects       │
│                      │         │             ▼               │
│  ┌────────────────┐  │         │  ┌──────────────────────┐  │
│  │  <iframe>        │◀│─────────│──│  Widget App (React)   │  │
│  │  chat UI here    │  │         │  │  served from your CDN │  │
│  └────────────────┘  │         │  └──────────┬───────────┘  │
└─────────────────────┘         │             │ API calls      │
                                  │             ▼               │
                                  │  ┌──────────────────────┐  │
                                  │  │  Backend API           │  │
                                  │  │  (org_id scoped)       │  │
                                  │  └──────────┬───────────┘  │
                                  │             │               │
                                  │  ┌──────────▼───────────┐  │
                                  │  │  Supabase (Postgres    │  │
                                  │  │  + pgvector + RLS)     │  │
                                  │  └──────────────────────┘  │
                                  │                            │
                                  │  ┌──────────────────────┐  │
                                  │  │  Admin Dashboard        │  │
                                  │  │  (org owners + agents)│  │
                                  │  └──────────────────────┘  │
                                  └──────────────────────────┘
```

---

## 2. Data Model (Supabase / Postgres)

### 2.1 `organizations`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| name | text | |
| widget_key | text, unique | public key, e.g. `wk_live_abc123`, safe to expose client-side |
| plan | text | free / pro etc. (optional for hackathon) |
| created_at | timestamptz | |

### 2.2 `org_users` (admins & agents)
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| org_id | uuid, FK → organizations | |
| user_id | uuid, FK → auth.users (Supabase auth) | |
| role | text | `owner` \| `agent` |
| created_at | timestamptz | |

### 2.3 `documents`
Add `org_id uuid FK` to your existing table.

### 2.4 `chunks` / `embeddings`
Add `org_id uuid FK` — **every vector search query must filter on this.**

### 2.5 `conversations`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| org_id | uuid, FK | |
| session_id | text | Tier 1 identity, always present |
| email | text, nullable | Tier 2, filled when captured |
| status | text | active / escalated / closed |
| created_at | timestamptz | |

### 2.6 `messages`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| conversation_id | uuid, FK | |
| org_id | uuid, FK | denormalized for query speed / RLS |
| sender | text | user / bot / agent |
| content | text | |
| sources | jsonb, nullable | retrieved chunk citations |
| created_at | timestamptz | |

### 2.7 `widget_configs`
| Column | Type | Notes |
|---|---|---|
| org_id | uuid, PK/FK | |
| primary_color | text | |
| bot_name | text | |
| avatar_url | text | |
| welcome_message | text | |
| quick_questions | jsonb | array of strings, max ~4 |
| bubble_position | text | bottom-right / bottom-left |
| show_history_tab | boolean | |
| escalation_enabled | boolean | |
| updated_at | timestamptz | |

### 2.8 Row Level Security (RLS)
Enable RLS on every org-scoped table. Policy pattern:
```sql
create policy org_isolation on documents
  using (org_id = (auth.jwt() ->> 'org_id')::uuid);
```
For widget-facing endpoints (anonymous end-users, no Supabase auth session), enforce `org_id` filtering **in the backend API layer** instead, since the visitor isn't a Supabase-authenticated user. Never trust `org_id` from the client for anything beyond routing — validate the `widget_key` server-side and resolve `org_id` from it on every request.

---

## 3. Widget Embed & Loader (`widget.js`)

### 3.1 Snippet the customer pastes
```html
<script src="https://yourbot.com/widget.js" data-org="wk_live_abc123"></script>
```

### 3.2 What `widget.js` does
1. Read `data-org` from its own `<script>` tag.
2. Fetch `GET /api/widget-config?key=wk_live_abc123` → returns theme, welcome message, quick questions, position, escalation flag.
3. Inject a floating bubble `<button>` at the configured position (bottom-right default) — pure DOM, no framework needed for the bubble itself.
4. On click, inject an `<iframe>`:
   ```html
   <iframe
     src="https://yourbot.com/widget-app?org=wk_live_abc123"
     style="position:fixed; bottom:90px; right:20px; width:380px; height:600px; border:none; z-index:999999;">
   </iframe>
   ```
5. iframe fully isolates CSS/JS from host site — no style bleed either direction.
6. Use `postMessage` for iframe ↔ parent communication (e.g., resizing the iframe, closing it, or the host site calling `identify()` later if you add Tier 3).

### 3.3 The widget app itself (inside the iframe)
- Separate small React app, deployed independently, served at `/widget-app`.
- On load: reads `org` query param → calls backend to resolve `org_id`, fetch config, and check for existing `session_id` in `localStorage` (scoped, see §4).
- Renders: header (bot name/avatar), quick question buttons, chat panel, optional history tab, escalation trigger UI.

---

## 4. Session & Identity Logic (Tier 1 + Tier 2)

### 4.1 Tier 1 — Anonymous session
- On first load, if no `session_id` in `localStorage` (key: `ybot_session_{org_id}`), generate a UUID and store it.
- Every API call sends `{ org_key, session_id }`.
- Backend resolves `org_id` from `org_key`, then finds/creates a `conversations` row keyed on `(org_id, session_id)`.
- Reopening the widget on the same site/browser reloads history automatically — no login.

### 4.2 Tier 2 — Email capture
- Triggered contextually, not on load:
  - When escalation is triggered → "What's your email so our agent can follow up?"
  - Optional "Email me this conversation" button.
- On capture: `PATCH /api/conversations/{id}` sets `email` field, and also store the email in `localStorage` (key: `ybot_email_{org_id}`).
- On future visits: if `ybot_email_{org_id}` exists in localStorage, use it to fetch conversation history by email first (covers cross-device-same-browser-profile case); otherwise fall back to `session_id`.
- Note: true cross-device recovery would require the user to actively re-enter their email (e.g., a "restore my chat" link) since you have no login — that's expected and fine for this tier.

### 4.3 Lookup priority (in order)
1. `email` match (if present)
2. `session_id` match
3. Neither → new conversation

---

## 5. Backend API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/widget-config` | GET | Public, returns theme/config by `widget_key` |
| `/api/chat` | POST | Send message → hybrid search + rerank → LLM response; body includes `org_key, session_id, message` |
| `/api/conversations/:id/email` | PATCH | Attach email to a conversation (Tier 2) |
| `/api/conversations` | GET | Fetch history by `session_id` or `email`, scoped to `org_id` |
| `/api/escalate` | POST | Trigger escalation check → open WebSocket handoff |
| `/api/orgs` | POST | Create new org (signup flow) |
| `/api/orgs/:id/widget-config` | PUT | Admin updates theme/questions (dashboard) |
| `/api/orgs/:id/documents` | POST | Admin uploads doc → chunk → embed → store with `org_id` |
| `/api/orgs/:id/analytics` | GET | Dashboard metrics, scoped to `org_id` |
| `/ws/agent/:conversation_id` | WS | Agent ↔ user live handoff |

All widget-facing endpoints authenticate via `widget_key` (public, rate-limited, org-scoped) — **not** Supabase user auth, since the end-visitor never logs in. All dashboard endpoints authenticate via Supabase auth + `org_users` role check.

---

## 6. Admin Dashboard Changes

1. **Signup flow**: new business signs up → creates `organizations` row + first `org_users` row (`role: owner`) → generates `widget_key` → redirects to onboarding.
2. **Onboarding**: prompt to upload first document(s), then show the embed snippet with `widget_key` pre-filled, copy-to-clipboard button.
3. **Widget Settings page**: form bound to `widget_configs` — color picker, bot name, avatar upload, welcome message, quick questions editor (add/remove, max 4), live preview pane rendering the actual widget app in an iframe with draft values (use `postMessage` to push unsaved changes into the preview iframe before saving).
4. **Documents page**: existing upload UI, just scope all queries by the logged-in admin's `org_id`.
5. **Agent inbox**: existing WebSocket handoff UI, scoped by `org_id`; agents only see conversations from their own org.
6. **Analytics page**: existing metrics, scoped by `org_id`.
7. **Team page** (new, small): owner can invite other agents by email → creates `org_users` row with `role: agent`.

---

## 7. Escalation Flow (unchanged logic, now org-scoped)

1. Separate model flags escalation intent in the conversation.
2. Backend checks: is an email present on this conversation? If not, prompt for it before/while escalating.
3. Backend looks up online agents for this `org_id` only.
4. If an agent is available → open WebSocket room `conversation_id`, agent dashboard gets notified, full message history (including retrieved sources) is passed to the agent view.
5. If no agent online → fallback: create a ticket-like row (`conversations.status = 'escalated_pending'`) + notify org owner by email (simple transactional email is enough for hackathon scope) + tell user "an agent will follow up by email."

---

## 8. Build Order (Suggested Phases)

**Phase 1 — Foundation**
1. Add `organizations`, `org_users`, `widget_configs` tables; add `org_id` to existing tables.
2. Update all existing queries (chat, retrieval, escalation, dashboard) to filter by `org_id`.
3. Replace email-string admin check with `org_users.role` lookup.

**Phase 2 — Widget core**
4. Build `/api/widget-config` endpoint.
5. Build `widget.js` loader (bubble injection + iframe injection).
6. Build widget app (iframe contents): chat UI + quick questions + session_id logic (Tier 1).

**Phase 3 — Identity & history**
7. Add email capture flow at escalation (Tier 2).
8. Add conversation history fetch/display (session_id → email priority) + history tab UI.

**Phase 4 — Dashboard & customization**
9. Signup flow + widget_key generation + embed snippet display.
10. Widget Settings form + live preview.
11. Scope documents/agents/analytics pages by `org_id`.

**Phase 5 — Polish (if time remains)**
12. Feedback (👍/👎) on bot answers.
13. Re-ranking step on retrieval.
14. Ticket/email fallback when no agent online.
15. Team/invite page for adding agents.

---

## 9. Demo Script (for judges)

1. Sign up as a new business → land in onboarding.
2. Upload 2–3 sample docs (e.g., a fake FAQ/policy PDF).
3. Customize widget: set color, bot name, add 3 quick questions. Show live preview.
4. Copy embed snippet → paste into a sample demo HTML page (prepared ahead of time).
5. Open the demo page → click bubble → ask a quick question → show sourced answer with citation.
6. Refresh the page → show chat history persists (session_id).
7. Ask an off-script question that triggers escalation → provide email → show agent-side dashboard receiving the handoff in real time.
8. Switch to analytics tab → show resolution rate / escalation rate for this org.

---

## 10. Key Risks to Flag in Pitch (shows maturity to judges)

- Cross-tenant data isolation is enforced both at the API layer (widget_key → org_id resolution) and DB layer (RLS for authenticated dashboard queries).
- Widget key is public by design (like a Stripe publishable key) — no sensitive operations are possible with it alone; rate limiting per widget_key prevents abuse.
- True cross-device history recovery is a known limitation of Tier 2 (email-only, no login) — call this out proactively as a scoped tradeoff, with Tier 3 (host-site identity passthrough) as the roadmap answer.
