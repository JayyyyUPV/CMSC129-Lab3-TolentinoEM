# CMSC129 Lab 1 - CRUD App

A full-stack CRUD application built with:

- **Frontend:** React + Axios
- **Backend:** Node.js + Express
- **Database:** MongoDB Atlas + Mongoose

The app allows users to create, view, update, and delete items. The default delete in the UI is **soft delete**.

## Project Structure

```text
CMSC129-Lab1-TolentinoEM/
|-- client/      # React frontend
|-- server/      # Express backend + MongoDB
`-- README.md
```

## Features

- Create an item
- Read all non-deleted items
- Read one item by ID
- Update an item
- Soft delete an item (`deleted: true`)
- Hard delete an item (permanent removal)

## Prerequisites

Make sure you have installed:

- Node.js (LTS recommended)
- npm
- A MongoDB Atlas connection string

## Environment Variables

Create a `.env` file inside the `server/` folder:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
PORT=5000
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

## Run the Application

Open two terminals.

### Terminal 1: Start backend server

```bash
cd server
npm run dev
```

Server runs at: `http://localhost:5000`

### Terminal 2: Start frontend client

```bash
cd client
npm start
```

Client runs at: `http://localhost:3000`

## API Endpoints

Base URL: `http://localhost:5000/api/items`

### 1) Get all non-deleted items

- **GET** `/api/items`

### 2) Get one item by ID

- **GET** `/api/items/:id`

### 3) Create item

- **POST** `/api/items`
- Body:

```json
{
  "name": "Sample Item",
  "description": "Sample description"
}
```

### 4) Update item

- **PUT** `/api/items/:id`
- Body:

```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

### 5) Soft delete item

- **DELETE** `/api/items/:id`
- Sets `deleted` to `true`

### 6) Hard delete item

- **DELETE** `/api/items/:id/hard`
- Permanently removes the item from the database

## Notes

- The frontend currently calls: `http://localhost:5000/api/items` directly.
- CORS is enabled in the backend.
- If no items are available, the UI shows: **No items yet.**

## Scripts

### Server (`server/package.json`)

- `npm start` - Run server with Node
- `npm run dev` - Run server with Nodemon

### Client (`client/package.json`)

- `npm start` - Start React dev server
- `npm run build` - Build production frontend
- `npm test` - Run tests

## Author

TolentinoEM
