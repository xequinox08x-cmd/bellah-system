ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS prompt_text TEXT;
ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS output_mode TEXT DEFAULT 'text';
ALTER TABLE ai_contents ALTER COLUMN output_mode SET DEFAULT 'text';
ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS reference_image_url TEXT;
ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS generated_image_url TEXT;
ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS image_prompt TEXT;
ALTER TABLE ai_contents ADD COLUMN IF NOT EXISTS hashtags TEXT;
