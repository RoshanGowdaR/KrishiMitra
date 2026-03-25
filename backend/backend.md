# Backend Run Guide (FastAPI)

This backend uses FastAPI and Uvicorn.

## 1. Open terminal in backend folder

```powershell
cd backend
```

## 2. Create and activate virtual environment (first time only)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, run this once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Then activate again:

```powershell
.\.venv\Scripts\Activate.ps1
```

## 3. Install dependencies

```powershell
pip install -r requirements.txt
```

## 4. Configure environment

Copy example env file if needed:

```powershell
Copy-Item .env.example .env
```

Then update values in `.env`.

## 5. Run backend server

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will run at:

- http://localhost:8000
- API docs: http://localhost:8000/docs

## 6. Stop backend

Press `Ctrl + C` in the backend terminal.
