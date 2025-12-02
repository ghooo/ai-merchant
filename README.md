# AI Merchant Assistant

An AI-powered inventory management assistant that helps ecommerce sellers manage inventory, get restock recommendations, and run what-if scenarios.

## Features

- **Inventory Health Monitoring** - View stock levels and health status (Healthy/Low/Critical/Out of Stock)
- **Restock Recommendations** - Get calculated restock amounts using the standard formula
- **What-If Scenarios** - Test different variables (lead time, safety days, etc.) to see impact on restock needs
- **RAG Knowledge Base** - Upload supply chain documents (PDF/TXT) for contextual Q&A
- **Chat Interface** - Natural language interaction powered by GPT-4 function calling

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Backend**: Next.js API Routes
- **Database**: SQLite (better-sqlite3)
- **Vector Store**: ChromaDB (for RAG)
- **AI**: OpenAI GPT-4 with function calling

## Prerequisites

- Node.js 18+
- OpenAI API key
- ChromaDB server (optional, for RAG features)

## Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repo-url>
   cd ai-merchant
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-key-here
   CHROMA_URL=http://localhost:8000
   ```

3. **Initialize the database**
   ```bash
   npm run db:init
   ```
   This creates sample SKU data in `data/app.db`.

4. **Start ChromaDB** (optional, for RAG)
   ```bash
   docker run -p 8000:8000 chromadb/chroma
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Usage

### Quick Actions
Click any widget card to quickly:
- View inventory health
- Run what-if scenarios
- Analyze sales trends
- Learn about the restock formula

### Example Prompts
- "Show me my inventory health"
- "What is the restock recommendation for my inventory?"
- "What if lead time increases to 14 days for SKU-001?"
- "Which SKUs are critical or out of stock?"

### Uploading Documents
Use the `/api/documents/upload` endpoint to add supply chain knowledge:
```bash
curl -X POST -F "file=@document.pdf" http://localhost:3000/api/documents/upload
```

## Restock Formula

```
Restock Amount = (Daily_Sales x (Lead_Time + Safety_Days + Restock_Cadence)) - Current_Inventory
```

### Health Status Thresholds
| Status | Days of Stock |
|--------|---------------|
| Healthy | > 30 days |
| Low | 15-30 days |
| Critical | < 15 days |
| Out of Stock | 0 units |

## Project Structure

```
ai-merchant/
├── app/
│   ├── api/
│   │   ├── chat/route.ts        # Chat endpoint with function calling
│   │   ├── inventory/route.ts   # Inventory CRUD
│   │   └── documents/
│   │       └── upload/route.ts  # Document upload for RAG
│   ├── components/
│   │   ├── ChatContainer.tsx    # Main chat interface
│   │   ├── MessageBubble.tsx    # Chat message component
│   │   ├── WidgetCard.tsx       # Quick action cards
│   │   └── StatusBadge.tsx      # Health status indicator
│   └── page.tsx                 # Home page
├── lib/
│   ├── db.ts                    # SQLite database client
│   ├── openai.ts                # OpenAI client
│   ├── restock.ts               # Restock calculation logic
│   ├── prompts.ts               # System prompt & function definitions
│   ├── chroma.ts                # ChromaDB client
│   └── rag.ts                   # RAG ingestion & search
├── scripts/
│   └── init-db.ts               # Database initialization
├── data/                        # SQLite database files
├── uploads/                     # Uploaded documents
└── chroma-data/                 # ChromaDB persistence
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:init` | Initialize database with sample data |

## License

MIT
