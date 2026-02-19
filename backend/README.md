# AegisGraph Backend

Backend API for AegisGraph Financial Crime Detection Engine.

## Tech Stack

- Node.js
- Express
- Multer (CSV upload)
- PapaParse (CSV parsing)

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
```

Development mode with auto-reload:

```bash
npm run dev
```

Server runs on port 5000 by default.

## API Endpoints

### POST /api/upload

Upload CSV file for fraud detection analysis.

### GET /health

Health check endpoint.
