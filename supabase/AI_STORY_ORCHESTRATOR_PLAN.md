# AI-Driven Story Orchestrator — Implementation Plan

## Overview

**Goal:** A backend function `progressStoryInstance(instanceId)` that:
1. Has **context awareness**: StoryTemplate, CurrentNode, SecretProfiles of assigned users.
2. **Auto-progresses** when all users have chosen or a timer expires: analyze choices → call OpenAI → generate dynamic paragraph **per character perspective**.
3. **Branches** when choices don’t match a pre-defined node: AI invents a consistent new branch.
4. Updates **story_state** in DB and pushes new content to users via **WebSockets**.

---

## Actionable Execution Strategy (Step-by-Step for Cursor)

Cursor দিয়ে বাস্তবায়ন শুরুর জন্য নিচের প্রম্পটগুলো **অনুক্রমে** ব্যবহার করুন।

### Step 1 — ডাটাবেজ সেটআপ (Phase 1)

Cursor-কে বলুন:

> **"Read `supabase/AI_STORY_ORCHESTRATOR_PLAN.md`. Based on Phase 1, generate a Prisma schema for `story_instances`, `instance_participants`, `story_choices`, and `story_state`. Make sure the relationships between them are correctly mapped for a PostgreSQL DB."**

(যদি Prisma ব্যবহার না করেন এবং শুধু Supabase SQL ব্যবহার করেন, তাহলে বলুন: *"Generate Supabase migration SQL for these four tables instead of Prisma schema."*)

### Step 2 — কোর লজিক (Phase 2 & 3)

ডাটাবেজ রেডি হলে:

> **"Now implement Phase 2 & 3 from `supabase/AI_STORY_ORCHESTRATOR_PLAN.md`. Write the `progressStoryInstance(instanceId)` function in Node.js/TypeScript. It should load data from the DB, prepare the prompt for OpenAI GPT-4, and parse the JSON output as specified in the plan. Ensure the Conversation Buffer logic (last 2–3 nodes summary) is applied to save tokens."**

### Step 3 — রিয়েল-টাইম ডেলিভারি (Phase 4)

> **"Implement Phase 4 from the plan using Socket.io or Supabase Realtime. When the AI generates content, each participant must ONLY receive their specific `character_perspective` along with shared fields (`narrator_summary`, `choices`, `is_ending`). Use the `instance_participants` table to filter and send the correct payload per user."**

---

## Visual Logic Map

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                  STORY ORCHESTRATOR FLOW                 │
                    └─────────────────────────────────────────────────────────┘

  ┌──────────────┐     ┌──────────────────┐     ┌─────────────────────────────┐
  │ User A/B/C   │     │ Submit Choice    │     │ All choices in OR           │
  │ submit       │────▶│ API               │────▶│ timer expired?              │
  │ choice       │     │ (story_choices)   │     └──────────────┬──────────────┘
  └──────────────┘     └──────────────────┘                    │
                                                                ▼ Yes
                    ┌─────────────────────────────────────────────────────────┐
                    │           progressStoryInstance(instanceId)              │
                    └─────────────────────────────────────────────────────────┘
                                         │
         ┌───────────────────────────────┼───────────────────────────────┐
         ▼                               ▼                               ▼
  ┌──────────────┐              ┌─────────────────┐              ┌──────────────┐
  │ Load:        │              │ Resolve         │              │ Build        │
  │ instance,    │──────────────│ next_node       │──────────────│ buffer       │
  │ template,    │              │ (pre-defined OR  │              │ (2–3 nodes)   │
  │ node,        │              │ ai_branch)      │              │ + prompt     │
  │ choices      │              └────────┬────────┘              └──────┬───────┘
  └──────────────┘                       │                              │
         │                                │                              │
         └────────────────────────────────┼──────────────────────────────┘
                                          ▼
                               ┌─────────────────────┐
                               │ OpenAI API          │
                               │ (system + buffer +  │
                               │  choices)           │
                               └──────────┬──────────┘
                                          │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
             ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
             │ Parse JSON  │     │ Retry/Zod   │     │ On fail:     │
             │ (perspectives,│     │ validate   │     │ Idle/Neutral│
             │  next_node) │     │ or retry    │     │ fallback    │
             └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
                    │                   │                   │
                    └───────────────────┼───────────────────┘
                                        ▼
                    ┌───────────────────────────────────────────┐
                    │ UPDATE DB: story_instances.current_node_key│
                    │           story_state (perspective_content)│
                    │           status = ended if is_ending      │
                    └───────────────────┬───────────────────────┘
                                        ▼
                    ┌───────────────────────────────────────────┐
                    │ WebSocket: per user                       │
                    │   → content_for_you = perspectives[char]   │
                    │   → narrator_summary, choices, is_ending   │
                    │   (use instance_participants to filter)     │
                    └───────────────────┬───────────────────────┘
                                        ▼
                    ┌───────────────────────────────────────────┐
                    │ Client: render content_for_you + choices   │
                    │ Reconnect? → fetch story_state + character │
                    └───────────────────────────────────────────┘
```

**সংক্ষেপ:** Choice submit → All in / Timer → progressStoryInstance → Load → Resolve next_node → Buffer + Prompt → OpenAI → Parse/Validate/Retry → Update DB → WebSocket per user → Client render; reconnect হলে story_state থেকে রিকভার।

---

## Phase 1: Database & State

### 1.1 Tables (Supabase)

| Table | Purpose |
|-------|--------|
| `story_instances` | One row per active game: `id`, `story_id`, `current_node_key`, `status` (waiting_choices \| in_progress \| ended), `created_at`, `updated_at`. |
| `instance_participants` | Who is in which instance: `instance_id`, `user_id`, `character_name` (e.g. আবির, নীলা), `joined_at`. |
| `story_choices` | Per-node choices: `instance_id`, `node_key`, `user_id` (or `character_name`), `choice_key` (e.g. "flower"), `chosen_at`. |
| `story_state` | Snapshot for resume/refresh: `instance_id`, `node_key`, `content_snapshot` (JSON or text), `perspective_content` (JSON: `{ "আবির": "...", "নীলা": "..." }`), `updated_at`. Optionally `is_ai_generated` (boolean). |
| Existing | `stories`, `character_templates`, `story_nodes` — already used for template + pre-defined nodes. |

**Optional for AI:**  
- `stories.context_for_ai` (text) — story setting / narrator instructions.  
- `character_templates.secret_profile` (text) — for system prompt only.

### 1.2 State Machine (current_node_key)

- **Pre-defined branch:** User choices map to a `story_nodes.node_key` → set `current_node_key` to that, load `content` and `choices` from `story_nodes`.
- **AI branch:** No matching node → create a “virtual” step: store in `story_state` with `is_ai_generated = true`, and set `current_node_key` to something like `ai_branch_<timestamp>` or a slug. Next turn can again try to match a pre-defined node or generate again.

---

## Phase 2: progressStoryInstance(instanceId) — Core Flow

### 2.1 Trigger Conditions

- **When:** All participants have a row in `story_choices` for the current `node_key`, **or** a per-node timer has expired (e.g. 60s).
- **Who calls:**  
  - After each “submit choice” API.  
  - From a cron/job that checks “instances where status = waiting_choices and (all choices in OR timer expired)”.

### 2.2 Function Steps (Pseudocode)

```
1. Load instance: story_id, current_node_key, participants (user_id → character_name).
2. Load story template: story context (context_for_ai or description), genre.
3. Load current node: title, content, choices (from story_nodes if pre-defined).
4. Load user choices for current_node_key from story_choices (character → choice_key).
5. Resolve next node:
   a. If choices match a single pre-defined next_node (e.g. all chose same, or majority) → use that node_key.
   b. Else → "ai_branch" (AI will generate content and we store in story_state).
6. Build conversation buffer (token efficiency):
   - Last 2–3 nodes: node_key + short summary (1–2 sentences) + choices made.
   - Do NOT send full story history every time.
7. Build system prompt (see 3.1).
8. Call OpenAI with system prompt + buffer + current choices; ask for JSON (see 3.2).
9. Parse JSON: character-specific texts + next_node suggestion (if AI branch).
10. Update DB:
    - story_instances.current_node_key = next_node (pre-defined or ai_branch_xxx).
    - story_state: insert/update row for (instance_id, next_node) with perspective_content and content_snapshot.
    - If next node is ending (is_ending = true): story_instances.status = 'ended'.
11. Push to clients via WebSocket (see Phase 4): per-user payload with their perspective text + next_node + choices.
```

---

## Phase 3: AI Integration

### 3.1 System Prompt (Template)

- **Role:** “You are the narrator for a multiverse story. You receive the story template, current scene, and each character’s choice. You write the next scene. Output must be valid JSON only.”
- **Story context:** From `stories.context_for_ai` or `stories.description` (e.g. “বৃষ্টির বিকাল, ক্যাফে, আবির ও নীলার দেখা হবেই…”).
- **Secret profiles:** From `character_templates.secret_profile` (e.g. “আবির: লাজুক… নীলাকে চেনে কিন্তু কখনো কথা বলেনি.”).
- **Current node:** Title + short content summary.
- **Conversation buffer:** Last 2–3 nodes summary (e.g. “Node start: তারা ক্যাফেতে বসে। Node first_words: কেউ প্রথম কথা বলল। Choices: আবির–flower, নীলা–coffee.”).
- **This turn’s choices:** “Character A chose X, Character B chose Y.”
- **Instructions:** “Write one short paragraph per character perspective (same event, different inner experience). If the choices lead to a pre-defined next node, set next_node to that key; otherwise invent a logical next step and set next_node to a short slug. Keep tone and world consistent.”

### 3.2 JSON Response Format (Strict)

Ask the model to return **only** JSON, no markdown:

```json
{
  "character_perspectives": {
    "আবির": "আপনি দেখলেন নীলা আপনার দিকে তাকিয়ে হাসছে।",
    "নীলা": "আপনি আবিরের দিকে তাকিয়ে হাসলেন, কিন্তু মনে মনে আপনি ভয় পাচ্ছেন।",
    "তানভীর": "আপনি দুজনের দিকে তাকিয়ে মনে মনে খুশি।"
  },
  "narrator_summary": "ক্যাফেতে একটা নীরব মুহূর্ত কাটে।",
  "next_node": "tension"
}
```

- **next_node:** Either a key from `story_nodes` (e.g. `tension`, `ending_together`) or an AI-invented slug (e.g. `ai_rain_confession`). If pre-defined, next step can load choices from DB; if AI-only, next step can again call AI or map to a pre-defined node later.

### 3.3 Token Efficiency

- **Conversation buffer:** Store last 2–3 nodes as structured summary (e.g. `[{ "node_key": "start", "summary": "..." }, { "node_key": "first_words", "summary": "..." }]`). Send only this to the model, not full history.
- **Template:** Send once per request: story context + secret profiles (short) + current node + buffer + current choices.
- **Max tokens:** Cap completion (e.g. 500–800) so response stays one scene.

---

## Phase 4: WebSocket Delivery

### 4.1 When to Push

- After `progressStoryInstance` has updated `story_state` and `current_node_key`.

### 4.2 Payload Per User

Send each user **only their** perspective text (and shared metadata):

```json
{
  "type": "story_progress",
  "instance_id": "...",
  "node_key": "tension",
  "content_for_you": "আপনি দেখলেন নীলা আপনার দিকে তাকিয়ে হাসছে।",
  "narrator_summary": "ক্যাফেতে একটা নীরব মুহূর্ত কাটে।",
  "choices": [ { "key": "confess", "text": "সত্যি বলো" }, { "key": "hold", "text": "চেপে রাখো" } ],
  "is_ending": false
}
```

- **content_for_you:** From `character_perspectives[character_name]` for that user.
- **choices:** From `story_nodes` for `node_key` if pre-defined; else from AI JSON if you store “next turn choices” in `story_state`.

### 4.3 Channel

- One room per instance: e.g. `story_instance:<instance_id>`. On join, server sends latest `story_state` for that instance so refresh works.

---

## Phase 5: Branching Logic (Pre-defined vs AI)

### 5.1 Matching Choices to Next Node

- **Single choice per node (everyone picks one option):**  
  Each option in `story_nodes.choices` has `next_node`. If all users picked the same choice → use that `next_node`. If different → use “majority” or treat as **no match** → AI branch.

- **Multi-choice / mixed:**  
  Define a small rule set (e.g. “if any chose ‘confess’ → go to ending_together”) or default to **AI branch** when no rule matches.

### 5.2 AI-Generated Branch

- **Storage:** `story_state` row with `node_key = ai_branch_<id>`, `content_snapshot` = narrator_summary, `perspective_content` = character_perspectives, `is_ai_generated = true`.
- **Next turn:** When progressing again, treat this node like any other: collect choices (you may need to define “virtual” choices for AI nodes, e.g. “continue” / “speak” / “leave”), then either map to a pre-defined node or generate again.

---

## Phase 6: Implementation Checklist

### Backend (Node/Next.js or Python)

- [ ] **DB migrations:** `story_instances`, `instance_participants`, `story_choices`, `story_state` (+ optional `context_for_ai`, `secret_profile`).
- [ ] **API:** `POST /api/multiverse/instances/:instanceId/choices` — record choice, then check “all in?” → call `progressStoryInstance(instanceId)`.
- [ ] **API:** `POST /api/multiverse/instances/:instanceId/progress` (optional) — manual/cron trigger for `progressStoryInstance`.
- [ ] **progressStoryInstance(instanceId):**
  - [ ] Load instance, template, current node, participants, choices.
  - [ ] Resolve next_node (pre-defined or ai_branch).
  - [ ] Build buffer (last 2–3 nodes).
  - [ ] Build system prompt; call OpenAI; parse JSON.
  - [ ] Update `story_instances.current_node_key`, `story_state`, status if ended.
  - [ ] Emit WebSocket event per user with `content_for_you` + choices.
- [ ] **Timer:** Cron or in-memory scheduler: “for instances in waiting_choices, if timeout → progressStoryInstance”.

- [ ] **Resilience (Pro-Tips):** JSON parse fail → Retry + Zod; late choice → Idle/Neutral; state recovery on reconnect.

### AI

- [ ] System prompt template (story context, secret profiles, buffer, choices).
- [ ] JSON response schema and validation (character_perspectives, narrator_summary, next_node).
- [ ] Token limits and buffer size (e.g. 2–3 nodes).

### WebSocket

- [ ] Room per instance: `story_instance:<id>`.
- [ ] On `story_progress`: send each user their payload (`content_for_you` + shared fields).
- [ ] On connect: send latest `story_state` for that instance.

### Frontend

- [ ] On receiving `story_progress`: update UI with `content_for_you`, narrator summary, and choices; if `is_ending`, show ending screen.

---

## File / Module Suggestions

| Component | Suggested location |
|-----------|--------------------|
| DB migrations | `supabase/migrations/` (e.g. `xxxx_story_orchestrator.sql`) |
| progressStoryInstance | `lib/multiverse/progressStoryInstance.ts` or `services/story_orchestrator.py` |
| OpenAI call + prompt builder | `lib/multiverse/aiNarrator.ts` or `services/ai_narrator.py` |
| WebSocket emit | Existing WS server (e.g. `socket.emit('story_progress', payload)` per user) |
| Choice submission API | `app/api/multiverse/instances/[instanceId]/choices/route.ts` (or equivalent) |

---

## Summary

- **Context:** StoryTemplate + CurrentNode + SecretProfiles + last 2–3 nodes (buffer).
- **Auto-progression:** When all chosen or timer expires → analyze choices → OpenAI → JSON (per-character text + next_node).
- **Branching:** Pre-defined `next_node` if match; else AI branch stored in `story_state`.
- **State:** `story_instances.current_node_key` + `story_state` (perspective_content, content_snapshot).
- **Delivery:** WebSocket per user with `content_for_you` and shared `choices` / `is_ending`.

This plan gives Cursor (or any dev) a clear path to implement the AI Story Orchestrator end-to-end.

---

## Pro-Tips (প্ল্যানে যোগ করার জন্য)

### 1. Error Handling — JSON Fail

এআই মাঝে মাঝে ভুল বা অসম্পূর্ণ JSON দিতে পারে। নিচের যেকোনো একটা (বা দুটো) ব্যবহার করুন:

- **Retry logic:** পার্স করার পর যদি JSON invalid হয়, একই প্রম্পট দিয়ে আবার ১–২ বার কল করুন; প্রতিবার user message-এ লিখুন: "Output must be valid JSON only. No markdown, no extra text."
- **Zod (বা অন্যান্য) validation:** AI রেসপন্স আসার পর একটা schema দিয়ে validate করুন। ফেইল করলে retry অথবা fallback (নিচে) চালান।

**Fallback:** যদি কয়েকবার retry-র পরও valid JSON না আসে, তাহলে একটি নিরাপদ ডিফল্ট ব্যবহার করুন — যেমন `narrator_summary: "গল্পটি সাময়িকভাবে এগিয়ে যাচ্ছে।"` এবং প্রতিটি চরিত্রের জন্য একই সাধারণ টেক্সট অথবা pre-defined node থেকে একটা নিরাপদ নোডে নিয়ে যান।

### 2. Edge Case — Late Choice (কেউ চয়েস না দিলে)

যদি টাইমার ফুরিয়ে যায় কিন্তু একজন বা একাধিক ইউজার চয়েস না দেয়:

- ওই ইউজারদের জন্য **"Idle"** বা **"Neutral"** চয়েস ধরে নিয়ে গল্প এগিয়ে নিন।
- লজিক: `story_choices`-এ যাদের row নেই, তাদের জন্য একটি ডিফল্ট `choice_key` insert করুন (যেমন `idle` বা `neutral`) এবং সেই অনুযায়ী next_node সিদ্ধান্ত নিন (যেমন সবচেয়ে নিরপেক্ষ শাখা, অথবা AI-কে বলুন "Character X did not choose; treat as neutral and write the next scene.")।
- UI-তে ওই ইউজারকে দেখাতে পারেন: "আপনি সময়ের মধ্যে চয়েস দেননি; গল্প নিরপেক্ষভাবে এগিয়েছে।"

### 3. State Recovery (ডিসকানেক্ট পরে ফিরে আসা)

ইউজার ইন্টারনেট ছেড়ে আবার কানেক্ট করলে যেন সেই মাল্টিভার্সের বর্তমান স্টেট এবং তার সিক্রেট ক্যারেক্টার তথ্য সাথে সাথে ফিরে পায়:

- **On (re)connect:** ক্লায়েন্ট যেই `instance_id` ও `user_id` দিয়ে জয়েন করবে, সার্ভার সেই instance-এর জন্য `story_instances.current_node_key` এবং `story_state` (ওই node_key-এর row) ফেরত দেবে।
- **Payload:** `instance_participants` থেকে ওই user-এর `character_name` নিয়ে, `story_state.perspective_content[character_name]` থেকে শুধু তার `content_for_you` দিন; সাথে shared ফিল্ড (narrator_summary, choices, is_ending)।
- **ফল:** ইউজার রিফ্রেশ বা রিকানেক্ট করলেও একই পেজে, তার চরিত্রের দৃষ্টিকোণ সহ, গল্পের সেই জায়গায় ফিরে আসবে।

---

## Cursor কীভাবে কাজটা করবে (Quick Reference)

1. **System prompting:** একটা জটিল প্রম্পট বানাবে: “You are the narrator. Character A chose X, Character B chose Y. Write the next scene; keep tone consistent. Output only valid JSON.”
2. **State machine:** `story_instances.current_node_key` ও `story_state` টেবিল আপডেট করবে যাতে রিফ্রেশ করলেও ইউজার সেই জায়গায় ফিরে আসে।
3. **Perspective rendering:** একই ঘটনার জন্য আলাদা টেক্সট — ইউজার A (আবির) পাবে “আপনি দেখলেন নীলা আপনার দিকে তাকিয়ে হাসছে”, ইউজার B (নীলা) পাবে “আপনি আবিরের দিকে তাকিয়ে হাসলেন, কিন্তু মনে মনে আপনি ভয় পাচ্ছেন” — এটা `character_perspectives` JSON থেকে নিয়ে WebSocket এ শুধু ওই ইউজারের টেক্সট পাঠাবে।
4. **Token efficiency:** পুরো গল্প বারবার এআই-কে পাঠাবে না; শুধু **গত ২–৩ নোডের সামারি** (Conversation Buffer Memory) পাঠাবে।
5. **JSON response:** এআই সবসময় JSON আউটপুট দেবে: `{ "character_perspectives": { "আবির": "...", "নীলা": "..." }, "narrator_summary": "...", "next_node": "..." }` — কোড দিয়ে parse করে DB ও WebSocket এ ব্যবহার করবে।
