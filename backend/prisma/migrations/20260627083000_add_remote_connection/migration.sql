-- Add remote connection fields to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS "remoteUrl" TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS "apiKey" TEXT;
ALTER TABLE agents ADD CONSTRAINT agents_api_key_unique UNIQUE ("apiKey");
ALTER TABLE agents ADD COLUMN IF NOT EXISTS "isConnected" BOOLEAN DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS "lastHeartbeat" TIMESTAMPTZ;
