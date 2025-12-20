# SplitApp - Expense Sharing Application

A full-stack expense sharing application built with **FastAPI** (Backend) and **Next.js** (Frontend).

## Features
- **Group Management**: Create groups, invite members using email.
- **Expense Tracking**: Add expenses, split them equally among group members.
- **Settlements**: Calculate debts and settle up with friends.
- **Interactive Analytics**:
  - Monthly Spending Trend (Line Chart).
  - Top Spenders (Leaderboard).
  - Activity Log showing recent transactions.
- **Authentication**: Secure JWT-based login and registration.

## Tech Stack
- **Backend**: Python, FastAPI, SQLAlchemy, SQLite.
- **Frontend**: TypeScript, Next.js, Tailwind CSS, Shadcn UI, Recharts.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- npm

### 1. Backend Setup (FastAPI)

1. Navigate to the root directory.
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the server:
   ```bash
   uvicorn backend.main:app --reload
   ```
   The backend will start at `http://localhost:8000`. API docs available at `http://localhost:8000/docs`.

### 2. Frontend Setup (Next.js)

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## usage

1. **Register/Login** to create an account.
2. **Create a Group** from the dashboard.
3. **Invite Friends** by entering their email (Simulation: create multiple accounts to simulate friends).
4. **Add Expenses** inside the group.
5. **View Analytics** to track spending trends.
6. **Settle Up** when debts are paid.

## Notes
- The database is a local SQLite file (`sql_app_v4.db`).
- "Analytics Demo 2025" group contains simulated data for demonstration.
