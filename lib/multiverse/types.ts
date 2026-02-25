/**
 * Types for AI Story Orchestrator (Phase 2).
 * Aligns with Supabase tables: story_instances, instance_participants, story_choices, story_state, stories, story_nodes, character_templates.
 */

export type InstanceStatus = "waiting_choices" | "in_progress" | "ended";

export interface StoryInstance {
  id: string;
  story_id: string;
  current_node_key: string;
  status: InstanceStatus;
  created_at: string;
  updated_at: string;
}

export interface InstanceParticipant {
  instance_id: string;
  user_id: string;
  character_name: string;
  joined_at: string;
}

export interface StoryChoice {
  instance_id: string;
  node_key: string;
  user_id: string;
  choice_key: string;
  chosen_at: string;
}

export interface StoryStateRow {
  instance_id: string;
  node_key: string;
  content_snapshot: string | null;
  perspective_content: Record<string, string> | null;
  is_ai_generated: boolean;
  updated_at: string;
}

export interface StoryTemplate {
  id: string;
  title: string;
  description: string;
  context_for_ai: string | null;
  genre: string;
}

export interface StoryNodeRow {
  story_id: string;
  node_key: string;
  title: string;
  content: string;
  choices: Array<{ key: string; text: string; next_node: string }>;
  is_ending: boolean;
}

export interface CharacterTemplateRow {
  name: string;
  description: string;
  secret_profile: string | null;
}

/** AI response schema (strict JSON from OpenAI). */
export interface AIStoryResponse {
  character_perspectives: Record<string, string>;
  narrator_summary: string;
  next_node: string;
}

/** Conversation buffer: last 2–3 nodes for token efficiency. */
export interface BufferNode {
  node_key: string;
  summary: string;
  choices_made?: Record<string, string>;
}

/** Result of progressStoryInstance for Phase 4 (WebSocket payload per user). */
export interface StoryProgressPayload {
  type: "story_progress";
  instance_id: string;
  node_key: string;
  content_for_you: string;
  narrator_summary: string;
  choices: Array<{ key: string; text: string }>;
  is_ending: boolean;
}
