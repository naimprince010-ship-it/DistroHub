-- stories টেবিলে genre কলাম যোগ করুন
-- এটা একবার Run করার পর add_story_romance_example.sql চালান

ALTER TABLE public.stories
ADD COLUMN IF NOT EXISTS genre text DEFAULT 'mystery';
