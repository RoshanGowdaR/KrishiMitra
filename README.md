# KrishiMitra

Production-ready FastAPI backend scaffold for the KrishiMitra AgriTech application.

## Project Structure

```text
krishimitra/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   └── routes/
│   │       └── __init__.py
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   └── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml
└── README.md
```

## Local Development

1. Navigate to backend:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows PowerShell
   .\.venv\Scripts\Activate.ps1
   # macOS/Linux
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy environment template and set values:
   ```bash
   cp .env.example .env
   ```
5. Run the API:
   ```bash
   uvicorn app.main:app --reload
   ```

## API Endpoints

- `GET /` -> Returns service running status
- `GET /health` -> Returns health status

## Test and Lint

Run lint:

```bash
ruff check .
```

Run tests:

```bash
pytest -v
```

## Docker

From `backend/`:

```bash
docker build -t krishimitra-api .
docker run -p 8000:8000 krishimitra-api
```
