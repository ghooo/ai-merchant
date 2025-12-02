# AI Merchant Assistant - MVP Specification

## Overview

Minimum Viable Product for an AI-powered chat assistant that helps ecommerce merchants manage inventory and make restock decisions.

---

## MVP Scope

### In Scope (P0)

| Feature | Description |
|---------|-------------|
| Chat Interface | Basic conversational UI with message input and response display |
| Pre-configured Prompts | 2 quick-action widgets for common tasks |
| Inventory Health Check | Display SKU inventory levels and status |
| Restock Recommendations | Calculate and show restock quantities per SKU |
| What-If Scenarios | Allow users to adjust variables and see impact |
| RAG Knowledge Base | Retrieve supply-chain definitions, formulas, and rules from documents |

### Out of Scope (Post-MVP)

| Feature | Reason |
|---------|--------|
| Proactive Nudges | Requires notification infrastructure |
| Pricing Analysis | Secondary use case (P1) |
| Multi-user Support | Focus on single merchant first |
| Mobile App | Web-first approach |

---

## Core User Stories

### 1. View Inventory Health
**As a merchant**, I want to see my inventory health at a glance so I can identify SKUs that need attention.

**Acceptance Criteria:**
- [ ] User can click "Inventory Health" widget
- [ ] System displays all SKUs with current inventory levels
- [ ] Each SKU shows status badge (Healthy/Low/Critical/Out of Stock)
- [ ] Restock recommendations are shown for low/critical SKUs

### 2. Get Restock Recommendations
**As a merchant**, I want to receive restock quantity recommendations so I know how much to order.

**Acceptance Criteria:**
- [ ] System calculates restock using the standard formula
- [ ] Shows reasoning before results
- [ ] Displays input values used in calculation
- [ ] Results shown in table format

### 3. Run What-If Scenario
**As a merchant**, I want to adjust variables and see how it affects restock recommendations.

**Acceptance Criteria:**
- [ ] User can specify which variable to change (lead time, safety days, restock cadence)
- [ ] System recalculates with new values
- [ ] Shows comparison between current and scenario
- [ ] Explains impact of the change

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Chat UI     │  │ Widgets     │  │ Results     │     │
│  │             │  │             │  │ Table       │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      Backend API                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Chat        │  │ Restock     │  │ Scenario    │     │
│  │ Handler     │  │ Calculator  │  │ Engine      │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      Data Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ LLM API     │  │ SKU         │  │ RAG /       │     │
│  │ (OpenAI)    │  │ Database    │  │ Vector DB   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

## RAG System

### Purpose
Retrieve supply-chain definitions, formulas, and recommended stock rules from uploaded PDF documents to provide context-aware responses.

### Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  PDF Upload  │────▶│  Document    │────▶│  Vector      │
│              │     │  Processor   │     │  Database    │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  LLM         │◀────│  Context     │◀────│  Semantic    │
│  Response    │     │  Builder     │     │  Search      │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Document Processing Pipeline

1. **Ingestion**: Upload PDF documents containing supply-chain knowledge
2. **Chunking**: Split documents into semantic chunks (500-1000 tokens)
3. **Embedding**: Generate vector embeddings using OpenAI `text-embedding-3-small`
4. **Storage**: Store chunks and embeddings in vector database

### Knowledge Base Content

| Document Type | Content Examples |
|---------------|------------------|
| Supply Chain Definitions | Lead time, safety stock, reorder point terminology |
| Restock Formulas | Standard formulas, variations, edge cases |
| Best Practices | Recommended safety days by product category |
| Business Rules | Minimum order quantities, supplier constraints |

### Retrieval Flow

1. User sends query via chat
2. Query is embedded using same embedding model
3. Semantic search finds top-k relevant chunks (k=5)
4. Retrieved chunks are added to LLM context
5. LLM generates response with grounded knowledge

### Vector Database Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Chunk identifier |
| `document_id` | UUID | Source document reference |
| `content` | Text | Chunk text content |
| `embedding` | Vector(1536) | OpenAI embedding vector |
| `metadata` | JSON | Source page, section, document name |
| `created_at` | Timestamp | Ingestion time |

### API Endpoints

#### POST /api/documents/upload
Upload and process a PDF document.

**Request:**
```
Content-Type: multipart/form-data
file: <PDF file>
```

**Response:**
```json
{
  "document_id": "doc-123",
  "filename": "supply-chain-guide.pdf",
  "chunks_created": 45,
  "status": "processed"
}
```

#### GET /api/documents
List all uploaded documents.

**Response:**
```json
{
  "documents": [
    {
      "id": "doc-123",
      "filename": "supply-chain-guide.pdf",
      "chunks": 45,
      "uploaded_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### POST /api/rag/search
Search knowledge base (internal use).

**Request:**
```json
{
  "query": "What is the recommended safety stock formula?",
  "top_k": 5
}
```

**Response:**
```json
{
  "results": [
    {
      "content": "Safety stock formula: Safety Days × Average Daily Demand...",
      "score": 0.89,
      "source": "supply-chain-guide.pdf",
      "page": 12
    }
  ]
}
```

---

## Data Model

### SKU Table

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `sku_number` | String | Yes | Unique SKU identifier |
| `sku_name` | String | Yes | Product name |
| `current_inventory` | Integer | Yes | Current stock units |
| `daily_forecasted_sales` | Float | Yes | Average daily demand |
| `safety_days` | Integer | Yes | Buffer days for safety stock |
| `lead_time_days` | Integer | Yes | Days from order to delivery |
| `restock_cadence_days` | Integer | Yes | Frequency of restock orders |
| `created_at` | Timestamp | Yes | Record creation time |
| `updated_at` | Timestamp | Yes | Last update time |

### Sample Data

| sku_number | sku_name | current_inventory | daily_forecasted_sales | safety_days | lead_time_days | restock_cadence_days |
|------------|----------|-------------------|------------------------|-------------|----------------|---------------------|
| SKU-001 | Wireless Headphones | 1250 | 45 | 5 | 7 | 14 |
| SKU-002 | USB-C Cable | 180 | 80 | 3 | 5 | 7 |
| SKU-003 | Bluetooth Speaker | 45 | 30 | 5 | 10 | 14 |
| SKU-004 | Phone Case | 0 | 60 | 3 | 7 | 7 |

---

## Restock Formula

```
Restock Amount = Avg_Daily_Demand × (Lead_Time + Safety_Days + Restock_Cadence) − Current_Inventory
```

### Inventory Status Thresholds

| Status | Condition |
|--------|-----------|
| **Healthy** | Current inventory covers > 30 days of demand |
| **Low** | Current inventory covers 15-30 days of demand |
| **Critical** | Current inventory covers < 15 days of demand |
| **Out of Stock** | Current inventory = 0 |

---

## API Endpoints

### POST /api/chat
Process user message and return AI response.

**Request:**
```json
{
  "message": "Show me my inventory health",
  "session_id": "abc-123"
}
```

**Response:**
```json
{
  "reasoning": "I retrieved your SKU data and calculated inventory health...",
  "results": [
    {
      "sku_number": "SKU-001",
      "sku_name": "Wireless Headphones",
      "current_inventory": 1250,
      "restock_needed": 0,
      "inventory_health": "Healthy"
    }
  ]
}
```

### GET /api/inventory
Get all SKU inventory data.

**Response:**
```json
{
  "skus": [
    {
      "sku_number": "SKU-001",
      "sku_name": "Wireless Headphones",
      "current_inventory": 1250,
      "daily_forecasted_sales": 45,
      "safety_days": 5,
      "lead_time_days": 7,
      "restock_cadence_days": 14
    }
  ]
}
```

### POST /api/scenario
Run what-if scenario calculation.

**Request:**
```json
{
  "sku_number": "SKU-001",
  "changes": {
    "lead_time_days": 14
  }
}
```

**Response:**
```json
{
  "reasoning": "You requested to adjust lead time from 7 to 14 days...",
  "current": {
    "lead_time_days": 7,
    "restock_recommendation": 350
  },
  "scenario": {
    "lead_time_days": 14,
    "restock_recommendation": 665
  },
  "impact": "Increasing lead time by 7 days requires 315 additional units."
}
```

---

## UI Components (MVP)

### 1. Chat Container
- Message list (scrollable)
- Input field with send button
- Typing indicator

### 2. Quick Action Widgets
Two buttons above input:
- "Inventory Health"
- "What-If Scenario"

### 3. Results Display
- Table for SKU data
- Status badges
- Scenario comparison cards

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Next.js 14 + TypeScript | Full-stack React framework, SSR, API routes |
| Styling | Tailwind CSS | Rapid UI development |
| Backend | Next.js API Routes | Unified codebase, serverless functions |
| Database | PostgreSQL | Reliable, SQL support |
| Vector DB | Pinecone / pgvector | Efficient similarity search for RAG |
| Embeddings | OpenAI text-embedding-3-small | High quality, cost-effective embeddings |
| LLM | OpenAI GPT-4 | Best reasoning capabilities |
| PDF Processing | pdf-parse / LangChain | Document ingestion and chunking |
| Hosting | Vercel + Supabase | Quick deployment, managed DB |

---

## MVP Milestones

### Phase 1: Foundation
- [ ] Project setup (Next.js 14 + TypeScript)
- [ ] Database schema and seed data
- [ ] Basic chat UI layout

### Phase 2: RAG Infrastructure
- [ ] Vector database setup (Pinecone or pgvector)
- [ ] PDF upload and processing pipeline
- [ ] Document chunking and embedding generation
- [ ] Semantic search endpoint
- [ ] RAG integration with chat handler

### Phase 3: Core Features
- [ ] OpenAI integration with RAG context
- [ ] Inventory health endpoint
- [ ] Restock calculation logic
- [ ] Results table component

### Phase 4: Scenarios
- [ ] What-if scenario endpoint
- [ ] Scenario comparison UI
- [ ] Variable adjustment form

### Phase 5: Polish
- [ ] Error handling
- [ ] Loading states
- [ ] Responsive design
- [ ] Basic testing

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Chat response time | < 3 seconds |
| Calculation accuracy | 100% (formula-based) |
| User task completion | User can get restock recommendation in < 5 clicks |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM response latency | Poor UX | Implement streaming responses |
| Incorrect calculations | Loss of trust | Unit tests for formula logic |
| API rate limits | Service disruption | Implement caching, rate limiting |
| RAG retrieval quality | Irrelevant context | Tune chunk size, overlap, and top-k |
| PDF parsing errors | Missing knowledge | Support multiple PDF formats, manual review |
| Embedding costs | Budget overrun | Cache embeddings, batch processing |

---

## Definition of Done

MVP is complete when:
1. User can upload PDF documents to knowledge base
2. RAG system retrieves relevant context for queries
3. User can view inventory health for all SKUs
4. User can see restock recommendations with reasoning
5. User can run a what-if scenario and see comparison
6. System uses the standard restock formula correctly
7. LLM responses are grounded in RAG-retrieved knowledge
8. UI is functional on desktop browsers
