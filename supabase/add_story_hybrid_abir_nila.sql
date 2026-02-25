-- ============================================================
-- হাইব্রিড স্টোরি টেমপ্লেট উদাহরণ: আবির আর নীলার বৃষ্টির বিকাল
-- ============================================================
-- ডাটাবেজে টেস্ট করার জন্য। পরে এআই সিস্টেম প্রম্পটে ব্যবহার করবেন।
-- আগে add_genre_to_stories.sql চালানো থাকতে হবে।
--
-- [এআই প্রম্পটে ব্যবহারের জন্য — DB কলাম না থাকলে কোথাও কপি করে রাখুন]
-- প্রেক্ষাপট: বৃষ্টির বিকাল। একটা ক্যাফে। আবির ও নীলার দেখা হবেই (গল্পের গন্তব্য),
--    কিন্তু কীভাবে হবে, কে প্রথম কথা বলবে, কে ফুল কিনবে — সেটা ইউজার সিদ্ধান্তে।
-- সিক্রেট প্রোফাইল (চরিত্র অনুযায়ী):
--   আবির: লাজুক, গান ভালোবাসে, নীলাকে আগে থেকেই চেনে কিন্তু কখনো কথা বলেনি।
--   নীলা: চঞ্চল, ফটোগ্রাফি, বৃষ্টি পছন্দ, আবিরকে একবার দূর থেকে দেখেছিল।
--   তানভীর: দুইজনের বন্ধু, জানেন দুজনের মন; চান তারা কথা বলুক।
-- ============================================================

-- স্টোরি
INSERT INTO public.stories (id, title, description, max_players, genre)
VALUES (
  'abir-nila-rain',
  'আবির আর নীলার বৃষ্টির বিকাল',
  'বৃষ্টির এক বিকাল। ক্যাফেতে আবির আর নীলার দেখা হবে — কিন্তু কীভাবে হবে সেটা সবার সিদ্ধান্তে। তিন বন্ধু: আবির, নীলা, তানভীর। (হাইব্রিড টেমপ্লেট: টার্নিং পয়েন্ট প্রি-রাইটেন, সংলাপ/বর্ণনা এআই দিয়ে ভরাট করা যাবে)',
  3,
  'romance'
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    max_players = EXCLUDED.max_players,
    genre = EXCLUDED.genre;

-- চরিত্র (পাবলিক বর্ণনা। সিক্রেট প্রোফাইল উপরের কমেন্টে — এআই প্রম্পটে ব্যবহার করুন)
INSERT INTO public.character_templates (name, description, story_id)
VALUES
  ('আবির', 'শান্ত, একটু লাজুক। গান আর গিটার ভালোবাসে।', 'abir-nila-rain'),
  ('নীলা', 'চঞ্চল, উৎসুক। ফটোগ্রাফি আর বৃষ্টি পছন্দ।', 'abir-nila-rain'),
  ('তানভীর', 'দুইজনের বন্ধু। মজা পছন্দ, সবাইকে জড়িয়ে রাখে।', 'abir-nila-rain')
ON CONFLICT (story_id, name) DO UPDATE
SET description = EXCLUDED.description;

-- ========== টার্নিং পয়েন্ট ১: শুরু (বৃষ্টি) ==========
INSERT INTO public.story_nodes (story_id, node_key, title, content, choices, is_ending)
VALUES (
  'abir-nila-rain',
  'start',
  'বৃষ্টির বিকাল',
  'বৃষ্টি নামছে। ক্যাফের জানালা ঘেঁষে তিনটা চেয়ার। ভিতরে গরম কফির গন্ধ, বাইরে ভিজে রাস্তা। আবির, নীলা আর তানভীর — কেউ কফি নিয়ে, কেউ বৃষ্টির দিকে তাকিয়ে। তানভীর চোখ টিপে: আজ যেন কেউ কেউ একটু বেশি চুপ।',

  '[
    {"key": "speak", "text": "কেউ প্রথম কথা বলুক", "next_node": "first_words", "character_specific": null},
    {"key": "silent", "text": "চুপ থেকে বৃষ্টি দেখো", "next_node": "rain_silence", "character_specific": null}
  ]'::jsonb,
  false
)
ON CONFLICT (story_id, node_key) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, choices = EXCLUDED.choices;

-- ========== টার্নিং পয়েন্ট ২: প্রথম কথা ==========
INSERT INTO public.story_nodes (story_id, node_key, title, content, choices, is_ending)
VALUES (
  'abir-nila-rain',
  'first_words',
  'প্রথম কথা',
  'কেউ একটা কথা বলল। বরফ ভাঙল। বৃষ্টি আর কফির মধ্যে কথোপকথন শুরু। তানভীর জানেন এই দুজনের মধ্যে কিছু আছে — আজ সেটা ফুটে উঠবে কি না সবার সিদ্ধান্তের ওপর।',

  '[
    {"key": "flower", "text": "কেউ ফুল কিনে আনুক", "next_node": "choice_flower", "character_specific": null},
    {"key": "coffee", "text": "কফি নিয়ে কথা বলো", "next_node": "choice_coffee", "character_specific": null}
  ]'::jsonb,
  false
)
ON CONFLICT (story_id, node_key) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, choices = EXCLUDED.choices;

-- ========== টার্নিং পয়েন্ট ৩ক: ফুল ==========
INSERT INTO public.story_nodes (story_id, node_key, title, content, choices, is_ending)
VALUES (
  'abir-nila-rain',
  'choice_flower',
  'ফুলের সিদ্ধান্ত',
  'কেউ বৃষ্টিতে ভিজে পাশের দোকান থেকে ফুল এনেছে। টেবিলে একগুচ্ছ ফুল। নীলার চোখ উজ্জ্বল। আবির লজ্জায় মাথা নিচু। তানভীর হাসছেন। এই মুহূর্ত থেকে গল্পটা আরও গভীরে যাবে।',

  '[{"key": "to_touch", "text": "গল্পটা ইমোশনের দিকে নিয়ে যাও", "next_node": "tension", "character_specific": null}]'::jsonb,
  false
)
ON CONFLICT (story_id, node_key) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, choices = EXCLUDED.choices;

-- ========== টার্নিং পয়েন্ট ৩খ: কফি ==========
INSERT INTO public.story_nodes (story_id, node_key, title, content, choices, is_ending)
VALUES (
  'abir-nila-rain',
  'choice_coffee',
  'কফির সিদ্ধান্ত',
  'কেউ আরেক কাপ কফি এনে দিল। গল্প হালকা থাকল — বৃষ্টি, গান, পুরনো স্মৃতি। কিন্তু কারও কারও চোখে একটা প্রশ্ন: আজ কি কিছু বলবে?',

  '[{"key": "to_touch", "text": "গল্পটা ইমোশনের দিকে নিয়ে যাও", "next_node": "tension", "character_specific": null}]'::jsonb,
  false
)
ON CONFLICT (story_id, node_key) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, choices = EXCLUDED.choices;

-- ========== টার্নিং পয়েন্ট ৪: টান ==========
INSERT INTO public.story_nodes (story_id, node_key, title, content, choices, is_ending)
VALUES (
  'abir-nila-rain',
  'tension',
  'টান',
  'মুহূর্তটা ঘন হয়ে এসেছে। কেউ একটা গোপন কথা বলতে চায়, কেউ ভয় পাচ্ছে। বৃষ্টি থামছে। জানালার কাঁচে ফোঁটা। সবাই জানে — এখন একটা সিদ্ধান্ত নিলে গল্পের শেষ বদলে যাবে।',

  '[
    {"key": "confess", "text": "সত্যি বলো — মিষ্টি শেষের দিকে", "next_node": "ending_together", "character_specific": null},
    {"key": "hold", "text": "চেপে রাখো — রহস্য রাখো", "next_node": "ending_maybe_later", "character_specific": null},
    {"key": "leave", "text": "চলে যাও — bittersweet", "next_node": "ending_leave", "character_specific": null}
  ]'::jsonb,
  false
)
ON CONFLICT (story_id, node_key) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, choices = EXCLUDED.choices;

-- ========== নীরব শাখা ==========
INSERT INTO public.story_nodes (story_id, node_key, title, content, choices, is_ending)
VALUES (
  'abir-nila-rain',
  'rain_silence',
  'বৃষ্টিতে নীরবতা',
  'কেউ কিছু বলে না। শুধু বৃষ্টির শব্দ। চোখে চোখ। এই নীরবতাই বলে দেয় অনেক কিছু। গল্প এখানেই শেষ হতে পারে, নয়তো পরের কোনো দিন আবার।',

  '[
    {"key": "quiet_end", "text": "শান্ত শেষ", "next_node": "ending_maybe_later", "character_specific": null}
  ]'::jsonb,
  false
)
ON CONFLICT (story_id, node_key) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, choices = EXCLUDED.choices;

-- ========== ৩টি এন্ডিং ==========
INSERT INTO public.story_nodes (story_id, node_key, title, content, choices, is_ending)
VALUES
  (
    'abir-nila-rain',
    'ending_together',
    'একসাথে',
    'কেউ বলল যা বলতে চেয়েছিল। বৃষ্টি থেমে গেছে। ক্যাফের বাইরে একসাথে হাঁটা। সেই বিকেল সবার মনে থাকবে।',
    '[]'::jsonb,
    true
  ),
  (
    'abir-nila-rain',
    'ending_maybe_later',
    'আরও একদিন',
    'আজ কিছু বলল না। কিন্তু চোখের ভাষায় বোঝা গেল — দেখা হবে আবার। রহস্য রয়ে গেল।',
    '[]'::jsonb,
    true
  ),
  (
    'abir-nila-rain',
    'ending_leave',
    'চলে যাওয়া',
    'কেউ উঠে চলে গেল। বৃষ্টি আরও জোরালো। যে রইল তার মনে একটা খালি জায়গা। Bittersweet শেষ।',
    '[]'::jsonb,
    true
  )
ON CONFLICT (story_id, node_key) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, choices = EXCLUDED.choices, is_ending = EXCLUDED.is_ending;
