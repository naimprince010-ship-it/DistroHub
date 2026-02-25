-- বড় গল্প উদাহরণ: ক্যাফের সেই বিকেল (অনেক নোড, বেশি পড়ার ও চয়েস)
-- Supabase SQL Editor এ পুরো ফাইলটা কপি করে Run করুন।
-- আগে add_genre_to_stories.sql চালানো থাকতে হবে।

-- স্টোরি (বিবরণ একটু লম্বা)
INSERT INTO public.stories (id, title, description, max_players, genre)
VALUES (
  'romance-cafe-story',
  'ক্যাফের সেই বিকেল',
  'তিন বন্ধু এক ক্যাফেতে বসে। কেউ অতীতের প্রেম নিয়ে ভাবে, কেউ নতুন কাউকে চেনে। অনেকগুলো দৃশ্য আর চয়েস দিয়ে গল্প এগোবে — রিয়াল লাইফের উপন্যাসের মতো সময় কাটাতে পারবে।',
  3,
  'romance'
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    max_players = EXCLUDED.max_players,
    genre = EXCLUDED.genre;

-- চরিত্র (অপরিবর্তিত)
INSERT INTO public.character_templates (name, description, story_id)
VALUES
  ('তানিয়া', 'ক্যাফের নিয়মিত। গান আর বই ভালোবাসে।', 'romance-cafe-story'),
  ('রিয়াদ', 'প্রোগ্রামার, শান্ত। মনে মনে রোমান্টিক।', 'romance-cafe-story'),
  ('মাহি', 'ফটোগ্রাফার। সবকিছু গল্পের মতো দেখে।', 'romance-cafe-story')
ON CONFLICT (story_id, name) DO UPDATE
SET description = EXCLUDED.description;

-- ========== স্টার্ট ==========
INSERT INTO public.story_nodes (story_id, node_key, title, content, choices, is_ending)
VALUES (
  'romance-cafe-story',
  'start',
  'ক্যাফেতে বিকেল',
  'বিকেলের রোদ ক্যাফের জানালায় পড়েছে। তিন বন্ধু এক টেবিলে। কফির কাপের পাশে কেউ ফোন দেখছে, কেউ বাইরে তাকিয়ে। বাইরে হাঁটা মানুষের ভিড়, গাড়ির আওয়াজ দূরে মিলিয়ে যাচ্ছে।

তানিয়া: ওই যে নতুন লোকটা বারবার তাকাচ্ছে। তুমি কি ওকে চেনো?

রিয়াদ: না। কিন্তু ওই দিকে একটা ফুলের দোকান খুলেছে। কেউ একগুচ্ছ গোলাপ কিনে বেরোল।

মাহি: আজকে কি কেউ কাউকে বলবে যে...?

সবাই একসাথে চুপ। একটা গান বাজছে ব্যাকগ্রাউন্ডে।',
  '[
    {"key": "talk", "text": "গল্পটা এগিয়ে নিয়ে যাও — কেউ কথা বলুক", "next_node": "conversation", "character_specific": null},
    {"key": "silent", "text": "চুপচাপ থাকো — বাতাস বলুক", "next_node": "silent_moment", "character_specific": null}
  ]'::jsonb,
  false
)
ON CONFLICT (story_id, node_key) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, choices = EXCLUDED.choices;

-- ========== কনভারসেশন ==========
INSERT INTO public.story_nodes (story_id, node_key, title, content, choices, is_ending)
VALUES (
  'romance-cafe-story',
  'conversation',
  'কথা বলার সুর',
  'কেউ একটা গান বাজাতে চায়। কেউ বলে "আমি একটা কথা বলতে চাই।" বিকেল আরও গাঢ় হয়। জানালার পাশের গাছের ছায়া টেবিলের উপর পড়তে শুরু করেছে।

তানিয়া কফির কাপ নেড়ে: আজ আসলে কেমন লাগছে সবার?

রিয়াদ হেসে: একটু অন্য রকম। যেন কিছু একটা হবে।

মাহি: তাহলে আমরা ঠিক জায়গায়ই আছি।',

  '[
    {"key": "deep", "text": "গল্পটা গভীরে নিয়ে যাও — আসল কথায় আসো", "next_node": "evening_deepens", "character_specific": null},
    {"key": "light", "text": "হালকা থাকো — মজা করো", "next_node": "light_moment", "character_specific": null}
  ]'::jsonb,
  false
)
ON CONFLICT (story_id, node_key) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, choices = EXCLUDED.choices;

-- ========== ইভিনিং ডিপেন্স (নতুন — গভীরতা) ==========
INSERT INTO public.story_nodes (story_id, node_key, title, content, choices, is_ending)
VALUES (
  'romance-cafe-story',
  'evening_deepens',
  'বিকেল গাঢ় হয়',
  'রোদ কমে আসছে। ক্যাফেতে আলো নরম হয়ে এসেছে। কেউ কেউ টেবিলে মোমবাতি জ্বালিয়েছে। তিন বন্ধুর মধ্যে একটা নীরব বোঝাপড়া — আজ কিছু বলতে হবে।

তানিয়া: আমি অনেক দিন ধরে একটা কথা চেপে রেখেছি।

রিয়াদ: আমিও। কিন্তু ভয় করছি।

মাহি: ভয় পেলে আমরা কেউ এগোব না। একসাথে বলি।',

  '[{"key": "truth", "text": "সত্যি বলার মুহূর্তে যাও", "next_node": "moment_of_truth", "character_specific": null}]'::jsonb,
  false
)
ON CONFLICT (story_id, node_key) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, choices = EXCLUDED.choices;

-- ========== মোমেন্ট অফ ট্রুথ ==========
INSERT INTO public.story_nodes (story_id, node_key, title, content, choices, is_ending)
VALUES (
  'romance-cafe-story',
  'moment_of_truth',
  'সত্যি বলার মুহূর্ত',
  'সবাই চোখে চোখ রাখল। বাইরের শব্দ যেন থেমে গেছে। একে একে সবার মুখ থেকে বেরিয়ে আসে সেই কথাগুলো — যেগুলো বছরের পর বছর চেপে রাখা ছিল। কেউ কাঁদে, কেউ হাসে। ক্যাফের সেই বিকেল সবার জীবনের একটা টার্নিং পয়েন্ট হয়ে যায়।',

  '[
    {"key": "sweet", "text": "মিষ্টি শেষ — সব ভালো যাক", "next_node": "ending_sweet", "character_specific": null},
    {"key": "fun", "text": "হেসে উড়িয়ে দাও — মজা করো", "next_node": "ending_fun", "character_specific": null}
  ]'::jsonb,
  false
)
ON CONFLICT (story_id, node_key) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, choices = EXCLUDED.choices;

-- ========== লাইট মোমেন্ট ==========
INSERT INTO public.story_nodes (story_id, node_key, title, content, choices, is_ending)
VALUES (
  'romance-cafe-story',
  'light_moment',
  'হালকা মুহূর্ত',
  'কেউ একটা জোক বলল। সবাই হেসে ফেলল। গমগমে কথা, পুরনো স্মৃতি, ভবিষ্যতের প্ল্যান — সব মিলিয়ে একটা হালকা বিকেল কাটল। গল্প সত্যি না মিথ্যা সেটা আর বোঝা গেল না। এমনই একটা দিন।',

  '[{"key": "fun_end", "text": "এখানেই শেষ — মজার সুরে", "next_node": "ending_fun", "character_specific": null}]'::jsonb,
  false
)
ON CONFLICT (story_id, node_key) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, choices = EXCLUDED.choices;

-- ========== সাইলেন্ট মোমেন্ট ==========
INSERT INTO public.story_nodes (story_id, node_key, title, content, choices, is_ending)
VALUES (
  'romance-cafe-story',
  'silent_moment',
  'নীরবতা',
  'কেউ কিছু বলে না। শুধু কফির গন্ধ আর বাইরের আওয়াজ। কেউ কাউকে চোখে চোখ রাখে। সেই নীরবতাই একটা গল্প।',

  '[{"key": "window", "text": "জানালার পাশে যাও — আরও একটু থাকো", "next_node": "by_the_window", "character_specific": null}]'::jsonb,
  false
)
ON CONFLICT (story_id, node_key) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, choices = EXCLUDED.choices;

-- ========== বাই দ্য উইন্ডো (নতুন — নীরব শাখা লম্বা) ==========
INSERT INTO public.story_nodes (story_id, node_key, title, content, choices, is_ending)
VALUES (
  'romance-cafe-story',
  'by_the_window',
  'জানালার পাশে',
  'তিনজন জানালার পাশের সিটে চলে গেল। বাইরে রাস্তায় লাইট জ্বলতে শুরু করেছে। কেউ হাত বাড়িয়ে কফির কাপ ধরল। চোখের ভাষায় অনেক কিছু বিনিময় হল। কিছু বলার দরকার ছিল না। নীরবতাই সব বলেছিল।',

  '[{"key": "quiet", "text": "শান্ত শেষ", "next_node": "ending_quiet", "character_specific": null}]'::jsonb,
  false
)
ON CONFLICT (story_id, node_key) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, choices = EXCLUDED.choices;

-- ========== এন্ডিংস ==========
INSERT INTO public.story_nodes (story_id, node_key, title, content, choices, is_ending)
VALUES
  (
    'romance-cafe-story',
    'ending_sweet',
    'মিষ্টি শেষ',
    'কেউ বলল যা বলতে চেয়েছিল। বাকিরা হাসল। ক্যাফের সেই বিকেল সবার মনে থাকবে। ভবিষ্যতে আরও এমন বিকেল আসবে।',
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
