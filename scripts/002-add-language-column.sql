-- Add language column to stories table
ALTER TABLE public.stories 
ADD COLUMN language VARCHAR(10) DEFAULT 'en' NOT NULL;

-- Update existing stories to have default language
UPDATE public.stories 
SET language = 'en' 
WHERE language IS NULL;
