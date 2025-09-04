# Product Requirements Document (PRD) V2
## Plateforme SaaS d'Automatisation de Contenu Court

**Version:** 2.0  
**Date:** 04/09/2025  
**Statut:** Prêt pour développement  

---

## 1. Résumé Exécutif

### Vision V2
La V2 transforme VidGenie en un outil professionnel de création de contenu automatisé utilisant le modèle "Bring Your Own Keys" (BYOK). L'objectif est de créer une expérience similaire à N8N ou Zapier, spécialisée dans la génération de vidéos courtes avec un workflow visuel interactif.

### Situation Actuelle
- **Interface utilisateur V1** : 90% développée et fonctionnelle
- **Backend génération** : Non opérationnel - nécessite refonte complète
- **Modèle économique** : Passage des coûts API internes au modèle BYOK
- **Tests utilisateurs** : Uniquement internes

### Objectifs Clés V2
1. **Workflow Builder Visuel** : Interface canvas type node-based pour visualiser chaque étape
2. **Gestion des Clés API** : Système sécurisé pour clés utilisateur (OpenAI, Image Gen, VO3)
3. **Système de Crédits** : Monétisation via crédits malgré le modèle BYOK
4. **Génération Complète** : Pipeline fonctionnel prompt → image → vidéo

### Scope V2
- **✅ IN SCOPE** : Workflow visual, clés API, crédits, génération automatisée
- **❌ OUT OF SCOPE** : Templates communautaires (V2.1), nouvelles plateformes sociales

---

## 2. Architecture Technique

### Stack Actuel (Conservé)
```
Frontend: Next.js 14 (App Router) + TypeScript + TailwindCSS
Backend: API Routes + tRPC
Database: PostgreSQL (Supabase) + Prisma
Jobs: Inngest
Storage: AWS S3 + CloudFront
Auth: Supabase Auth
```

### Nouvelles Dépendances V2
```
Workflow Engine: React Flow + @reactflow/node-resizer
State Management: Zustand pour workflow state
Security: crypto-js pour chiffrement AES-256
Real-time: WebSocket/SSE pour updates temps réel
API Clients: OpenAI SDK, VO3 SDK
```

---

## 3. Système de Workflow Visuel

### 3.1 Interface Canvas (/create)

#### Transformation de la Page
La page `/create` actuelle doit être complètement repensée :
- **Avant** : Formulaire simple
- **Après** : Canvas interactif avec nœuds connectés

#### Composants à Développer

**WorkflowCanvas** (`/components/workflow/WorkflowCanvas.tsx`)
```typescript
interface WorkflowNode {
  id: string;
  type: 'prompt' | 'enhance' | 'image' | 'video' | 'output';
  position: { x: number; y: number };
  data: {
    label: string;
    status: 'idle' | 'loading' | 'success' | 'error';
    progress?: number; // 0-100
    duration?: number;
    input?: any;
    output?: any;
    config?: NodeConfig;
  };
}

// Fonctionnalités requises :
- Affichage des 5 nœuds avec React Flow
- Animations d'état (idle, loading, success, error)
- Connexions visuelles entre nœuds
- Mini-map pour navigation
- Zoom/Pan support
- Progress indicators temps réel
```

### 3.2 Les Cinq Nœuds du Workflow

#### Nœud 1 : Prompt Initial
- **Fonction** : Input utilisateur pour l'idée de base
- **Interface** : Zone de texte avec placeholder
- **Validation** : Max 1000 caractères
- **État** : Active en premier lors du lancement

#### Nœud 2 : Amélioration Prompt (ChatGPT)
- **Fonction** : Enrichissement automatique via OpenAI API
- **Coût** : 1 crédit
- **Affichage** : Comparaison avant/après
- **Animation** : Icône cerveau qui pulse

#### Nœud 3 : Génération Image
- **Fonction** : Création image à partir du prompt amélioré
- **Coût** : 2-5 crédits selon la taille
- **Affichage** : Miniature + barre de progression
- **Providers** : DALL-E, Midjourney, Stable Diffusion

#### Nœud 4 : Génération Vidéo (VO3)
- **Fonction** : Animation de l'image en vidéo
- **Coût** : 10-80 crédits selon durée
- **Affichage** : Timer + preview
- **Durée** : 8s, 15s, 30s, 60s

#### Nœud 5 : Résultat Final
- **Fonction** : Présentation et actions sur le contenu
- **Features** : Download, preview fullscreen, social sharing
- **Métadonnées** : Durée, résolution, taille fichier

### 3.3 États Visuels et Animations

#### Palette de Couleurs
```css
.node-idle { 
  border: 2px solid #E5E7EB; 
  background: #F9FAFB; 
}
.node-loading { 
  border: 2px solid #3B82F6; 
  animation: pulse 1.5s infinite;
  background: #EFF6FF;
}
.node-success { 
  border: 2px solid #10B981; 
  background: #ECFDF5;
}
.node-error { 
  border: 2px solid #EF4444; 
  background: #FEF2F2;
  animation: shake 0.5s;
}
```

#### Connexions Animées
- Particules lumineuses voyageant le long des edges
- Lignes qui pulsent lors du transfert de données
- Couleurs dynamiques selon l'état des nœuds

---

## 4. Gestion des Clés API Utilisateur

### 4.1 Modèle de Données

#### Table UserApiKeys
```typescript
interface UserApiKeys {
  id: string;
  userId: string;
  openaiKey?: string;      // Chiffré AES-256
  imageGenKey?: string;    // Chiffré AES-256
  vo3Key?: string;         // Chiffré AES-256
  encryptionIV: string;    // Vecteur d'initialisation
  validationStatus: {
    openai: 'valid' | 'invalid' | 'unchecked';
    imageGen: 'valid' | 'invalid' | 'unchecked';
    vo3: 'valid' | 'invalid' | 'unchecked';
  };
  lastUpdated: Date;
  createdAt: Date;
}
```

### 4.2 Interface Settings (/settings)

#### Section "Clés API"
```typescript
// Nouveau composant à ajouter à la page settings
<Card>
  <CardHeader>
    <CardTitle>Vos Clés API</CardTitle>
    <CardDescription>
      Connectez vos propres services IA. Vos clés sont chiffrées et stockées de manière sécurisée.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <ApiKeyInput
      label="Clé API OpenAI (ChatGPT)"
      name="openaiKey"
      placeholder="sk-..."
      helpText="Utilisée pour améliorer vos prompts et générer du texte"
      onValidate={validateOpenAIKey}
    />
    <ApiKeyInput
      label="Clé API Génération d'Images"
      name="imageGenKey"
      placeholder="Votre clé..."
      helpText="Pour créer les images (DALL-E, Midjourney, etc.)"
      onValidate={validateImageKey}
    />
    <ApiKeyInput
      label="Clé API VO3 (Vidéos)"
      name="vo3Key"
      placeholder="Votre clé VO3..."
      helpText="Pour transformer vos images en vidéos animées"
      onValidate={validateVO3Key}
    />
  </CardContent>
</Card>
```

#### Composant ApiKeyInput
```typescript
// Fonctionnalités requises :
- Masquage par défaut (type="password")
- Bouton œil pour révéler/masquer
- Bouton "Tester" avec loading state
- Messages de validation (success/error)
- Sauvegarde automatique
```

### 4.3 Sécurité

#### Chiffrement AES-256
```typescript
// Service de chiffrement à implémenter
export class EncryptionService {
  private readonly key: string;
  
  encrypt(plaintext: string): { encrypted: string; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.key);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return { encrypted, iv: iv.toString('hex') };
  }
  
  decrypt(encrypted: string, iv: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', this.key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

#### Règles de Sécurité
- Clés de chiffrement différentes par environnement
- Rotation automatique tous les 90 jours
- Audit log de tous les accès
- Aucune clé en clair dans logs/erreurs
- Validation avant chaque utilisation

---

## 5. Système de Crédits et Monétisation

### 5.1 Philosophie du Modèle

Malgré le modèle BYOK, nous facturons des crédits pour :
- L'utilisation de notre infrastructure
- La valeur ajoutée du workflow automatisé
- Le stockage et CDN
- L'orchestration des services

### 5.2 Structure Tarifaire

#### Plans d'Abonnement
```typescript
const PLANS = {
  free: { credits: 100, price: 0 },
  starter: { credits: 500, price: 9.99 },
  pro: { credits: 2000, price: 29.99 },
  enterprise: { credits: -1, price: 99.99 } // Unlimited
};
```

#### Coûts par Action
```typescript
const CREDIT_COSTS = {
  prompt_enhance: 1,      // ChatGPT amélioration
  image_gen_small: 2,     // Image 512x512
  image_gen_medium: 3,    // Image 1024x1024
  image_gen_large: 5,     // Image 2048x2048
  video_gen_8s: 10,       // Vidéo 8 secondes
  video_gen_15s: 20,      // Vidéo 15 secondes
  video_gen_30s: 40,      // Vidéo 30 secondes
  video_gen_60s: 80,      // Vidéo 60 secondes
} as const;
```

### 5.3 Widget Dashboard

#### Composant CreditsWidget
```typescript
// À ajouter au dashboard principal
export function CreditsWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crédits</CardTitle>
        <CardDescription>Plan {user.plan} • Renouvellement dans 15 jours</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Jauge circulaire */}
        <CircularProgress value={percentage} />
        
        {/* Historique récent */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Aujourd'hui</span>
            <span>-12 crédits</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Cette semaine</span>
            <span>-67 crédits</span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline">Historique</Button>
          <Button>Acheter des crédits</Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5.4 Logique de Déduction

#### Workflow de Crédits
1. **Vérification préalable** : Calcul du coût estimé
2. **Blocage si insuffisant** : Message clair + options
3. **Réservation** : Crédits "gelés" pendant exécution
4. **Déduction finale** : Si succès complet
5. **Remboursement** : Si échec côté plateforme

---

## 6. Services Backend

### 6.1 Service Amélioration Prompts

```typescript
export class PromptEnhancerService {
  async enhance(
    originalPrompt: string,
    userOpenAIKey: string,
    options: EnhanceOptions = {}
  ): Promise<EnhancedPrompt> {
    const openai = new OpenAI({ apiKey: userOpenAIKey });
    
    const systemPrompt = `
      Tu es un expert en génération d'images et vidéos par IA.
      Améliore le prompt suivant pour obtenir les meilleurs résultats possibles.
      Ajoute des détails sur : style visuel, éclairage, composition, ambiance, qualité.
      Garde le prompt concis mais précis. Maximum 200 mots.
    `;
    
    const completion = await openai.chat.completions.create({
      model: options.model || 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: originalPrompt }
      ],
      temperature: 0.7,
      max_tokens: 300
    });
    
    return {
      original: originalPrompt,
      enhanced: completion.choices[0].message.content,
      tokensUsed: completion.usage.total_tokens,
      model: options.model
    };
  }
}
```

### 6.2 Service Génération Images

```typescript
export class ImageGeneratorService {
  async generate(
    prompt: string,
    userImageKey: string,
    options: ImageGenOptions = {}
  ): Promise<GeneratedImage> {
    const provider = this.getProvider(options.provider || 'dalle');
    
    const result = await provider.generate({
      apiKey: userImageKey,
      prompt,
      size: options.size || '1024x1024',
      quality: options.quality || 'standard'
    });
    
    // Upload vers S3
    const s3Url = await this.uploadToS3(result.imageData, {
      userId: options.userId,
      generationId: result.id
    });
    
    return {
      id: result.id,
      url: s3Url,
      cdnUrl: this.getCDNUrl(s3Url),
      prompt,
      size: options.size,
      generationTime: Date.now() - startTime
    };
  }
}
```

### 6.3 Service Génération Vidéo

```typescript
export class VideoGeneratorService {
  async generateFromImage(
    imageUrl: string,
    userVO3Key: string,
    options: VideoGenOptions = {}
  ): Promise<GeneratedVideo> {
    const vo3Client = new VO3Client({ apiKey: userVO3Key });
    
    // Initier génération
    const job = await vo3Client.createVideoFromImage({
      imageUrl,
      duration: options.duration || 8,
      motionIntensity: options.motionIntensity || 'medium'
    });
    
    // Polling asynchrone
    let status = 'processing';
    while (status === 'processing') {
      await sleep(5000);
      const jobStatus = await vo3Client.getJobStatus(job.id);
      status = jobStatus.status;
      
      // Update en temps réel via WebSocket
      await this.updateNodeStatus({
        nodeId: options.nodeId,
        status: 'loading',
        progress: jobStatus.progress
      });
    }
    
    // Upload résultat vers S3
    const s3Url = await this.uploadVideoToS3(result.videoData);
    
    return {
      id: result.id,
      url: s3Url,
      cdnUrl: this.getCDNUrl(s3Url),
      duration: result.duration,
      generationTime: Date.now() - startTime
    };
  }
}
```

---

## 7. API Endpoints

### 7.1 Gestion Clés API

```typescript
// POST /api/user/api-keys
async function saveApiKeys(req: Request) {
  const { openaiKey, imageGenKey, vo3Key } = await req.json();
  const userId = getAuthUserId(req);
  
  // Validation des clés
  const validations = await Promise.all([
    validateOpenAIKey(openaiKey),
    validateImageGenKey(imageGenKey),
    validateVO3Key(vo3Key)
  ]);
  
  // Chiffrement AES-256
  const encryption = new EncryptionService();
  const encrypted = {
    openaiKey: encryption.encrypt(openaiKey),
    imageGenKey: encryption.encrypt(imageGenKey),
    vo3Key: encryption.encrypt(vo3Key)
  };
  
  // Sauvegarde en DB
  await prisma.userApiKeys.upsert({
    where: { userId },
    update: encrypted,
    create: { userId, ...encrypted }
  });
  
  return Response.json({ success: true });
}
```

### 7.2 Exécution Workflow

```typescript
// POST /api/workflow/execute
async function executeWorkflow(req: Request) {
  const { nodes, edges, initialPrompt } = await req.json();
  const userId = getAuthUserId(req);
  
  // Vérification crédits
  const estimatedCost = calculateWorkflowCost(nodes);
  if (!hasEnoughCredits(userId, estimatedCost)) {
    return Response.json({
      error: 'Insufficient credits',
      required: estimatedCost,
      available: await getUserCredits(userId)
    }, { status: 402 });
  }
  
  // Récupération clés utilisateur
  const userKeys = await getUserApiKeys(userId);
  
  // Lancement job Inngest
  const job = await inngest.send({
    name: 'workflow.execute',
    data: { userId, nodes, edges, initialPrompt, userKeys }
  });
  
  return Response.json({
    jobId: job.id,
    estimatedDuration: estimateWorkflowDuration(nodes),
    estimatedCost
  });
}
```

### 7.3 Gestion Crédits

```typescript
// GET /api/credits/balance
async function getCreditsBalance(req: Request) {
  const userId = getAuthUserId(req);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      credits: true,
      creditsUsed: true,
      plan: true,
      creditHistory: {
        take: 10,
        orderBy: { createdAt: 'desc' }
      }
    }
  });
  return Response.json(user);
}

// POST /api/credits/deduct
async function deductCredits(req: Request) {
  const { amount, reason, metadata } = await req.json();
  const userId = getAuthUserId(req);
  
  // Transaction atomique
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true }
    });
    
    if (user.credits < amount) {
      throw new Error('Insufficient credits');
    }
    
    // Déduction + historique
    await tx.user.update({
      where: { id: userId },
      data: {
        credits: { decrement: amount },
        creditsUsed: { increment: amount }
      }
    });
    
    await tx.creditTransaction.create({
      data: { userId, type: 'debit', amount, reason, metadata }
    });
    
    return { success: true, remainingCredits: user.credits - amount };
  });
  
  // Notification WebSocket
  await notifyUser(userId, {
    type: 'credits_updated',
    data: result
  });
  
  return Response.json(result);
}
```

---

## 8. Job Inngest Principal

```typescript
export const executeWorkflow = inngest.createFunction(
  {
    id: 'execute-workflow',
    name: 'Execute Content Creation Workflow',
    concurrency: { limit: 5, key: 'event.data.userId' }
  },
  { event: 'workflow.execute' },
  async ({ event, step }) => {
    const { userId, nodes, initialPrompt, userKeys } = event.data;
    
    // Step 1: Amélioration prompt
    const enhancedPrompt = await step.run('enhance-prompt', async () => {
      await updateNodeStatus(nodes[0].id, 'loading');
      const enhancer = new PromptEnhancerService();
      const result = await enhancer.enhance(initialPrompt, userKeys.openai);
      await updateNodeStatus(nodes[0].id, 'success', { output: result.enhanced });
      return result.enhanced;
    });
    
    // Step 2: Génération image
    const generatedImage = await step.run('generate-image', async () => {
      await updateNodeStatus(nodes[1].id, 'loading');
      const imageGen = new ImageGeneratorService();
      const result = await imageGen.generate(enhancedPrompt, userKeys.imageGen, { userId });
      await updateNodeStatus(nodes[1].id, 'success', { output: result.cdnUrl });
      return result;
    });
    
    // Step 3: Génération vidéo
    const generatedVideo = await step.run('generate-video', async () => {
      await updateNodeStatus(nodes[2].id, 'loading');
      const videoGen = new VideoGeneratorService();
      const result = await videoGen.generateFromImage(
        generatedImage.cdnUrl, 
        userKeys.vo3, 
        { userId, nodeId: nodes[2].id }
      );
      await updateNodeStatus(nodes[2].id, 'success', { output: result.cdnUrl });
      return result;
    });
    
    // Step 4: Déduction crédits
    await step.run('deduct-credits', async () => {
      const totalCost = calculateActualCost({
        promptTokens: enhancedPrompt.tokensUsed,
        imageSize: generatedImage.size,
        videoDuration: generatedVideo.duration
      });
      
      await deductUserCredits(userId, totalCost, {
        workflowId: event.id,
        breakdown: {
          prompt: 1,
          image: getImageCreditCost(generatedImage.size),
          video: getVideoCreditCost(generatedVideo.duration)
        }
      });
    });
    
    // Step 5: Sauvegarde résultat
    const savedContent = await step.run('save-content', async () => {
      return await prisma.content.create({
        data: {
          userId,
          type: 'video',
          title: `Génération du ${new Date().toLocaleDateString()}`,
          originalPrompt: initialPrompt,
          enhancedPrompt,
          imageUrl: generatedImage.cdnUrl,
          videoUrl: generatedVideo.cdnUrl,
          status: 'completed'
        }
      });
    });
    
    // Notification finale
    await notifyUser(userId, {
      type: 'workflow_completed',
      data: {
        contentId: savedContent.id,
        videoUrl: generatedVideo.cdnUrl,
        totalDuration: Date.now() - event.timestamp
      }
    });
    
    return savedContent;
  }
);
```

---

## 9. Base de Données (Prisma Schema)

### Modifications Requises

```prisma
// Ajouts au modèle User existant
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  name            String?
  
  // Nouveaux champs V2
  plan            Plan     @default(FREE)
  credits         Int      @default(100)
  creditsUsed     Int      @default(0)
  
  // Relations
  apiKeys         UserApiKeys?
  creditHistory   CreditTransaction[]
  contents        Content[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// Nouvelle table pour clés API
model UserApiKeys {
  id                String   @id @default(cuid())
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  openaiKey         String?
  imageGenKey       String?
  vo3Key           String?
  encryptionIV      String
  
  validationStatus  Json     @default("{}")
  lastUpdated       DateTime @default(now())
  createdAt         DateTime @default(now())
}

// Nouvelle table pour historique crédits
model CreditTransaction {
  id        String      @id @default(cuid())
  userId    String
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  type      TransactionType
  amount    Int
  reason    String
  metadata  Json?
  
  createdAt DateTime    @default(now())
  
  @@index([userId])
  @@index([createdAt])
}

// Nouveau modèle pour contenus générés
model Content {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  type            String   // 'image' | 'video'
  title           String
  originalPrompt  String
  enhancedPrompt  String?
  
  imageUrl        String?
  videoUrl        String?
  thumbnailUrl    String?
  
  metadata        Json?
  status          ContentStatus @default(PROCESSING)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([userId])
  @@index([status])
}

// Enums
enum Plan {
  FREE
  STARTER
  PRO
  ENTERPRISE
}

enum TransactionType {
  DEBIT
  CREDIT
}

enum ContentStatus {
  PROCESSING
  COMPLETED
  FAILED
}
```

---

## 10. Tests et Validation

### Tests Unitaires Critiques

```typescript
// __tests__/services/prompt-enhancer.test.ts
describe('PromptEnhancerService', () => {
  it('should enhance a basic prompt with visual details', async () => {
    const service = new PromptEnhancerService();
    const result = await service.enhance('a cat on a chair', mockOpenAIKey);
    
    expect(result.enhanced).toContain('lighting');
    expect(result.enhanced.length).toBeGreaterThan(result.original.length);
    expect(result.tokensUsed).toBeGreaterThan(0);
  });
  
  it('should handle invalid API key gracefully', async () => {
    const service = new PromptEnhancerService();
    await expect(
      service.enhance('test', 'invalid-key')
    ).rejects.toThrow(PromptEnhancementError);
  });
});

// __tests__/api/credits.test.ts
describe('Credits System', () => {
  it('should deduct credits atomically', async () => {
    const initialCredits = await getUserCredits(testUserId);
    await deductCredits(testUserId, 10, 'test');
    const finalCredits = await getUserCredits(testUserId);
    
    expect(finalCredits).toBe(initialCredits - 10);
  });
  
  it('should prevent negative credit balance', async () => {
    await expect(
      deductCredits(testUserId, 999999, 'test')
    ).rejects.toThrow('Insufficient credits');
  });
  
  it('should create transaction history entry', async () => {
    await deductCredits(testUserId, 5, 'image_gen');
    const history = await getCreditHistory(testUserId, 1);
    
    expect(history).toHaveLength(1);
    expect(history[0].amount).toBe(5);
    expect(history[0].reason).toBe('image_gen');
  });
});
```

### Tests d'Intégration E2E

```typescript
// __tests__/e2e/workflow.test.ts
describe('Complete Workflow Integration', () => {
  it('should execute full workflow from prompt to video', async () => {
    // Setup test user with valid API keys
    const user = await createTestUser({
      credits: 100,
      apiKeys: {
        openai: process.env.TEST_OPENAI_KEY,
        imageGen: process.env.TEST_DALLE_KEY,
        vo3: process.env.TEST_VO3_KEY
      }
    });
    
    // Execute workflow
    const result = await executeWorkflow({
      userId: user.id,
      initialPrompt: 'A serene mountain landscape at sunset',
      nodes: createTestWorkflowNodes()
    });
    
    // Verify completion
    expect(result.status).toBe('completed');
    expect(result.videoUrl).toMatch(/\.mp4$/);
    expect(result.imageUrl).toMatch(/\.(jpg|png)$/);
    expect(result.generationTime).toBeLessThan(300000); // 5 min max
    
    // Verify credits deducted
    const finalCredits = await getUserCredits(user.id);
    expect(finalCredits).toBeLessThan(100);
    
    // Verify files exist on S3
    const imageExists = await checkS3FileExists(result.imageUrl);
    const videoExists = await checkS3FileExists(result.videoUrl);
    expect(imageExists).toBe(true);
    expect(videoExists).toBe(true);
  });
});
```

---

## 11. Structure de Fichiers Complète

```
/app
  /create
    page.tsx                 # ✏️ MODIFIER - Ajouter WorkflowCanvas
    /components
      WorkflowCanvas.tsx    # ➕ NOUVEAU
      WorkflowControls.tsx  # ➕ NOUVEAU
      /nodes               # ➕ NOUVEAU DOSSIER
        PromptNode.tsx
        EnhanceNode.tsx
        ImageGenNode.tsx
        VideoGenNode.tsx
        OutputNode.tsx
  
  /settings
    page.tsx                # ✏️ MODIFIER - Ajouter ApiKeysSection
    /components
      ApiKeysSection.tsx   # ➕ NOUVEAU
      ApiKeyInput.tsx      # ➕ NOUVEAU
  
  /dashboard
    page.tsx                # ✏️ MODIFIER - Ajouter CreditsWidget
  
  /api
    /user
      /api-keys           # ➕ NOUVEAU DOSSIER
        route.ts          # POST/GET/PUT pour clés API
    /workflow            # ➕ NOUVEAU DOSSIER
      /execute
        route.ts          # POST pour lancer workflow
      /status
        route.ts          # GET pour statut job
    /credits            # ➕ NOUVEAU DOSSIER
      /balance
        route.ts          # GET pour solde crédits
      /deduct
        route.ts          # POST pour déduction
      /history
        route.ts          # GET pour historique

/components
  /dashboard
    CreditsWidget.tsx    # ➕ NOUVEAU
    CircularProgress.tsx # ➕ NOUVEAU
  /workflow
    /nodes              # ➕ NOUVEAU DOSSIER
      (voir ci-dessus)

/services              # ➕ NOUVEAU DOSSIER
  prompt-enhancer.ts
  image-generator.ts
  video-generator.ts
  encryption.ts
  
/lib
  /providers          # ➕ NOUVEAU DOSSIER
    openai.ts
    dalle.ts
    vo3.ts
  /utils
    credits.ts        # ➕ NOUVEAU
    workflow.ts       # ➕ NOUVEAU
    
/inngest
  /functions
    workflow.ts      # ➕ NOUVEAU

/prisma
  schema.prisma     # ✏️ MODIFIER - Ajouter nouveaux modèles
  /migrations
    v2_add_credits_and_api_keys.sql # ➕ NOUVEAU

/__tests__
  /services         # ➕ NOUVEAU DOSSIER
    prompt-enhancer.test.ts
    image-generator.test.ts
  /api              # ➕ NOUVEAU DOSSIER
    credits.test.ts
    workflow.test.ts
  /e2e              # ➕ NOUVEAU DOSSIER
    workflow.test.ts
```

---

## 12. Roadmap de Développement

### Phase 1 - Foundation (Semaines 1-2)
- [ ] **Base de Données**
  - Modifier schema Prisma avec nouveaux modèles
  - Créer et exécuter migrations
  - Générer types TypeScript
  
- [ ] **Sécurité**
  - Implémenter EncryptionService (AES-256)
  - Tester chiffrement/déchiffrement
  - Setup variables environnement

- [ ] **API Keys Management**
  - Créer composants ApiKeysSection + ApiKeyInput
  - Endpoints API pour CRUD clés
  - Validation des clés par provider

### Phase 2 - Workflow Core (Semaines 3-4)
- [ ] **Workflow Canvas**
  - Setup React Flow
  - Créer les 5 composants de nœuds
  - Implémenter états visuels et animations
  
- [ ] **Services Backend**
  - PromptEnhancerService avec OpenAI
  - ImageGeneratorService avec DALL-E
  - VideoGeneratorService avec VO3
  
- [ ] **Système Crédits**
  - Logique de calcul et déduction
  - Widget dashboard avec visualisation
  - Historique des transactions

### Phase 3 - Integration (Semaines 5-6)
- [ ] **Job Orchestration**
  - Inngest workflow principal
  - Gestion erreurs et retry
  - Updates temps réel via WebSocket
  
- [ ] **Storage & CDN**
  - Upload S3 pour images/vidéos
  - Configuration CloudFront
  - Cleanup automatique anciens fichiers

### Phase 4 - Testing & Launch (Semaines 7-8)
- [ ] **Tests Complets**
  - Tests unitaires tous services
  - Tests intégration API
  - Tests E2E workflow complet
  
- [ ] **Performance & Security**
  - Load testing
  - Security audit
  - Optimisations performance

---

## 13. Monitoring et Métriques

### Analytics Events
```typescript
const ANALYTICS_EVENTS = {
  'workflow.started': { userId, workflowId, estimatedCost },
  'workflow.completed': { userId, workflowId, actualCost, duration },
  'workflow.failed': { userId, workflowId, failedNode, errorType },
  'apikey.added': { userId, keyType },
  'apikey.validation_failed': { userId, keyType, errorCode },
  'credits.depleted': { userId, plan, lastAction },
  'generation.prompt_enhanced': { userId, tokensUsed, model },
  'generation.image_created': { userId, size, provider, duration },
  'generation.video_created': { userId, duration, resolution }
};
```

### Dashboard Admin
- Workflows actifs en temps réel
- Taux de succès/échec par étape
- Consommation crédits moyenne
- Temps de génération P95/P99
- Erreurs API par provider
- ROI crédits vs coûts infrastructure

---

## 14. Critères d'Acceptation V2

### Fonctionnels ✅
- [ ] Utilisateur peut configurer et tester ses 3 clés API
- [ ] Workflow visuel affiche états des 5 nœuds en temps réel
- [ ] Prompts sont automatiquement améliorés via ChatGPT
- [ ] Pipeline complet prompt → image → vidéo fonctionne
- [ ] Crédits sont correctement calculés et déduits
- [ ] Système de remboursement en cas d'erreur plateforme

### Techniques ✅
- [ ] Temps génération total < 5 minutes (workflow standard)
- [ ] Clés API chiffrées AES-256, jamais en clair
- [ ] Taux de succès workflows > 95%
- [ ] Support concurrence 50 utilisateurs simultanés
- [ ] Recovery automatique sur pannes services externes

### UX ✅
- [ ] Interface workflow intuitive sans formation
- [ ] Feedback visuel immédiat chaque action
- [ ] Messages d'erreur constructifs et actionnables
- [ ] Possibilité annuler workflow en cours
- [ ] Sauvegarde templates pour réutilisation

### Sécurité ✅
- [ ] Zero-knowledge des clés API côté serveur
- [ ] Rate limiting strict par utilisateur
- [ ] Audit trail complet générations
- [ ] Validation input utilisateur (XSS/injection)
- [ ] Chiffrement transit (HTTPS) et repos (AES-256)

---

## 15. Points d'Attention Critiques

### ⚠️ Sécurité Absolue
- **Clés API** : Jamais en logs, erreurs, ou réponses API
- **Chiffrement** : AES-256 avec rotation clés automatique
- **Validation** : Tous inputs utilisateur sanitisés
- **Audit** : Log complet toutes actions sensibles

### 🚀 Performance
- **Cache** : Redis pour statuts workflow et clés déchiffrées
- **CDN** : CloudFront pour assets générés
- **DB** : Index optimaux sur requêtes fréquentes
- **Jobs** : Concurrence limitée et queue prioritaire

### 💰 Coûts
- **Monitoring** : Tracking strict appels API externes
- **Alerting** : Seuils sur consommation anormale
- **Cleanup** : Suppression automatique anciens assets
- **Optimization** : Cache résultats similaires

### 👥 UX
- **Feedback** : Temps réel même sur générations longues
- **Erreurs** : Messages clairs avec actions correctives
- **Performance** : Interface fluide même sous charge
- **Mobile** : Support responsive workflow canvas

---

**Document V2 Finalisé - Prêt pour Implémentation**

*Version: 2.0*  
*Date: 04/09/2025*  
*Statut: APPROUVÉ pour développement*  
*Prochaine Review: Post Phase 1*