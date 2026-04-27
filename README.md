# CMSC129 Lab 3 - Provincial Book Store

This project extends the Lab 1 CRUD application into a branded store-record manager with a Gemini-powered assistant. Users can create, edit, browse, and delete item records on the page, then use the floating AI assistant to summarize, count, compare, search, and perform CRUD actions through natural language.

## Overview

- Frontend: React + Axios
- Backend: Node.js + Express
- Database: MongoDB Atlas + Mongoose
- AI service: Google Gemini API
- Primary answer model: `gemini-2.5-flash`
- Default planner model: `gemini-2.5-flash-lite`

## Current App Features

### Store Record UI

- Provincial Book Store branding and custom red / warm-white visual theme
- Manual CRUD form for item name, category, and description
- Inline category suggestion inside the text field
- Press `Tab` to accept the suggested category completion
- Editable item list with `Edit`, `Delete`, and `Refresh` controls
- Pagination for the visible records list

### Gemini Assistant

- Floating `Open AI assistant` button
- Starter prompt chips for common demo actions
- Inquiry support for summaries, counts, comparisons, category filtering, and keyword search
- Natural-language CRUD support for create, update, and delete requests
- Confirmation flow for update and delete actions
- In-session context tracking for the latest 10 chat messages
- Pending confirmation tracking until the user replies `yes` or `cancel`
- Animated `Thinking` state while the assistant is waiting for a response
- Automatic item-list refresh after successful chat-based CRUD actions

### Performance Optimizations

- Common inquiry prompts can now be answered directly from MongoDB data without calling Gemini
- Question-only messages skip the planner step when they do not look like CRUD commands
- Planner requests use a lighter Gemini model by default
- Prompt payloads were compacted to reduce token usage and latency

## How the Assistant Works

1. The React client sends the latest user message, recent chat history, and any pending confirmation state to `POST /api/chat`.
2. The backend sanitizes the history and pending action payload.
3. If the user is confirming or cancelling an existing update/delete request, the backend resolves that immediately without asking Gemini again.
4. If the new message looks like a common inquiry such as:
   - `What items do I have right now?`
   - `How many categories are there?`
   - `What is the oldest item?`
   - `Show me the items in the School category.`
   - `Which items mention school, office, or study work?`
   the backend answers it directly from the current item data.
5. If the message looks like a CRUD instruction, Gemini acts as a planner and decides whether the user wants:
   - a create action
   - an update action
   - a delete action
   - a clarification question
   - a normal answer fallback
6. The server validates the planned action and executes the database change through backend functions only.
7. For update and delete actions, the backend asks for confirmation first. Nothing changes until the user replies `yes`.

The AI never talks directly to MongoDB from the browser, and the Gemini API key never leaves the backend.

## Example Inquiries

Try these in the assistant widget:

- `What items do I have right now?`
- `How many categories are represented?`
- `What is the oldest item in the list?`
- `Show me the items in the General category.`
- `Which items mention school, office, or study work?`
- `Summarize the Tech items for me.`

## Example CRUD Commands

- `Add a new item called Planner Pad in Office with description Daily schedule notebook.`
- `Create a School item named Yellow Highlighter.`
- `Update the Graph Notebook description to Grid pages for math exercises.`
- `Change the category of Sticky Notes to School.`
- `Delete the Mini Whiteboard item.`
- `Remove all Tech items.`

For update and delete requests, reply with:

- `yes` to continue
- `cancel` to stop

## Environment Variables

Copy `server/.env.example` to `server/.env` and fill in real values:

```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
GEMINI_API_KEY=your_google_ai_studio_api_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_PLANNER_MODEL=gemini-2.5-flash-lite
GEMINI_BACKUP_MODELS=gemini-3-flash-preview,gemini-3.1-flash-lite-preview,gemini-2.5-flash-lite,gemma-3-1b-it,gemini-1.5-flash
```

## Gemini Setup

1. Go to Google AI Studio: `https://aistudio.google.com/`
2. Sign in with your Google account.
3. Create or open a project with Gemini API access.
4. Generate an API key.
5. Paste that key into `server/.env` as `GEMINI_API_KEY`.

## Model Strategy

### Primary Models

- Main chat answers: `gemini-2.5-flash`
- Planner JSON responses: `gemini-2.5-flash-lite`

### Default Backup Chain

If the active Gemini model is unavailable because of quota issues, overload, or temporary provider failures, the backend automatically falls back in this order:

- `gemini-3-flash-preview`
- `gemini-3.1-flash-lite-preview`
- `gemini-2.5-flash-lite`
- `gemma-3-1b-it`
- `gemini-1.5-flash`

If `GEMINI_BACKUP_MODELS` is set in your real `server/.env`, that custom list overrides the defaults.

## Installation

### 1. Install backend dependencies

```bash
cd server
npm install
```

### 2. Install frontend dependencies

```bash
cd ../client
npm install
```

## Running the App

Open two terminals.

### Terminal 1: backend

```bash
cd server
npm run dev
```

### Terminal 2: frontend

```bash
cd client
npm start
```

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:3000`

## Seeding Dummy Data

The lab requires sample records for the chatbot to analyze.

```bash
cd server
npm run seed
```

This clears the existing `items` collection and inserts sample data with categories such as `School`, `Tech`, `Office`, `Home`, and `Travel`.

## API Endpoints

### Items

- `GET /api/items` - list all non-deleted items
- `GET /api/items/:id` - fetch one item by ID
- `POST /api/items` - create an item
- `PUT /api/items/:id` - update an item
- `DELETE /api/items/:id` - soft delete an item
- `DELETE /api/items/:id/hard` - permanently delete an item

### Chat

- `POST /api/chat`

Example request body:

```json
{
  "message": "How many categories do I have?",
  "history": [
    { "role": "user", "content": "What items do I have?" },
    { "role": "assistant", "content": "You currently have 12 items..." }
  ],
  "pendingAction": null
}
```

Example response shape:

```json
{
  "reply": "There are 5 categories represented right now.",
  "pendingAction": null,
  "dataChanged": false
}
```

## Project Structure

```text
CMSC129-Lab3-TOLENTINOEJ/
|-- client/
|   |-- public/
|   |   |-- favicon.png
|   |   |-- logo192.png
|   |   `-- logo512.png
|   `-- src/
|       |-- components/
|       |   `-- ChatWidget.jsx
|       |-- services/
|       |   `-- chatService.js
|       |-- App.js
|       |-- App.css
|       `-- App.test.js
|-- server/
|   |-- config/
|   |   `-- db.js
|   |-- models/
|   |   `-- Item.js
|   |-- routes/
|   |   |-- chat.js
|   |   `-- itemRoutes.js
|   |-- scripts/
|   |   `-- seedItems.js
|   |-- services/
|   |   |-- aiService.js
|   |   |-- assistantService.js
|   |   |-- functionService.js
|   |   |-- promptService.js
|   |   `-- queryService.js
|   |-- .env.example
|   `-- server.js
`-- README.md
```

## Notes

- The assistant uses the last 10 user/assistant messages as session context.
- Update and delete requests require explicit confirmation before execution.
- Manual page deletion uses the hard-delete route, while assistant delete actions currently soft-delete from the active list.
- The assistant now mixes local fast answers with Gemini planning so common demo prompts feel faster.
- User-friendly API errors are returned for missing API keys, invalid models, permission issues, quota problems, and temporary overload.
- Add actual screenshots to this README before final submission if your class requires them.

## Useful Commands

### Server

- `npm start` - start the backend once
- `npm run dev` - start backend with nodemon
- `npm run seed` - seed sample records

### Client

- `npm start` - run the React app
- `npm run build` - create a production build
- `npm test -- --watchAll=false --runInBand` - run the current React tests once

## Author

TolentinoEM
