# Voice Note Summarizer - Setup Guide

## Prerequisites
- Node.js 18+ installed
- OpenRouter API account and API key

## Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   - Open `.env` file
   - Replace `your-openrouter-api-key-here` with your actual OpenRouter API key
   - For production, update `APP_URL` to your domain

3. **Start the database** (if not already running):
   ```bash
   npx prisma dev
   ```

4. **Run database migrations**:
   ```bash
   npx prisma db push
   ```

5. **Seed the database**:
   ```bash
   npm run seed
   ```

6. **Start the development server**:
   ```bash
   npm run dev
   ```

7. **Access the application**:
   - Open http://localhost:3000 in your browser
   - Login with username: `admin`, password: `password`

## Features

- **Authentication**: Simple username/password login system
- **Transcript Management**: View 20 pre-loaded voice note transcripts
- **AI Summarization**: Generate summaries using multiple LLM models via OpenRouter
- **Batch Processing**: Summarize all transcripts at once
- **Comparison View**: Compare summaries from different models side by side
- **Responsive Design**: Works on desktop and mobile devices

## Default Models

The application comes configured with free OpenRouter models:
- Meta Llama 3.1 8B Instruct
- Microsoft Phi 3 Mini 128K Instruct
- Google Gemma 2 9B IT

## API Endpoints

- `POST /api/auth` - User authentication
- `GET /api/transcripts` - Get all transcripts
- `GET /api/summaries?transcriptId=<id>` - Get summaries for a transcript
- `POST /api/summarize` - Generate new summaries

## Technical Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS v4
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL (Prisma local dev server)
- **AI**: OpenRouter API integration
- **Deployment**: Vercel-ready