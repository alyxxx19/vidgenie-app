-- Migration: Add Workflow V2 models
-- Phase 4 - Testing & Launch du PRD V2
-- Adds WorkflowExecution, CreditTransaction, Content, and UserApiKeys models

-- Add credits and creditsUsed to User table if not exists
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "credits" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN IF NOT EXISTS "creditsUsed" INTEGER NOT NULL DEFAULT 0;

-- Create UserApiKeys table
CREATE TABLE IF NOT EXISTS "user_api_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "openaiKey" TEXT,
    "imageGenKey" TEXT,
    "vo3Key" TEXT,
    "encryptionIV" TEXT NOT NULL,
    "validationStatus" JSONB NOT NULL DEFAULT '{}',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_api_keys_pkey" PRIMARY KEY ("id")
);

-- Create WorkflowExecution table
CREATE TABLE IF NOT EXISTS "workflow_executions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "config" JSONB NOT NULL,
    "workflowType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentStep" TEXT,
    "estimatedCost" INTEGER NOT NULL,
    "actualCost" INTEGER,
    "estimatedDuration" INTEGER NOT NULL,
    "actualDuration" INTEGER,
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

-- Create CreditTransaction table
CREATE TABLE IF NOT EXISTS "credit_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- Create Content table
CREATE TABLE IF NOT EXISTS "content" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalPrompt" TEXT NOT NULL,
    "enhancedPrompt" TEXT,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_pkey" PRIMARY KEY ("id")
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "user_api_keys_userId_key" ON "user_api_keys"("userId");
CREATE INDEX IF NOT EXISTS "workflow_executions_userId_createdAt_idx" ON "workflow_executions"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "workflow_executions_status_idx" ON "workflow_executions"("status");
CREATE INDEX IF NOT EXISTS "workflow_executions_workflowType_idx" ON "workflow_executions"("workflowType");
CREATE INDEX IF NOT EXISTS "credit_transactions_userId_idx" ON "credit_transactions"("userId");
CREATE INDEX IF NOT EXISTS "credit_transactions_createdAt_idx" ON "credit_transactions"("createdAt");
CREATE INDEX IF NOT EXISTS "content_userId_idx" ON "content"("userId");
CREATE INDEX IF NOT EXISTS "content_status_idx" ON "content"("status");

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "user_api_keys_userId_key" ON "user_api_keys"("userId");

-- Add foreign key constraints
ALTER TABLE "user_api_keys" 
ADD CONSTRAINT IF NOT EXISTS "user_api_keys_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_executions" 
ADD CONSTRAINT IF NOT EXISTS "workflow_executions_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_executions" 
ADD CONSTRAINT IF NOT EXISTS "workflow_executions_projectId_fkey" 
FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "credit_transactions" 
ADD CONSTRAINT IF NOT EXISTS "credit_transactions_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "content" 
ADD CONSTRAINT IF NOT EXISTS "content_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;