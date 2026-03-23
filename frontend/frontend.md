# Frontend Run Guide (React + Vite)

This frontend uses React and Vite.

## 1. Open terminal in frontend folder

```powershell
cd frontend
```

## 2. Install dependencies

```powershell
npm install
```

## 3. Configure environment

Create or update `.env` in the frontend folder.

Required variables used by this project include:

- `VITE_API_URL` (example: `http://localhost:8000/api/v1`)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY`

## 4. Run frontend dev server

```powershell
npm run dev
```

Vite will show the local URL in terminal, usually:

- http://localhost:5173

If that port is busy, Vite automatically uses another port (for example 5174, 5175, etc.).

## 5. Build for production

```powershell
npm run build
```

## 6. Stop frontend

Press `Ctrl + C` in the frontend terminal.
