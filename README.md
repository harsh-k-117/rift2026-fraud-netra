# Fraud Netra: Graph-Based Financial Crime Detection Engine  
### RIFT 2026 Hackathon | Money Muling Detection Challenge

[![Live Demo](https://img.shields.io/badge/demo-live_now-green?style=for-the-badge)](YOUR_LIVE_URL_HERE)  
[![LinkedIn Demo](https://img.shields.io/badge/LinkedIn-Video_Demo-blue?style=for-the-badge)](YOUR_LINKEDIN_VIDEO_URL_HERE)

---

## 📌 Problem Statement

Money muling is a serious financial crime where criminals move illegal money through multiple accounts to hide its origin. These accounts form hidden networks that are difficult to detect using traditional database queries.

The goal of this challenge is to build a **live web-based Financial Forensics Engine** that:

- Accepts transaction data as CSV
- Models transactions as a directed graph
- Detects money muling patterns
- Highlights suspicious accounts visually
- Exports structured JSON output in exact required format

Fraud Netra solves this problem using graph theory and network analysis.

---

## 🛠 Tech Stack

Frontend: React (Vite) with Tailwind CSS  
Graph Visualization: react-force-graph-2d  
API Communication: Axios  

Backend: Node.js with Express.js  
File Upload: Multer  
CSV Parsing: PapaParse  

Processing Engine: In-memory directed graph (Adjacency List)  
Database: None (fully stateless processing)  

Deployment: Vercel (Frontend), Render/Railway (Backend)

---

## 🏗 System Architecture

The system follows this processing pipeline:

CSV Upload  
→ Schema Validation  
→ Graph Construction  
→ Fraud Pattern Detection  
→ Suspicion Scoring  
→ JSON Output Builder  
→ Interactive Graph + Table Display  

Each transaction becomes a directed edge (sender → receiver).  
Each account becomes a node in the graph.

---

## 📥 Input Specification

The uploaded CSV must contain EXACT columns:

transaction_id (String)  
sender_id (String)  
receiver_id (String)  
amount (Float)  
timestamp (YYYY-MM-DD HH:MM:SS)  

Invalid schemas are rejected.

---

## 🧠 Fraud Detection Engine

Fraud Netra detects three main money muling patterns:

### 1️⃣ Circular Fund Routing (Cycles)

Money moves in a loop such as:

A → B → C → A  

Rules:
- Detect cycles of length 3 to 5 only
- All accounts in the cycle belong to the same ring
- Each cycle becomes a fraud ring

Algorithm:
- Depth-limited DFS with path tracking
- Canonical representation used to remove duplicates

---

### 2️⃣ Smurfing Patterns (Fan-in / Fan-out)

Fan-in:
- ≥10 unique senders → 1 receiver
- Within a 72-hour window

Fan-out:
- 1 sender → ≥10 receivers
- Within 72-hour window

Algorithm:
- Group by sender/receiver
- Sort by timestamp
- Apply sliding window
- Count unique accounts

Ring members:
- Aggregator + participants

---

### 3️⃣ Layered Shell Networks

Money passes through low-activity intermediate accounts.

Rules:
- Path length ≥ 3
- Intermediate accounts have ≤ 3 total transactions

Algorithm:
- BFS up to depth 4
- Check activity of intermediate nodes
- Flag suspicious chains

---

## 🚫 False Positive Control

To avoid flagging legitimate merchants or payroll systems:

Accounts are NOT flagged if:
- Transaction count > 50
- Many unique partners
- No cycles detected
- No smurfing patterns

This ensures high precision and minimizes false positives.

---

## ⚖️ Suspicion Score Methodology (0–100)

Each account receives a score based on detected patterns:

Cycle member: +40  
Smurf aggregator: +35  
Smurf participant: +20  
Shell intermediate: +30  
High velocity transfer: +15  
Large suspicious amount: +10  

Score is capped at 100.

Suspicious accounts are sorted in descending order before JSON export.

The scoring model is rule-based and fully explainable.

---

## 📊 Required Outputs

### 1️⃣ Interactive Graph Visualization

- All accounts as nodes  
- Directed edges for transactions  
- Fraud rings clearly highlighted  
- Suspicious nodes visually distinct  
- Hover shows:
  - account_id
  - suspicion_score
  - detected_patterns

---

### 2️⃣ JSON Output (STRICT FORMAT)

The system generates EXACT structure:

{
  suspicious_accounts: [],
  fraud_rings: [],
  summary: {}
}

### suspicious_accounts includes:
- account_id (String)
- suspicion_score (Float 0–100)
- detected_patterns (Array<String>)
- ring_id (String)

Sorted by suspicion_score descending.

### fraud_rings includes:
- ring_id
- member_accounts[]
- pattern_type
- risk_score

### summary includes:
- total_accounts_analyzed
- suspicious_accounts_flagged
- fraud_rings_detected
- processing_time_seconds

Exact format matching is maintained.

---

### 3️⃣ Fraud Ring Summary Table (UI)

Displays:
- Ring ID
- Pattern Type
- Member Count
- Risk Score
- Member Account IDs (comma separated)

---

## ⏱ Complexity & Performance

Graph Construction: O(E)  
Cycle Detection (depth-limited DFS): manageable for datasets up to 10k  
Smurf Detection (sliding window): O(E)  
Shell Detection (BFS traversal): O(V + E)  

Performance Requirement:
- Upload to results display ≤ 30 seconds
- Optimized for datasets up to 10,000 transactions

Precision Target: ≥70%  
Recall Target: ≥60%  

---

## ⚙️ Installation & Setup

Prerequisite:
Node.js 18+

Backend:
cd backend  
npm install  
node server.js  

Frontend:
cd frontend  
npm install  
npm run dev  

---

## 📖 Usage Instructions

1. Upload CSV file in required format  
2. Click “Run Detection”  
3. View interactive graph  
4. Inspect fraud rings in table  
5. Download JSON investigation report  

The application is publicly accessible and requires no login.

---

## ⚠️ Known Limitations

- Optimized for datasets up to 10k transactions  
- Extremely dense graphs may reduce visualization speed  
- Very complex long-term laundering may require extended analysis  
- Precision depends on pattern clarity in dataset  

---

## 👥 Team Innov8ors

Harsh Kulkarni – System Design & GitHub  
Abhishek Kalimath – Full Stack Development  
Yash Lawande – AI Integration  
Sarthak Manke – LLM & Prompt Engineering  

---

## 🎯 Final Goal

Fraud Netra transforms raw transaction data into a structured financial investigation system that:

- Models money flow as a graph  
- Detects hidden mule networks  
- Assigns interpretable suspicion scores  
- Visualizes fraud rings clearly  
- Exports structured forensic JSON output  

Built to satisfy all RIFT 2026 evaluation requirements.

