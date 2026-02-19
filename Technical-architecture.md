# 🛡️ RIFT 2026 Hackathon  
## Money Muling Detection Engine — Implementation Plan

This project detects money muling, where illegal funds move through multiple accounts to hide their origin.  
The system must be a live web app with CSV upload, graph-based detection, visual output, and strict JSON export.

---

# 🎯 Goal
The system must:
- Convert transactions into a directed graph  
- Detect fraud patterns (cycles, smurfing, shell chains)  
- Highlight suspicious accounts  
- Display fraud ring table  
- Export exact JSON format  
- Be publicly accessible  

---

# 📥 Input Format (Strict)

CSV must contain exactly:
transaction_id  
sender_id  
receiver_id  
amount  
timestamp (YYYY-MM-DD HH:MM:SS)

Invalid schema → reject file.

---

# 📊 Required Outputs

## 1. Interactive Graph
- Nodes = accounts  
- Directed edges = transactions  
- Fraud rings highlighted  
- Suspicious nodes clearly visible  
- Hover shows account details  

## 2. JSON Output (Exact Structure)

{
  suspicious_accounts: [],
  fraud_rings: [],
  summary: {}
}

suspicious_accounts must include:
- account_id  
- suspicion_score (0–100 sorted descending)  
- detected_patterns[]  
- ring_id  

fraud_rings must include:
- ring_id  
- member_accounts[]  
- pattern_type  
- risk_score  

summary must include:
- total_accounts_analyzed  
- suspicious_accounts_flagged  
- fraud_rings_detected  
- processing_time_seconds  

## 3. Fraud Ring Table (UI)
- Ring ID  
- Pattern Type  
- Member Count  
- Risk Score  
- Member IDs (comma separated)

---

# 🏗 System Flow

CSV Upload  
→ Validate schema  
→ Build graph  
→ Detect patterns  
→ Score accounts  
→ Generate JSON  
→ Display graph + table  

---

# 🔎 Detection Logic

Cycle Detection:
- Detect loops of length 3–5  
- Use DFS with path tracking  

Smurfing Detection:
- ≥10 senders → 1 receiver within 72 hours  
- 1 sender → ≥10 receivers within 72 hours  
- Use sliding window method  

Shell Detection:
- Path length ≥3  
- Intermediate accounts ≤3 transactions  
- Use BFS traversal  

---

# 🚫 False Positive Control

Do NOT flag accounts if:
- Transaction count > 50  
- Many unique partners  
- No cycles  
- No smurfing  

Prevents merchant and payroll false alerts.

---

# ⚖️ Suspicion Scoring (0–100)

Cycle member → +40  
Smurf aggregator → +35  
Smurf participant → +20  
Shell account → +30  
High velocity → +15  
Large amounts → +10  

Clamp score to 100 and sort descending.

---

# ⚙️ Performance

- Handle up to 10k transactions in under 30 seconds  
- Use adjacency list graph  
- Depth-limited DFS  
- BFS depth limit  
- Sliding window detection  
- In-memory processing only (no database)  

---

# 🚀 Final Goal

The system will:
- Model transactions as a graph  
- Detect hidden mule networks  
- Assign clear suspicion scores  
- Visualize fraud rings  
- Export structured forensic JSON  

Fully compliant with RIFT 2026 hackathon requirements.
