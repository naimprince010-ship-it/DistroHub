-- উদাহরণ: একটা রোমান্স মাল্টিভার্স স্টোরি যোগ করা
-- Supabase SQL Editor এ পুরো ফাইলটা কপি করে Run করুন

-- স্টোরি
INSERT INTO public.stories (id, title, description, max_players, genre)
VALUES (
  'romance-cafe-story',
  'ক্যাফের সেই বিকেল',
  'তিন বন্ধু এক ক্যাফেতে বসে। কেউ অতীতের প্রেম নিয়ে ভাবে, কেউ নতুন কাউকে চেনে। সবার choice মিলে গল্প বদলাবে।',
  3,
  'romance'
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    max_players = EXCLUDED.max_players,
    genre = EXCLUDED.genre;

-- চরিত্র
INSERT INTO public.character_templates (name, description, story_id)
VALUES
  ('তানিয়া', 'ক্যাফের নিয়মিত। গান আর বই ভালোবাসে।', 'romance-cafe-story'),
  ('রিয়াদ', 'প্রোগ্রামার, শান্ত। মনে মনে রোমান্টিক।', 'romance-cafe-story'),
  ('মাহি', 'ফটোগ্রাফার। সবকিছু গল্পের মতো দেখে।', 'romance-cafe-story')
ON CONFLICT (story_id, name) DO UPDATE
SET description = EXCLUDED.description;

-- স্টার্ট নোড
INSERT INTO public.story_nodes (story_id, node_key, title, content, choices, is_ending)
VALUES (
  'romance-cafe-story',
  'start',
  'ক্যাফেতে বিকেল',
  'বিকেলের রোদ ক্যাফের জানালায় পড়েছে। তিন বন্ধু এক টেবিলে। কফির কাপের পাশে কেউ ফোন দেখছে, কেউ বাইরে তাকিয়ে।

তানিয়া: ওই যে নতুন লোকটা বারবার তাকাচ্ছে। তুমি কি ওকে চেনো?

রিয়াদ: না। কিন্তু ওই দিকে একটা ফুলের দোকান খুলেছে। কেউ একগুচ্ছ গোলাপ কিনে বেরোল।

মাহি: আজকে কি কেউ কাউকে বলবে যে...?

What happens next?',
  '[
    {"key": "talk", "text": "গল্পটা এগিয়ে নিয়ে যাও — কেউ কথা বলুক", "next_node": "conversation", "character_specific": null},
    {"key": "silent", "text": "চুপচাপ থাকো — বাতাস বলুক", "next_node": "silent_moment", "character_specific": null}
  ]'::jsonb,
  false
)
ON CONFLICT (story_id, node_key) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, choices = EXCLUDED.choices;

-- কনভারসেশন নোড
INSERT INTO public.story_nodes (story_id, node_key, title, content, choices, is_ending)
VALUES (
  'romance-cafe-story',
  'conversation',
  'কথা বলার সুর',
  'কেউ একটা গান বাজাতে চায়। কেউ বলে "আমি একটা কথা বলতে চাই।" বিকেল আরও গাঢ় হয়।

সবাই একসাথে সিদ্ধান্ত নেয় — আজ কেউ না কেউ সত্যি বলবেই।',
  '[
    {"key": "confess", "text": "কেউ একটা গোপন কথা শেয়ার করুক", "next_node": "ending_sweet", "character_specific": null},
    {"key": "laugh", "text": "হেসে উড়িয়ে দাও, মজা করো", "next_node": "ending_fun", "character_specific": null}
  ]'::jsonb,
  false
)
ON CONFLICT (story_id, node_key) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, choices = EXCLUDED.choices;

-- সাইলেন্ট মোমেন্ট
INSERT INTO public.story_nodes (story_id, node_key, title, content, choices, is_ending)
VALUES (
  'romance-cafe-story',
  'silent_moment',
  'নীরবতা',
  'কেউ কিছু বলে না। শুধু কফির গন্ধ আর বাইরের আওয়াজ। কেউ কাউকে চোখে চোখ রাখে। সেই নীরবতাই একটা গল্প।',
  '[{"key": "end", "text": "এখানেই শেষ", "next_node": "ending_quiet", "character_specific": null}]'::jsonb,
  false
)
ON CONFLICT (story_id, node_key) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, choices = EXCLUDED.choices;

-- এন্ডিংস
INSERT INTO public.story_nodes (story_id, node_key, title, content, choices, is_ending)
VALUES
  (
    'romance-cafe-story',
    'ending_sweet',
    'মিষ্টি শেষ',
    'কেউ বলল যা বলতে চেয়েছিল। বাকিরা হাসল। ক্যাফের সেই বিকেল সবার মনে থাকবে।',
    '[]'::jsonb,
    true
  ),
  (
    'romance-cafe-story',
    'ending_fun',
    'মজার শেষ',
    'সবাই হেসে ফেলল। গল্প সত্যি না মিথ্যা সেটা আর বোঝা গেল না। এমনই একটা বিকেল।',
    '[]'::jsonb,
    true
  ),
  (
    'romance-cafe-story',
    'ending_quiet',
    'শান্ত শেষ',
    'কিছু বলার দরকার ছিল না। নীরবতাই সব বলেছিল।',
    '[]'::jsonb,
    true
  )
ON CONFLICT (story_id, node_key) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, choices = EXCLUDED.choices, is_ending = EXCLUDED.is_ending;
