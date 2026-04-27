# CMSC129 Lab 3 - Gemini Chatbot for Item CRUD App

This project extends the Lab 1 CRUD application with a Gemini-powered inquiry chatbot. Users can manage items on the main page, then ask natural-language questions about the same records through a floating chat widget.

## Tech Stack

- Frontend: React + Axios
- Backend: Node.js + Express
- Database: MongoDB Atlas + Mongoose
- AI Service: Google Gemini API
- Model: `gemini-2.5-flash`

## AI Features

- Floating chatbot widget on the main page
- Conversational answers based on the current item records in MongoDB
- Context awareness using the last several chat messages in the current session
- Safe backend proxy for Gemini requests
- Graceful handling for missing API keys, invalid models, permission issues, and quota errors

## How the Chatbot Works

1. The React client sends the user message and recent chat history to the backend.
2. The backend loads active items from MongoDB.
3. The backend builds a prompt that includes:
   - item data
   - category summary
   - recent conversation history
   - the latest user question
4. Gemini generates a response using only the provided item data.
5. The response is shown inside the floating chat widget.

The AI never calls MongoDB directly from the frontend and the API key is never exposed in the browser.

## Example Queries

Try these in the chat widget:

- `What items do I currently have?`
- `How many categories are represented?`
- `Which item was added first?`
- `Show me the items in the School category.`
- `Which records mention study, office, or work?`
- `Summarize the Tech items for me.`

## Environment Variables

Copy `server/.env.example` to `server/.env` and fill in real values:

```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
GEMINI_API_KEY=your_google_ai_studio_api_key
GEMINI_MODEL=gemini-2.5-flash
```

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
  ]
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
|   |   `-- promptService.js
|   |-- .env.example
|   `-- server.js
`-- README.md
```

## Notes for Demo and Submission

- The chatbot is designed for inquiry-style questions about the current item data.
- Chat context is maintained for the active browser session through recent message history.
- The backend returns user-friendly AI errors instead of exposing raw provider secrets.
- Add actual chatbot screenshots to this README before final submission.

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
