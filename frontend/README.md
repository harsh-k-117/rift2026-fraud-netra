# AegisGraph Frontend

Frontend application for AegisGraph Financial Crime Detection Engine.

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- react-force-graph-2d
- Axios

## Installation

```bash
npm install
```

## Running the Development Server

```bash
npm run dev
```

Application runs on http://localhost:3000

## Build for Production

```bash
npm run build
```

## Environment Variables

Create a `.env` file:

```
VITE_API_BASE_URL=http://localhost:5000/api
```

## Features

- CSV file upload with drag & drop
- Transaction network visualization
- Fraud ring detection results
- JSON report download
