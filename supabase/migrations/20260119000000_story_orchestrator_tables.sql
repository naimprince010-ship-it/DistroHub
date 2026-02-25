-- ============================================================
-- AI Story Orchestrator — Phase 1: Database tables
-- ============================================================
-- Creates: story_instances, instance_participants, story_choices, story_state
-- Run after stories, story_nodes, character_templates exist (and add_genre if used).
-- ============================================================

-- 1. story_instances: one row per active game
CREATE TABLE IF NOT EXISTS public.story_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id text NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  current_node_key text NOT NULL DEFAULT 'start',
  status text NOT NULL DEFAULT 'waiting_choices'
    CHECK (status IN ('waiting_choices', 'in_progress', 'ended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_story_instances_story_id ON public.story_instances(story_id);
CREATE INDEX IF NOT EXISTS idx_story_instances_status ON public.story_instances(status);

-- 2. instance_participants: who is in which instance (user_id → character_name)
CREATE TABLE IF NOT EXISTS public.instance_participants (
  instance_id uuid NOT NULL REFERENCES public.story_instances(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  character_name text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (instance_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_instance_participants_user_id ON public.instance_participants(user_id);

-- 3. story_choices: per-node choices (who chose what)
CREATE TABLE IF NOT EXISTS public.story_choices (
  instance_id uuid NOT NULL REFERENCES public.story_instances(id) ON DELETE CASCADE,
  node_key text NOT NULL,
  user_id uuid NOT NULL,
  choice_key text NOT NULL,
  chosen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (instance_id, node_key, user_id)
);

CREATE INDEX IF NOT EXISTS idx_story_choices_instance_node ON public.story_choices(instance_id, node_key);

-- 4. story_state: snapshot for resume/refresh (content per node, perspective per character)
CREATE TABLE IF NOT EXISTS public.story_state (
  instance_id uuid NOT NULL REFERENCES public.story_instances(id) ON DELETE CASCADE,
  node_key text NOT NULL,
  content_snapshot text,
  perspective_content jsonb,
  is_ai_generated boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (instance_id, node_key)
);

CREATE INDEX IF NOT EXISTS idx_story_state_instance ON public.story_state(instance_id);

-- Optional: AI context columns (add if tables exist)
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS context_for_ai text;

ALTER TABLE public.character_templates
  ADD COLUMN IF NOT EXISTS secret_profile text;

-- updated_at trigger for story_instances
CREATE OR REPLACE FUNCTION public.set_story_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS story_instances_updated_at ON public.story_instances;
CREATE TRIGGER story_instances_updated_at
  BEFORE UPDATE ON public.story_instances
  FOR EACH ROW EXECUTE FUNCTION public.set_story_instances_updated_at();

-- RLS: enable (policies can be tightened per project)
ALTER TABLE public.story_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instance_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_state ENABLE ROW LEVEL SECURITY;

-- Basic policies: allow read/write for authenticated users (adjust as needed)
CREATE POLICY "Allow read story_instances" ON public.story_instances FOR SELECT USING (true);
CREATE POLICY "Allow insert story_instances" ON public.story_instances FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update story_instances" ON public.story_instances FOR UPDATE USING (true);

CREATE POLICY "Allow read instance_participants" ON public.instance_participants FOR SELECT USING (true);
CREATE POLICY "Allow insert instance_participants" ON public.instance_participants FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read story_choices" ON public.story_choices FOR SELECT USING (true);
CREATE POLICY "Allow insert story_choices" ON public.story_choices FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read story_state" ON public.story_state FOR SELECT USING (true);
CREATE POLICY "Allow insert story_state" ON public.story_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update story_state" ON public.story_state FOR UPDATE USING (true);
