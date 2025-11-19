-- Add 'todoist' to the allowed source_types
ALTER TABLE user_connections 
DROP CONSTRAINT user_connections_source_type_check;

ALTER TABLE user_connections 
ADD CONSTRAINT user_connections_source_type_check 
CHECK (source_type IN ('slack', 'notion', 'google_drive', 'todoist'));
