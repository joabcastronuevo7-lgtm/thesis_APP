# ExamGen RAG — Setup Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Pinecone account (free tier works)
- OpenAI API key (GPT-4o-mini or higher)

---

## 1. Install Dependencies

```bash
npm install
```

---

## 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in all values:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random 32-char secret (`openssl rand -base64 32`) |
| `OPENAI_API_KEY` | Your OpenAI API key |
| `PINECONE_API_KEY` | Your Pinecone API key |
| `PINECONE_INDEX_NAME` | Index name (e.g. `examgen-vectors`) |
| `PINECONE_ENVIRONMENT` | Your Pinecone region |

---

## 3. Set Up Pinecone

1. Go to [pinecone.io](https://pinecone.io) → Create index
2. Index name: `examgen-vectors`
3. Dimensions: **1536** (for `text-embedding-3-small`)
4. Metric: **cosine**

---

## 4. Set Up Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations (creates all tables)
npm run db:migrate

# Seed with demo accounts
npm run db:seed
```

---

## 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@examgen.com | Admin@123456 |
| Educator | educator@examgen.com | Educator@123456 |
| Student | student1@examgen.com | Student@123456 |

---

## 6. First-Time Usage (Educator Flow)

1. Log in as Educator
2. Go to **PDF Library** → Upload a PDF
3. Wait for status to show **PROCESSED** (background job)
4. Go to **Quizzes** → **Generate New Quiz**
5. Select the processed PDF, configure settings, click **Generate**
6. Review generated questions, then **Publish**
7. Assign to students via the quiz settings

---

## Project Structure

```
thesis/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login, Register, Forgot Password
│   ├── (dashboard)/        # Role-based dashboards
│   │   ├── admin/          # Admin panel
│   │   ├── educator/       # Educator dashboard
│   │   └── student/        # Student dashboard
│   ├── api/                # REST API routes
│   │   ├── auth/           # NextAuth + Register
│   │   ├── pdfs/           # PDF upload & management
│   │   ├── quizzes/        # Quiz CRUD + generation
│   │   ├── questions/      # Question editing
│   │   ├── attempts/       # Exam taking & scoring
│   │   ├── analytics/      # Analytics endpoints
│   │   └── users/          # User management
│   ├── page.tsx            # Landing page
│   └── globals.css         # Tailwind CSS
├── components/
│   ├── ui/                 # shadcn-compatible primitives
│   ├── auth/               # Login/Register forms
│   ├── dashboard/          # Sidebar, Header, Stats
│   ├── pdf/                # PDF upload component
│   ├── quiz/               # Quiz builder, timer, answer sheet
│   └── analytics/          # Charts and weak topics
├── lib/
│   ├── ai/
│   │   ├── embeddings.ts   # Pinecone vector operations
│   │   ├── rag.ts          # Retrieval pipeline
│   │   └── generation.ts   # OpenAI question generation
│   ├── pdf/
│   │   └── processor.ts    # PDF parsing & chunking
│   ├── db.ts               # Prisma client
│   ├── auth.ts             # NextAuth configuration
│   ├── password.ts         # bcrypt helpers
│   ├── utils.ts            # Utility functions
│   └── validations.ts      # Zod schemas
├── repositories/           # Database access layer
├── services/               # Business logic layer
├── store/                  # Zustand state management
├── hooks/                  # React custom hooks
├── types/                  # TypeScript type definitions
├── prisma/
│   ├── schema.prisma       # Full database schema
│   └── seed.ts             # Demo data seeder
├── middleware.ts            # Route protection
├── auth.ts                 # NextAuth provider config
└── .env.example            # Environment template
```

---

## RAG Pipeline Flow

```
PDF Upload
    │
    ▼
Text Extraction (pdf-parse)
    │
    ▼
Text Cleaning & Chunking (1000 char chunks, 200 overlap)
    │
    ▼
Topic & Keyword Extraction (GPT-4o-mini)
    │
    ▼
Embedding Generation (text-embedding-3-small → 1536 dims)
    │
    ▼
Vector Storage (Pinecone + PostgreSQL)
    │
    ▼ (on quiz generation)
Semantic Retrieval (query → top-k similar chunks)
    │
    ▼
Context Assembly (retrieved chunks as LLM context)
    │
    ▼
Question Generation (GPT-4o-mini, grounded only on context)
    │
    ▼
Hallucination Validation (confidence scoring ≥ 0.4)
    │
    ▼
Question Storage (PostgreSQL)
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/signin` | Sign in (NextAuth) |
| GET | `/api/pdfs` | List PDFs |
| POST | `/api/pdfs` | Upload PDF |
| DELETE | `/api/pdfs/:id` | Delete PDF |
| GET | `/api/quizzes` | List quizzes |
| POST | `/api/quizzes` | Generate quiz with AI |
| GET | `/api/quizzes/:id` | Get quiz detail |
| PATCH | `/api/quizzes/:id` | Update quiz |
| POST | `/api/quizzes/:id/publish` | Publish quiz |
| POST | `/api/quizzes/:id/assign` | Assign to students |
| PATCH | `/api/questions/:id` | Edit question |
| DELETE | `/api/questions/:id` | Delete question |
| POST | `/api/attempts` | Start exam attempt |
| POST | `/api/attempts/:id/submit` | Submit & auto-score |
| GET | `/api/attempts/:id` | Get attempt result |
| GET | `/api/analytics` | Admin stats |
| GET | `/api/analytics/student` | Student performance |
| GET | `/api/analytics/quiz/:id` | Quiz analytics |
| GET | `/api/users` | List users (admin) |
| PATCH | `/api/users/:id` | Update user (admin) |

---

## Deployment

### Vercel (Frontend + API)

```bash
vercel deploy
```

Set all environment variables in Vercel dashboard.

### PostgreSQL

Use [Neon](https://neon.tech) (free) or [Railway](https://railway.app):

```
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

### After Deploying

```bash
npx prisma migrate deploy  # run migrations on production DB
```
