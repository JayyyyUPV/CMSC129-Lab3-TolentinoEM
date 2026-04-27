# CMSC129 Lab 3 - Gemini Assistant for Item CRUD App

This project extends the Lab 1 CRUD application with a Gemini-powered assistant. Users can manage items on the main page, then use the floating AI widget to ask questions, summarize records, count categories, compare items, and perform CRUD actions through natural language.

## Tech Stack

- Frontend: React + Axios
- Backend: Node.js + Express
- Database: MongoDB Atlas + Mongoose
- AI Service: Google Gemini API
- Model: `gemini-2.5-flash`

## AI Features

- Floating assistant widget on the main page
- Inquiry chatbot behavior for summaries, counts, comparisons, and search
- CRUD assistant behavior for create, update, and delete requests
- Confirmation flow for update and delete actions before anything is changed
- Context awareness using the last 10 chat messages in the current session
- Tool-use style backend flow: Gemini plans an action, the server validates it, and backend functions execute the database operation
- Automatic main-page refresh after successful chat-based CRUD actions
- Safe backend proxy for Gemini requests
- Graceful handling for missing API keys, invalid models, permission issues, and quota errors

## How the Assistant Works

1. The React client sends the user message and recent chat history to the backend.
2. The backend loads active items from MongoDB.
3. Gemini first acts as a planner and decides whether the user wants:
   - a normal inquiry answer
   - a create action
   - an update action
   - a delete action
   - a clarification question
4. For inquiries, Gemini answers using only the provided item data and recent conversation context.
5. For CRUD requests, the backend validates the planned action and runs a server-side function:
   - create: inserts a new item
   - update: asks for confirmation, then updates matching item records
   - delete: asks for confirmation, then soft deletes matching item records
6. After a successful chat-based CRUD operation, the main page refreshes so the visible records match the assistant reply.

The AI never calls MongoDB directly from the frontend and the API key is never exposed in the browser.

## Example Inquiries

Try these in the assistant widget:

- `What items do I currently have?`
- `How many categories are represented?`
- `Which item was added first?`
- `Show me the items in the School category.`
- `Which records mention study, office, or work?`
- `Summarize the Tech items for me.`

## Example CRUD Commands

- `Add a new item called Planner Pad in Office with description Daily schedule notebook.`
- `Create a School item named Yellow Highlighter.`
- `Update the Graph Notebook description to Grid pages for math exercises.`
- `Change the category of Sticky Notes to School.`
- `Delete the Mini Whiteboard item.`
- `Remove all Tech items.`

The assistant will ask for confirmation before update and delete actions. Reply with `yes` to continue or `cancel` to stop.

## Environment Variables

Copy `server/.env.example` to `server/.env` and fill in real values:

```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
GEMINI_API_KEY=your_google_ai_studio_api_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_BACKUP_MODELS=gemini-3-flash-preview,gemini-3.1-flash-lite-preview,gemini-2.5-flash-lite,gemma-3-1b-it
```

## Gemini API Key Setup

1. Go to Google AI Studio: `https://aistudio.google.com/`
2. Sign in with your Google account.
3. Create or open a project with Gemini API access.
4. Generate an API key.
5. Paste that key into `server/.env` as `GEMINI_API_KEY`.

## Model Fallbacks

If the primary Gemini model is unavailable because of quota pressure or temporary service overload, the backend automatically tries these backups in order:

- `gemini-3-flash-preview`
- `gemini-3.1-flash-lite-preview`
- `gemini-2.5-flash-lite`
- `gemma-3-1b-it`

You can change that order with `GEMINI_BACKUP_MODELS` in `server/.env`.

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

The lab requires 10-20 sample records. A seed script is included.

```bash
cd server
npm run seed
```

This clears the existing `items` collection and inserts 12 sample records with categories such as `School`, `Tech`, `Office`, `Home`, and `Travel`.

## API Endpoints

### Items

- `GET /api/items` - list all non-deleted items
- `GET /api/items/:id` - fetch one item
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

## Project Structure

```text
CMSC129-Lab3-TOLENTINOEJ/
|-- client/
|   |-- src/
|   |   |-- components/ChatWidget.jsx
|   |   |-- services/chatService.js
|   |   |-- App.js
|   |   `-- App.css
|-- server/
|   |-- models/Item.js
|   |-- routes/
|   |   |-- itemRoutes.js
|   |   `-- chat.js
|   |-- scripts/seedItems.js
|   |-- services/
|   |   |-- aiService.js
|   |   |-- assistantService.js
|   |   |-- functionService.js
|   |   `-- promptService.js
|   |-- .env.example
|   `-- server.js
`-- README.md
```

## Notes for Demo and Submission

- The assistant supports both inquiry-style prompts and expanded CRUD commands.
- Chat context is maintained for the active browser session through the latest 10 messages.
- Update and delete requests require a confirmation reply before execution.
- Chat-made CRUD changes are reflected both in the assistant response and on the main page item list.
- The backend returns user-friendly AI errors instead of exposing raw provider secrets.
- Add actual assistant screenshots to this README before final submission.

## Scripts

### Server

- `npm start` - start the backend once
- `npm run dev` - start backend with nodemon
- `npm run seed` - seed sample records

### Client

- `npm start` - run the React app
- `npm run build` - create a production build

## Author

TolentinoEM
