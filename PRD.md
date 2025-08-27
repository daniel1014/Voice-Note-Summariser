Technical Spec: Voice Note Summarizer
Version: 3.0
Date: August 27, 2025
Author: Gemini

1. Overview
This document provides the technical and user experience specifications for the "Voice Note Summarizer," a full-stack data-tool. The application will enable users to generate and compare summaries for a predefined set of transcripts using multiple Large Language Models (LLMs).

2. Core Components & Technical Stack
Framework: Next.js 14+ (App Router)

Language: TypeScript

UI: React, Tailwind CSS V4

Backend API: Next.js API Routes

Database: Neon (Serverless Postgres)

ORM: Prisma

LLM Provider: OpenRouter API

Deployment: Vercel

3. Database Schema & Data Management
The application will use a Postgres database hosted on Neon, managed by the Prisma ORM.

Prisma Schema (schema.prisma)
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String    @id @default(cuid())
  username  String    @unique
  password  String    // Note: For this exercise, plain text is acceptable. In production, this must be a hash.
  createdAt DateTime  @default(now())
}

model Transcript {
  id        String    @id @default(cuid())
  title     String    @default("Voice Note")
  content   String
  createdAt DateTime  @default(now())
  summaries Summary[]
}

model Summary {
  id           String     @id @default(cuid())
  content      String
  prompt       String
  temperature  Float
  modelUsed    String
  createdAt    DateTime   @default(now())
  transcript   Transcript @relation(fields: [transcriptId], references: [id])
  transcriptId String
}

Data Seeding: The Transcript table will be populated via a one-time script using the provided 20-entry JSON file.

4. API Endpoints
POST /api/summarize
Purpose: Generates one or more summaries for a single transcript.

Request Body:

{
  "transcriptId": "string",
  "models": ["string"], // Array of model names from OpenRouter
  "prompt": "string",
  "temperature": "number"
}

Server Logic:

Validate the request body.

Fetch the transcript content from the database using transcriptId.

For each model in the models array, make a parallel request to the OpenRouter API.

On success, save each generated summary to the Summary table, linked to the transcriptId.

Handle errors from the LLM API gracefully (e.g., rate limiting, model not found).

Response:

200 OK: Returns an array of the newly created Summary objects.

400 Bad Request: If validation fails.

500 Internal Server Error: If LLM API calls fail.

5. UI/UX Specifications
The application will feature a two-panel layout.

5.1. Authentication Flow
Login View: A centered, full-page form with "Username" and "Password" fields and a "Login" button.

Logic: On submit, the client will call a server-side function that queries the User table. No complex session management is required; a simple state change in the root component will render the main app view upon successful authentication.

5.2. Main Application View
Left Panel (Navigation & Batch Operations)
Component: A fixed-width, scrollable vertical panel.

Elements:

Transcript List: A vertically stacked list of all transcript titles fetched from the database. The currently selected transcript will have a distinct background color.

Selected Transcript Text: When a transcript is selected, its full content will be displayed directly below the list.

"Summarize All Transcripts" Button: Positioned at the bottom of the panel.

Interaction: On click, this button becomes disabled and shows a loading state.

Logic: It triggers a sequential, client-side loop that calls the /api/summarize endpoint for each transcript ID. It will use the first model selected in the Right Panel's controls.

Batch Summary Display: A container below the button appears after the batch operation is complete, displaying a list of generated summaries.

Right Panel (Controls & Comparison View)
Component: The main content area that takes the remaining screen width.

Elements:

Selected Transcript Title: The title of the selected transcript is displayed as a header (<h2>).

Controls Section: A card or bordered container with the following inputs:

Model Selector: A multi-select dropdown component allowing the user to pick up to 3 predefined LLM models.

Prompt Input: A textarea pre-filled with a default summarization prompt.

Temperature Slider: A slider input for values between 0.0 and 1.0.

"Generate Summaries" Button: Triggers the /api/summarize API call for the currently selected transcript and models.

Summaries Comparison Section:

Layout: A responsive grid with up to 3 columns.

Initial State: Empty or contains previously generated summaries for the selected transcript.

Loading State: When "Generate Summaries" is clicked, each column in the grid displays a loading skeleton or spinner, with the corresponding model name as a header.

Success State: The generated summary text populates the content area of its respective column.

6. Assumptions & Constraints
Timeframe: The project must be completed within 1-1.5 days. Scope is fixed to the specifications above.

API Limits: The "Summarize All" feature is subject to OpenRouter's API rate limits and may fail on free tiers. The implementation will be sequential to mitigate this.

Security: Authentication is for access control only. Advanced security practices (e.g., password hashing, CSRF protection) are out of scope.