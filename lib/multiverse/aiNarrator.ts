/**
 * AI Narrator: build prompt, call OpenAI, parse JSON with Zod.
 * Conversation buffer (last 2–3 nodes) is used to save tokens.
 */

import OpenAI from "openai";
import { z } from "zod";
import type { AIStoryResponse, BufferNode } from "./types.js";

const AI_RESPONSE_SCHEMA = z.object({
  character_perspectives: z.record(z.string(), z.string()),
  narrator_summary: z.string(),
  next_node: z.string(),
});

const MAX_RETRIES = 2;
const MAX_COMPLETION_TOKENS = 700;

/**
 * Build system prompt for the narrator (story context, secret profiles, current node, buffer, choices).
 */
export function buildSystemPrompt(params: {
  storyContext: string;
  secretProfiles: string;
  currentNodeTitle: string;
  currentNodeContent: string;
  buffer: BufferNode[];
  choicesByCharacter: Record<string, string>;
  preDefinedNextNode: string | null;
  characterNames: string[];
}): string {
  const {
    storyContext,
    secretProfiles,
    currentNodeTitle,
    currentNodeContent,
    buffer,
    choicesByCharacter,
    preDefinedNextNode,
    characterNames,
  } = params;

  const bufferText =
    buffer.length > 0
      ? buffer
          .map(
            (b) =>
              `Node ${b.node_key}: ${b.summary}${
                b.choices_made && Object.keys(b.choices_made).length > 0
                  ? ` Choices: ${Object.entries(b.choices_made)
                      .map(([c, k]) => `${c}–${k}`)
                      .join(", ")}`
                  : ""
              }`
          )
          .join("\n")
      : "Start of story.";

  const choicesText = Object.entries(choicesByCharacter)
    .map(([char, choice]) => `${char} chose: ${choice}`)
    .join(". ");

  return `You are the narrator for a multiverse story. You receive the story template, current scene, and each character's choice. You write the next scene. Output must be valid JSON only — no markdown, no extra text.

Story context: ${storyContext}

Secret profiles (use for inner voice / perspective): ${secretProfiles}

Recent story (last 2–3 nodes): ${bufferText}

Current node: "${currentNodeTitle}". Content: ${currentNodeContent}

This turn's choices: ${choicesText}
${preDefinedNextNode ? `Suggested next node (use if it fits): ${preDefinedNextNode}` : "No pre-defined next node; invent a logical next step (next_node as short slug, e.g. ai_confession)."}

Instructions:
- Write one short paragraph per character perspective (same event, different inner experience). Keys in character_perspectives must be exactly: ${characterNames.join(", ")}.
- Set narrator_summary to 1–2 sentences for the shared scene.
- Set next_node to the suggested key if given and it fits; otherwise invent a short slug. Keep tone and world consistent.
- Output only a single JSON object with keys: character_perspectives, narrator_summary, next_node.`;
}

/**
 * Call OpenAI and parse response. Retries on invalid JSON; validates with Zod.
 */
export async function generateNextScene(params: {
  openai: OpenAI;
  systemPrompt: string;
  model?: string;
}): Promise<AIStoryResponse> {
  const { openai, systemPrompt, model = "gpt-4o-mini" } = params;
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              "Generate the next scene as JSON only (character_perspectives, narrator_summary, next_node).",
          },
        ],
        max_tokens: MAX_COMPLETION_TOKENS,
        temperature: 0.7,
      });

      const raw = completion.choices[0]?.message?.content?.trim();
      if (!raw) throw new Error("Empty OpenAI response");

      const parsed = parseJsonResponse(raw);
      return parsed;
    } catch (e) {
      lastError = e;
      if (attempt === MAX_RETRIES) break;
    }
  }

  return getFallbackResponse(lastError);
}

/**
 * Parse and validate AI response with Zod. Strips markdown code block if present.
 */
export function parseJsonResponse(raw: string): AIStoryResponse {
  let text = raw.trim();
  const codeBlock = text.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  if (codeBlock) text = codeBlock[1].trim();
  const parsed = JSON.parse(text) as unknown;
  return AI_RESPONSE_SCHEMA.parse(parsed) as AIStoryResponse;
}

/**
 * Fallback when retries fail or JSON invalid (Pro-Tip: safe default).
 */
function getFallbackResponse(reason: unknown): AIStoryResponse {
  console.warn("[aiNarrator] Using fallback response:", reason);
  return {
    character_perspectives: {},
    narrator_summary: "গল্পটি সাময়িকভাবে এগিয়ে যাচ্ছে।",
    next_node: "ai_fallback",
  };
}
