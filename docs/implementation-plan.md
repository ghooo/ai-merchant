# AI Merchant Assistant - Implementation Plan

## Overview

This plan breaks down the MVP into actionable implementation steps organized by phase.

---

## Phase 1: Project Setup

### 1.1 Initialize Next.js Project

```bash
npx create-next-app@14 ai-merchant --typescript --tailwind --app --src-dir=false
cd ai-merchant
```

**Files created:**
- `app/layout.tsx`
- `app/page.tsx`
- `tailwind.config.ts`
- `tsconfig.json`

### 1.2 Install Dependencies

```bash
# Core
npm install openai better-sqlite3 chromadb pdf-parse

# Types
npm install -D @types/better-sqlite3

# Dev utilities
npm install -D tsx
```

**package.json scripts:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:init": "tsx scripts/init-db.ts"
  }
}
```

### 1.3 Project Structure

Create the following directory structure:

```
ai-merchant/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts
│   │   ├── inventory/
│   │   │   └── route.ts
│   │   ├── scenario/
│   │   │   └── route.ts
│   │   └── documents/
│   │       ├── upload/
│   │       │   └── route.ts
│   │       └── route.ts
│   ├── components/
│   │   ├── ChatContainer.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── WidgetCard.tsx
│   │   ├── ResultsTable.tsx
│   │   └── StatusBadge.tsx
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── db.ts
│   ├── openai.ts
│   ├── chroma.ts
│   ├── rag.ts
│   ├── restock.ts
│   └── prompts.ts
├── scripts/
│   └── init-db.ts
├── data/
│   └── .gitkeep
├── chroma-data/
│   └── .gitkeep
├── uploads/
│   └── .gitkeep
├── .env.local
└── .env.example
```

### 1.4 Environment Setup

**.env.example:**
```bash
OPENAI_API_KEY=sk-...
CHROMA_URL=http://localhost:8000
```

### 1.5 Database Schema & Seed

**scripts/init-db.ts:**
```typescript
import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data', 'app.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS skus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku_number TEXT UNIQUE NOT NULL,
    sku_name TEXT NOT NULL,
    current_inventory INTEGER NOT NULL,
    daily_forecasted_sales REAL NOT NULL,
    safety_days INTEGER NOT NULL,
    lead_time_days INTEGER NOT NULL,
    restock_cadence_days INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Seed data
const skus = [
  { sku_number: 'SKU-001', sku_name: 'Wireless Headphones', current_inventory: 1250, daily_forecasted_sales: 45, safety_days: 5, lead_time_days: 7, restock_cadence_days: 14 },
  { sku_number: 'SKU-002', sku_name: 'USB-C Cable', current_inventory: 180, daily_forecasted_sales: 80, safety_days: 3, lead_time_days: 5, restock_cadence_days: 7 },
  { sku_number: 'SKU-003', sku_name: 'Bluetooth Speaker', current_inventory: 45, daily_forecasted_sales: 30, safety_days: 5, lead_time_days: 10, restock_cadence_days: 14 },
  { sku_number: 'SKU-004', sku_name: 'Phone Case', current_inventory: 0, daily_forecasted_sales: 60, safety_days: 3, lead_time_days: 7, restock_cadence_days: 7 },
];

const insert = db.prepare(`
  INSERT OR REPLACE INTO skus (sku_number, sku_name, current_inventory, daily_forecasted_sales, safety_days, lead_time_days, restock_cadence_days)
  VALUES (@sku_number, @sku_name, @current_inventory, @daily_forecasted_sales, @safety_days, @lead_time_days, @restock_cadence_days)
`);

for (const sku of skus) {
  insert.run(sku);
}

console.log('Database initialized with seed data');
db.close();
```

---

## Phase 2: Core Libraries

### 2.1 Database Client

**lib/db.ts:**
```typescript
import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data', 'app.db'));

export interface SKU {
  id: number;
  sku_number: string;
  sku_name: string;
  current_inventory: number;
  daily_forecasted_sales: number;
  safety_days: number;
  lead_time_days: number;
  restock_cadence_days: number;
}

export function getAllSkus(): SKU[] {
  return db.prepare('SELECT * FROM skus').all() as SKU[];
}

export function getSkuByNumber(sku_number: string): SKU | undefined {
  return db.prepare('SELECT * FROM skus WHERE sku_number = ?').get(sku_number) as SKU | undefined;
}

export default db;
```

### 2.2 OpenAI Client

**lib/openai.ts:**
```typescript
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}
```

### 2.3 Restock Calculator

**lib/restock.ts:**
```typescript
import { getSkuByNumber, type SKU } from './db';

export interface RestockResult {
  sku_number: string;
  sku_name: string;
  current_inventory: number;
  daily_forecasted_sales: number;
  lead_time_days: number;
  safety_days: number;
  restock_cadence_days: number;
  coverage_days: number;
  required_stock: number;
  restock_amount: number;
  days_of_stock: number;
  health_status: 'Healthy' | 'Low' | 'Critical' | 'Out of Stock';
  formula_used: string;
}

export interface RestockOverrides {
  lead_time_days?: number;
  safety_days?: number;
  restock_cadence_days?: number;
  daily_forecasted_sales?: number;
}

export function calculateRestock(
  sku_number: string,
  overrides?: RestockOverrides
): RestockResult | null {
  const sku = getSkuByNumber(sku_number);
  if (!sku) return null;

  // Apply overrides
  const lead_time = overrides?.lead_time_days ?? sku.lead_time_days;
  const safety_days = overrides?.safety_days ?? sku.safety_days;
  const restock_cadence = overrides?.restock_cadence_days ?? sku.restock_cadence_days;
  const daily_sales = overrides?.daily_forecasted_sales ?? sku.daily_forecasted_sales;

  // Calculate
  const coverage_days = lead_time + safety_days + restock_cadence;
  const required_stock = daily_sales * coverage_days;
  const restock_amount = Math.max(0, Math.ceil(required_stock - sku.current_inventory));
  const days_of_stock = daily_sales > 0
    ? Math.floor(sku.current_inventory / daily_sales)
    : Infinity;

  // Determine health status
  let health_status: RestockResult['health_status'];
  if (sku.current_inventory === 0) {
    health_status = 'Out of Stock';
  } else if (days_of_stock < 15) {
    health_status = 'Critical';
  } else if (days_of_stock < 30) {
    health_status = 'Low';
  } else {
    health_status = 'Healthy';
  }

  return {
    sku_number: sku.sku_number,
    sku_name: sku.sku_name,
    current_inventory: sku.current_inventory,
    daily_forecasted_sales: daily_sales,
    lead_time_days: lead_time,
    safety_days,
    restock_cadence_days: restock_cadence,
    coverage_days,
    required_stock,
    restock_amount,
    days_of_stock,
    health_status,
    formula_used: `${daily_sales} × (${lead_time} + ${safety_days} + ${restock_cadence}) − ${sku.current_inventory} = ${restock_amount}`,
  };
}
```

### 2.4 System Prompt & Functions

**lib/prompts.ts:**
```typescript
export const SYSTEM_PROMPT = `You are an AI Merchant Assistant that helps ecommerce sellers manage inventory and make restock decisions.

## Your Capabilities
- Check inventory health across all SKUs
- Calculate restock recommendations using the standard formula
- Run what-if scenarios by adjusting variables
- Answer questions using supply chain knowledge from the knowledge base

## Available Functions
You have access to these functions:
- get_inventory(): Returns all SKU data from the database
- get_sku(sku_number): Returns data for a specific SKU
- calculate_restock(sku_number, overrides?): Calculate restock with optional variable overrides
- search_knowledge(query): Searches the knowledge base for relevant information

## Restock Formula
Always use this formula for calculations:
Restock Amount = (Daily_Forecasted_Sales × (Lead_Time + Safety_Days + Restock_Cadence)) − Current_Inventory

## Inventory Health Status
- Healthy: Current inventory covers > 30 days of demand
- Low: Current inventory covers 15-30 days of demand
- Critical: Current inventory covers < 15 days of demand
- Out of Stock: Current inventory = 0

## Response Guidelines
1. ALWAYS explain your reasoning before showing results
2. Show the input values and formula used for transparency
3. For calculations, respond in JSON format:
   {
     "reasoning": "explanation of assumptions and steps",
     "results": [{ sku data and recommendations }]
   }
4. For clarifying questions, respond in plain text
5. If user asks about supply chain concepts, search the knowledge base first

## Behavior Rules
- Use SKU-level data for calculations unless user provides overrides
- State assumptions clearly before proceeding
- Never skip to conclusions without explaining the logic first
- Be concise but thorough in explanations
`;

export const FUNCTIONS = [
  {
    name: 'get_inventory',
    description: 'Get all SKUs with current inventory levels and parameters',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_sku',
    description: 'Get data for a specific SKU by SKU number',
    parameters: {
      type: 'object',
      properties: {
        sku_number: { type: 'string', description: 'The SKU identifier' },
      },
      required: ['sku_number'],
    },
  },
  {
    name: 'calculate_restock',
    description: 'Calculate restock recommendation for a SKU with optional variable overrides for what-if scenarios',
    parameters: {
      type: 'object',
      properties: {
        sku_number: { type: 'string', description: 'The SKU identifier' },
        lead_time_days: { type: 'number', description: 'Override lead time in days' },
        safety_days: { type: 'number', description: 'Override safety days' },
        restock_cadence_days: { type: 'number', description: 'Override restock cadence in days' },
        daily_forecasted_sales: { type: 'number', description: 'Override daily demand' },
      },
      required: ['sku_number'],
    },
  },
  {
    name: 'search_knowledge',
    description: 'Search the knowledge base for supply chain definitions, formulas, and best practices',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
];
```

---

## Phase 3: RAG Infrastructure

### 3.1 ChromaDB Client

**lib/chroma.ts:**
```typescript
import { ChromaClient, Collection } from 'chromadb';

let client: ChromaClient | null = null;
let collection: Collection | null = null;

export async function getChromaCollection(): Promise<Collection> {
  if (collection) return collection;

  client = new ChromaClient({ path: process.env.CHROMA_URL });
  collection = await client.getOrCreateCollection({
    name: 'knowledge_base',
    metadata: { 'hnsw:space': 'cosine' },
  });

  return collection;
}

export async function addDocuments(
  ids: string[],
  documents: string[],
  embeddings: number[][],
  metadatas: Record<string, string>[]
): Promise<void> {
  const col = await getChromaCollection();
  await col.add({ ids, documents, embeddings, metadatas });
}

export async function searchDocuments(
  queryEmbedding: number[],
  nResults: number = 5
): Promise<{ documents: string[]; metadatas: Record<string, string>[] }> {
  const col = await getChromaCollection();
  const results = await col.query({
    queryEmbeddings: [queryEmbedding],
    nResults,
  });

  return {
    documents: results.documents?.[0] ?? [],
    metadatas: (results.metadatas?.[0] ?? []) as Record<string, string>[],
  };
}
```

### 3.2 RAG Module

**lib/rag.ts:**
```typescript
import { createEmbedding } from './openai';
import { searchDocuments, addDocuments } from './chroma';
import pdfParse from 'pdf-parse';
import { randomUUID } from 'crypto';

const CHUNK_SIZE = 500; // tokens (approximate)
const CHUNK_OVERLAP = 50;

export async function ingestPDF(
  buffer: Buffer,
  filename: string
): Promise<{ documentId: string; chunksCreated: number }> {
  const documentId = randomUUID();

  // Parse PDF
  const data = await pdfParse(buffer);
  const text = data.text;

  // Split into chunks
  const chunks = splitIntoChunks(text, CHUNK_SIZE, CHUNK_OVERLAP);

  // Generate embeddings and store
  const ids: string[] = [];
  const documents: string[] = [];
  const embeddings: number[][] = [];
  const metadatas: Record<string, string>[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await createEmbedding(chunk);

    ids.push(`${documentId}-${i}`);
    documents.push(chunk);
    embeddings.push(embedding);
    metadatas.push({
      document_id: documentId,
      filename,
      chunk_index: String(i),
    });
  }

  await addDocuments(ids, documents, embeddings, metadatas);

  return { documentId, chunksCreated: chunks.length };
}

export async function searchKnowledge(query: string): Promise<string[]> {
  const queryEmbedding = await createEmbedding(query);
  const results = await searchDocuments(queryEmbedding, 5);
  return results.documents;
}

function splitIntoChunks(
  text: string,
  chunkSize: number,
  overlap: number
): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim()) {
      chunks.push(chunk);
    }
  }

  return chunks;
}
```

---

## Phase 4: API Routes

### 4.1 Chat Endpoint

**app/api/chat/route.ts:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { getAllSkus, getSkuByNumber } from '@/lib/db';
import { calculateRestock } from '@/lib/restock';
import { searchKnowledge } from '@/lib/rag';
import { SYSTEM_PROMPT, FUNCTIONS } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    // Initial call to OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      functions: FUNCTIONS,
      function_call: 'auto',
    });

    const assistantMessage = response.choices[0].message;

    // Check if function call is needed
    if (assistantMessage.function_call) {
      const functionName = assistantMessage.function_call.name;
      const functionArgs = JSON.parse(assistantMessage.function_call.arguments);

      // Execute function
      let functionResult: unknown;
      switch (functionName) {
        case 'get_inventory':
          functionResult = getAllSkus();
          break;
        case 'get_sku':
          functionResult = getSkuByNumber(functionArgs.sku_number);
          break;
        case 'calculate_restock':
          functionResult = calculateRestock(functionArgs.sku_number, {
            lead_time_days: functionArgs.lead_time_days,
            safety_days: functionArgs.safety_days,
            restock_cadence_days: functionArgs.restock_cadence_days,
            daily_forecasted_sales: functionArgs.daily_forecasted_sales,
          });
          break;
        case 'search_knowledge':
          functionResult = await searchKnowledge(functionArgs.query);
          break;
        default:
          throw new Error(`Unknown function: ${functionName}`);
      }

      // Second call with function result
      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message },
          assistantMessage,
          {
            role: 'function',
            name: functionName,
            content: JSON.stringify(functionResult),
          },
        ],
      });

      return NextResponse.json({
        response: finalResponse.choices[0].message.content,
      });
    }

    // No function call, return direct response
    return NextResponse.json({
      response: assistantMessage.content,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    );
  }
}
```

### 4.2 Inventory Endpoint

**app/api/inventory/route.ts:**
```typescript
import { NextResponse } from 'next/server';
import { getAllSkus } from '@/lib/db';
import { calculateRestock } from '@/lib/restock';

export async function GET() {
  try {
    const skus = getAllSkus();

    const inventory = skus.map(sku => {
      const restock = calculateRestock(sku.sku_number);
      return {
        ...sku,
        restock_amount: restock?.restock_amount ?? 0,
        health_status: restock?.health_status ?? 'Unknown',
        days_of_stock: restock?.days_of_stock ?? 0,
      };
    });

    return NextResponse.json({ inventory });
  } catch (error) {
    console.error('Inventory error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}
```

### 4.3 Document Upload Endpoint

**app/api/documents/upload/route.ts:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ingestPDF } from '@/lib/rag';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files allowed' }, { status: 400 });
    }

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    const filepath = path.join(process.cwd(), 'uploads', file.name);
    await writeFile(filepath, buffer);

    // Ingest into RAG
    const result = await ingestPDF(buffer, file.name);

    return NextResponse.json({
      document_id: result.documentId,
      filename: file.name,
      chunks_created: result.chunksCreated,
      status: 'processed',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    );
  }
}
```

---

## Phase 5: Frontend Components

### 5.1 Main Page

**app/page.tsx:**
```typescript
'use client';

import { useState } from 'react';
import ChatContainer from './components/ChatContainer';
import WidgetCard from './components/WidgetCard';

export default function Home() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (message: string) => {
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const widgets = [
    {
      id: 'inventory',
      icon: '📦',
      title: 'Inventory Health',
      description: 'Check stock levels and recommendations',
      prompt: 'Show me my inventory health and restock recommendations',
    },
    {
      id: 'whatif',
      icon: '🔮',
      title: 'What-If Scenario',
      description: 'Run restock scenarios with custom variables',
      prompt: 'I want to run a what-if scenario for my inventory',
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          AI Merchant Assistant
        </h1>

        <ChatContainer
          messages={messages}
          isLoading={isLoading}
          onSendMessage={sendMessage}
        />

        {messages.length === 0 && (
          <div className="grid grid-cols-2 gap-4 mt-6">
            {widgets.map(widget => (
              <WidgetCard
                key={widget.id}
                icon={widget.icon}
                title={widget.title}
                description={widget.description}
                onClick={() => sendMessage(widget.prompt)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
```

### 5.2 Chat Container

**app/components/ChatContainer.tsx:**
```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

interface ChatContainerProps {
  messages: Array<{ role: string; content: string }>;
  isLoading: boolean;
  onSendMessage: (message: string) => void;
}

export default function ChatContainer({
  messages,
  isLoading,
  onSendMessage,
}: ChatContainerProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="h-96 overflow-y-auto p-6">
        {messages.map((msg, i) => (
          <MessageBubble key={i} role={msg.role} content={msg.content} />
        ))}
        {isLoading && (
          <MessageBubble role="assistant" content="" isLoading />
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about inventory, pricing, or type your question..."
            className="flex-1 px-4 py-3 rounded-full bg-gray-50 border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            ➤
          </button>
        </div>
      </form>
    </div>
  );
}
```

### 5.3 Message Bubble

**app/components/MessageBubble.tsx:**
```typescript
interface MessageBubbleProps {
  role: string;
  content: string;
  isLoading?: boolean;
}

export default function MessageBubble({
  role,
  content,
  isLoading,
}: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3 flex-shrink-0">
          🤖
        </div>
      )}
      <div
        className={`max-w-[70%] px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }`}
      >
        {isLoading ? (
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        ) : (
          <div className="text-sm whitespace-pre-wrap">{content}</div>
        )}
      </div>
    </div>
  );
}
```

### 5.4 Widget Card

**app/components/WidgetCard.tsx:**
```typescript
interface WidgetCardProps {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}

export default function WidgetCard({
  icon,
  title,
  description,
  onClick,
}: WidgetCardProps) {
  return (
    <button
      onClick={onClick}
      className="p-4 bg-white border border-gray-200 rounded-xl text-left hover:border-blue-500 hover:shadow-md transition-all"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-semibold text-gray-900">{title}</div>
      <div className="text-sm text-gray-500">{description}</div>
    </button>
  );
}
```

### 5.5 Status Badge

**app/components/StatusBadge.tsx:**
```typescript
interface StatusBadgeProps {
  status: 'Healthy' | 'Low' | 'Critical' | 'Out of Stock';
}

const statusStyles = {
  Healthy: 'bg-green-100 text-green-800',
  Low: 'bg-yellow-100 text-yellow-800',
  Critical: 'bg-red-100 text-red-800',
  'Out of Stock': 'bg-gray-900 text-white',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
```

---

## Phase 6: Testing & Polish

### 6.1 Manual Testing Checklist

- [ ] Database initializes with seed data
- [ ] ChromaDB starts and accepts connections
- [ ] Chat responds to "Show inventory health"
- [ ] Chat responds to specific SKU queries
- [ ] What-if scenarios return comparison data
- [ ] PDF upload creates embeddings
- [ ] Knowledge search returns relevant chunks
- [ ] UI renders messages correctly
- [ ] Widget clicks trigger correct prompts
- [ ] Loading states display properly
- [ ] Error states handled gracefully

### 6.2 Run Commands

```bash
# Terminal 1: Start ChromaDB
pip install chromadb
chroma run --path ./chroma-data

# Terminal 2: Initialize DB and run app
npm run db:init
npm run dev
```

### 6.3 Test Queries

1. "Show me my inventory health"
2. "What's the restock recommendation for SKU-002?"
3. "What if lead time increases to 14 days for SKU-002?"
4. "What is safety stock?"

---

## Summary

| Phase | Deliverables |
|-------|--------------|
| 1 | Project setup, dependencies, DB schema, seed data |
| 2 | Core libs: db, openai, restock calculator, prompts |
| 3 | RAG: ChromaDB client, PDF ingestion, search |
| 4 | API routes: /chat, /inventory, /documents/upload |
| 5 | Frontend: Chat UI, widgets, message bubbles |
| 6 | Testing and polish |

After completing all phases, you'll have a working local MVP of the AI Merchant Assistant.
