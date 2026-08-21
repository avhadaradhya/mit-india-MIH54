# KrushakSetu - Running Locally

Follow these steps to run the complete 5-tab application with the FastAPI backend and Vite frontend.

## 1. Start the Backend (FastAPI + DuckDB)

Open a new terminal and navigate to the project root (`d:\FSD\mit-india-MIH54`).

1. **Activate the virtual environment**:
   ```bash
   server\venv\Scripts\activate
   ```
2. **(Optional but recommended) Run the ETL Pipeline**:
   If this is your first time or you are seeing "Table does not exist" or "Error loading data" issues, rebuild the database:
   ```bash
   python backend\etl\build_dataset.py
   ```
3. **Start the FastAPI Server**:
   ```bash
   cd backend
   uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   The backend should now be running at `http://127.0.0.1:8000`.

## 2. Start the Frontend (React + Vite)

Open a **second** terminal and navigate to the `frontend` folder (`d:\FSD\mit-india-MIH54\frontend`).

1. **Install dependencies** (if you haven't recently):
   ```bash
   npm install
   ```
2. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   The frontend should now be running at `http://localhost:5173` (or `5174` if `5173` is busy).

## Troubleshooting

- **"Failed to fetch" / "Error loading data"**: Ensure the FastAPI backend terminal is running and shows no red error traces. Make sure you've run the `build_dataset.py` script so the DuckDB tables exist.
- **Vite blank screen**: Check the Vite terminal. If it crashed, just run `npm run dev` again.
