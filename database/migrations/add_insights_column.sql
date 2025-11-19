-- Add insights column to meetings table
ALTER TABLE meetings 
ADD COLUMN insights JSONB DEFAULT '{}';
