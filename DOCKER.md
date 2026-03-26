# KrishiMitra Docker Setup

## Prerequisites
- Docker Desktop installed
- Docker Compose v2+
- Copy .env files from examples

## Quick Start

### Development (with hot reload)
```bash
# 1. Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Fill in your API keys in backend/.env and frontend/.env

# 3. Start development
make dev
# OR
docker-compose -f docker-compose.dev.yml up --build
```

Access:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Production Build
```bash
make prod
# OR
docker-compose up --build
```

Access:
- App: http://localhost:80
- Backend: http://localhost:8000

## Useful Commands
```bash
make logs      # view all logs
make logs-be   # backend logs only
make logs-fe   # frontend logs only
make test      # run pytest
make lint      # run ruff
make stop      # stop containers
make clean     # remove everything
```

## Troubleshooting

### Port already in use
```bash
# Kill process on port 8000
npx kill-port 8000
# Kill process on port 5173
npx kill-port 5173
```

### Backend can't connect to Supabase
Check backend/.env has correct SUPABASE_URL and SUPABASE_KEY

### Frontend can't reach backend
In Docker, frontend reaches backend via service name.
Make sure vite.config.js proxy is configured correctly.

### Hot reload not working
Set usePolling: true in vite.config.js server.watch
