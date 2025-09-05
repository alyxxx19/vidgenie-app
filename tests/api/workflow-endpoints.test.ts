/**
 * Tests d'intégration pour les API endpoints workflow
 * Phase 4 - Testing & Launch du PRD V2
 */

import { createMocks } from 'node-mocks-http';
import { NextRequest, NextResponse } from 'next/server';
import { POST as executeHandler } from '../../src/app/api/workflow/execute/route';
import { GET as statusHandler } from '../../src/app/api/workflow/status/[workflowId]/route';
import { POST as cancelHandler } from '../../src/app/api/workflow/cancel/[workflowId]/route';
import { POST as deductHandler } from '../../src/app/api/credits/deduct/route';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client');
const MockedPrismaClient = PrismaClient as jest.MockedClass<typeof PrismaClient>;

// Mock Inngest
jest.mock('../../../src/lib/inngest', () => ({
  inngest: {
    send: jest.fn()
  }
}));

// Mock auth
jest.mock('../../../src/lib/auth/server-auth', () => ({
  getCurrentUser: jest.fn()
}));

// Mock encryption service
jest.mock('../../../src/services/encryption', () => ({
  EncryptionService: {
    decrypt: jest.fn()
  }
}));

import { inngest } from '../../src/lib/inngest';
import { getCurrentUser } from '../../src/lib/auth/server-auth';
import { EncryptionService } from '../../src/services/encryption';

describe('Workflow API Endpoints Integration Tests', () => {
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockUser: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Prisma instance
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      userApiKeys: {
        findUnique: jest.fn(),
      },
      workflowExecution: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      creditTransaction: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    } as any;

    MockedPrismaClient.mockImplementation(() => mockPrisma);

    // Mock user
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      credits: 100,
      creditsUsed: 50,
    };

    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (EncryptionService.decrypt as jest.Mock).mockReturnValue('decrypted-api-key');
  });

  describe('POST /api/workflow/execute', () => {
    const validWorkflowConfig = {
      initialPrompt: 'A beautiful sunset landscape',
      workflowType: 'complete' as const,
      imageConfig: {
        style: 'vivid' as const,
        quality: 'hd' as const,
        size: '1024x1024' as const,
      },
      videoConfig: {
        duration: 8 as const,
        resolution: '1080p' as const,
        generateAudio: true,
      }
    };

    it('should execute workflow successfully', async () => {
      // Mock successful API keys lookup
      mockPrisma.userApiKeys.findUnique.mockResolvedValue({
        id: 'keys-123',
        userId: 'user-123',
        openaiKey: 'encrypted-key',
        imageGenKey: 'encrypted-key',
        vo3Key: 'encrypted-key',
        encryptionIV: 'iv-123',
        validationStatus: { openai: 'valid', imageGen: 'valid', vo3: 'valid' },
        lastUpdated: new Date(),
        createdAt: new Date(),
      });

      // Mock successful workflow creation
      const mockWorkflow = {
        id: 'workflow-123',
        userId: 'user-123',
        projectId: null,
        config: validWorkflowConfig,
        workflowType: 'complete',
        status: 'INITIALIZING',
        progress: 0,
        estimatedCost: 25,
        estimatedDuration: 300,
        createdAt: new Date(),
        startedAt: new Date(),
      };

      mockPrisma.workflowExecution.create.mockResolvedValue(mockWorkflow);
      (inngest.send as jest.Mock).mockResolvedValue({ ids: ['event-123'] });

      const request = new NextRequest('http://localhost/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: validWorkflowConfig }),
      });

      const response = await executeHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.workflowId).toBe('workflow-123');
      expect(data.estimatedCost).toBe(25);
      expect(data.estimatedDuration).toBe(300);
      expect(inngest.send).toHaveBeenCalledWith({
        name: 'workflow.execute',
        data: expect.objectContaining({
          workflowId: 'workflow-123',
          userId: 'user-123',
          config: validWorkflowConfig,
        }),
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: validWorkflowConfig }),
      });

      const response = await executeHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('User not authenticated');
    });

    it('should return 400 when workflow config is invalid', async () => {
      const invalidConfig = {
        // Missing required fields
      };

      const request = new NextRequest('http://localhost/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: invalidConfig }),
      });

      const response = await executeHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid workflow configuration');
    });

    it('should return 402 when user has insufficient credits', async () => {
      mockUser.credits = 5; // Not enough for workflow
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      mockPrisma.userApiKeys.findUnique.mockResolvedValue({
        id: 'keys-123',
        userId: 'user-123',
        openaiKey: 'encrypted-key',
        imageGenKey: 'encrypted-key',
        vo3Key: 'encrypted-key',
        encryptionIV: 'iv-123',
        validationStatus: { openai: 'valid', imageGen: 'valid', vo3: 'valid' },
        lastUpdated: new Date(),
        createdAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: validWorkflowConfig }),
      });

      const response = await executeHandler(request);
      const data = await response.json();

      expect(response.status).toBe(402);
      expect(data.error).toBe('Insufficient credits');
      expect(data.required).toBeGreaterThan(5);
      expect(data.available).toBe(5);
    });

    it('should return 400 when required API keys are missing', async () => {
      mockPrisma.userApiKeys.findUnique.mockResolvedValue({
        id: 'keys-123',
        userId: 'user-123',
        openaiKey: 'encrypted-key',
        imageGenKey: null, // Missing image generation key
        vo3Key: 'encrypted-key',
        encryptionIV: 'iv-123',
        validationStatus: { openai: 'valid', vo3: 'valid' },
        lastUpdated: new Date(),
        createdAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: validWorkflowConfig }),
      });

      const response = await executeHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required API keys');
      expect(data.missingKeys).toContain('imageGenKey');
    });

    it('should handle different workflow types correctly', async () => {
      const imageOnlyConfig = {
        ...validWorkflowConfig,
        workflowType: 'image-only' as const,
      };

      mockPrisma.userApiKeys.findUnique.mockResolvedValue({
        id: 'keys-123',
        userId: 'user-123',
        openaiKey: 'encrypted-key',
        imageGenKey: 'encrypted-key',
        vo3Key: null, // Not needed for image-only
        encryptionIV: 'iv-123',
        validationStatus: { openai: 'valid', imageGen: 'valid' },
        lastUpdated: new Date(),
        createdAt: new Date(),
      });

      mockPrisma.workflowExecution.create.mockResolvedValue({
        id: 'workflow-456',
        userId: 'user-123',
        projectId: null,
        config: imageOnlyConfig,
        workflowType: 'image-only',
        status: 'INITIALIZING',
        progress: 0,
        estimatedCost: 10, // Lower cost for image-only
        estimatedDuration: 60,
        createdAt: new Date(),
        startedAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: imageOnlyConfig }),
      });

      const response = await executeHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.estimatedCost).toBe(10);
    });
  });

  describe('GET /api/workflow/status/[workflowId]', () => {
    it('should return workflow status successfully', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        userId: 'user-123',
        projectId: null,
        config: validWorkflowConfig,
        workflowType: 'complete',
        status: 'RUNNING',
        progress: 65,
        currentStep: 'Video Generation',
        estimatedCost: 25,
        actualCost: null,
        estimatedDuration: 300,
        actualDuration: null,
        result: null,
        error: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: new Date(),
        completedAt: null,
      };

      mockPrisma.workflowExecution.findUnique.mockResolvedValue(mockWorkflow);

      const request = new NextRequest('http://localhost/api/workflow/status/workflow-123');
      const response = await statusHandler(request, { params: { workflowId: 'workflow-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.status).toBe('RUNNING');
      expect(data.progress).toBe(65);
      expect(data.currentStep).toBe('Video Generation');
      expect(data.estimatedTimeRemaining).toBeDefined();
    });

    it('should return 401 when user is not authenticated', async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/workflow/status/workflow-123');
      const response = await statusHandler(request, { params: { workflowId: 'workflow-123' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('User not authenticated');
    });

    it('should return 404 when workflow not found', async () => {
      mockPrisma.workflowExecution.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/workflow/status/workflow-123');
      const response = await statusHandler(request, { params: { workflowId: 'workflow-123' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Workflow not found');
    });

    it('should return 403 when accessing another user\'s workflow', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        userId: 'other-user-456', // Different user
        status: 'RUNNING',
      };

      mockPrisma.workflowExecution.findUnique.mockResolvedValue(mockWorkflow);

      const request = new NextRequest('http://localhost/api/workflow/status/workflow-123');
      const response = await statusHandler(request, { params: { workflowId: 'workflow-123' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });

    it('should calculate estimated time remaining correctly', async () => {
      const startTime = new Date();
      startTime.setMinutes(startTime.getMinutes() - 2); // Started 2 minutes ago

      const mockWorkflow = {
        id: 'workflow-123',
        userId: 'user-123',
        status: 'RUNNING',
        progress: 40, // 40% complete
        estimatedDuration: 300, // 5 minutes total
        startedAt: startTime,
      };

      mockPrisma.workflowExecution.findUnique.mockResolvedValue(mockWorkflow);

      const request = new NextRequest('http://localhost/api/workflow/status/workflow-123');
      const response = await statusHandler(request, { params: { workflowId: 'workflow-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.estimatedTimeRemaining).toBeGreaterThan(120); // Should be around 3 minutes remaining
      expect(data.estimatedTimeRemaining).toBeLessThan(240);
    });
  });

  describe('POST /api/workflow/cancel/[workflowId]', () => {
    it('should cancel workflow successfully', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        userId: 'user-123',
        status: 'RUNNING',
      };

      mockPrisma.workflowExecution.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowExecution.update.mockResolvedValue({
        ...mockWorkflow,
        status: 'CANCELLED',
        completedAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/workflow/cancel/workflow-123', {
        method: 'POST',
      });
      const response = await cancelHandler(request, { params: { workflowId: 'workflow-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Workflow cancelled successfully');
      expect(mockPrisma.workflowExecution.update).toHaveBeenCalledWith({
        where: { id: 'workflow-123' },
        data: {
          status: 'CANCELLED',
          completedAt: expect.any(Date),
        },
      });
    });

    it('should return 400 when trying to cancel completed workflow', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        userId: 'user-123',
        status: 'COMPLETED',
      };

      mockPrisma.workflowExecution.findUnique.mockResolvedValue(mockWorkflow);

      const request = new NextRequest('http://localhost/api/workflow/cancel/workflow-123', {
        method: 'POST',
      });
      const response = await cancelHandler(request, { params: { workflowId: 'workflow-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot cancel workflow in status: COMPLETED');
    });

    it('should return 403 when cancelling another user\'s workflow', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        userId: 'other-user-456',
        status: 'RUNNING',
      };

      mockPrisma.workflowExecution.findUnique.mockResolvedValue(mockWorkflow);

      const request = new NextRequest('http://localhost/api/workflow/cancel/workflow-123', {
        method: 'POST',
      });
      const response = await cancelHandler(request, { params: { workflowId: 'workflow-123' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });
  });

  describe('POST /api/credits/deduct', () => {
    it('should deduct credits atomically', async () => {
      const deductAmount = 15;
      const reason = 'workflow_prompt_enhancement';

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        credits: 100,
      });

      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        credits: 85,
        creditsUsed: 65,
      });

      mockPrisma.creditTransaction.create.mockResolvedValue({
        id: 'tx-123',
        userId: 'user-123',
        type: 'DEBIT',
        amount: deductAmount,
        reason,
        metadata: null,
        createdAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/credits/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: deductAmount,
          reason,
          metadata: { workflowId: 'workflow-123' },
        }),
      });

      const response = await deductHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.remainingCredits).toBe(85);
      expect(data.transactionId).toBe('tx-123');
    });

    it('should return 402 when insufficient credits', async () => {
      const deductAmount = 150; // More than available

      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        credits: 100,
      });

      const request = new NextRequest('http://localhost/api/credits/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: deductAmount,
          reason: 'test',
        }),
      });

      const response = await deductHandler(request);
      const data = await response.json();

      expect(response.status).toBe(402);
      expect(data.error).toBe('Insufficient credits');
      expect(data.available).toBe(100);
      expect(data.required).toBe(150);
    });

    it('should validate deduction amount', async () => {
      const request = new NextRequest('http://localhost/api/credits/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: -5, // Invalid negative amount
          reason: 'test',
        }),
      });

      const response = await deductHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Amount must be positive');
    });

    it('should validate deduction reason', async () => {
      const request = new NextRequest('http://localhost/api/credits/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 10,
          reason: '', // Empty reason
        }),
      });

      const response = await deductHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Reason is required');
    });

    it('should handle transaction failures gracefully', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost/api/credits/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 10,
          reason: 'test',
        }),
      });

      const response = await deductHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to deduct credits');
    });
  });

  describe('Error handling', () => {
    it('should handle database connection errors', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Connection timeout'));

      const request = new NextRequest('http://localhost/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: validWorkflowConfig }),
      });

      const response = await executeHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      });

      const response = await executeHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should handle missing request body', async () => {
      const request = new NextRequest('http://localhost/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await executeHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Request body is required');
    });
  });

  describe('Rate limiting and concurrency', () => {
    it('should handle concurrent workflow executions', async () => {
      // Mock successful responses for multiple requests
      mockPrisma.userApiKeys.findUnique.mockResolvedValue({
        id: 'keys-123',
        userId: 'user-123',
        openaiKey: 'encrypted-key',
        imageGenKey: 'encrypted-key',
        vo3Key: 'encrypted-key',
        encryptionIV: 'iv-123',
        validationStatus: { openai: 'valid', imageGen: 'valid', vo3: 'valid' },
        lastUpdated: new Date(),
        createdAt: new Date(),
      });

      let workflowCounter = 1;
      mockPrisma.workflowExecution.create.mockImplementation(() => 
        Promise.resolve({
          id: `workflow-${workflowCounter++}`,
          userId: 'user-123',
          projectId: null,
          config: validWorkflowConfig,
          workflowType: 'complete',
          status: 'INITIALIZING',
          progress: 0,
          estimatedCost: 25,
          estimatedDuration: 300,
          createdAt: new Date(),
          startedAt: new Date(),
        })
      );

      (inngest.send as jest.Mock).mockResolvedValue({ ids: ['event-123'] });

      const requests = Array.from({ length: 3 }, () => 
        new NextRequest('http://localhost/api/workflow/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: validWorkflowConfig }),
        })
      );

      const responses = await Promise.all(requests.map(req => executeHandler(req)));
      const dataResults = await Promise.all(responses.map(res => res.json()));

      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(dataResults[index].success).toBe(true);
        expect(dataResults[index].workflowId).toMatch(/^workflow-/);
      });
    });
  });
});