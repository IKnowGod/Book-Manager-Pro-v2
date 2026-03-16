# Phase 0: TypeScript & Project Environment Setup

## Objective
Initialize the project structure for a full-stack TypeScript application, separating frontend and backend while maintaining a consistent development environment.

## Tasks

### 0.1. Initialize Root Directory
- Create `backend/` and `frontend/` directories.
- Configure `.gitignore` to exclude `node_modules`, `.env`, and build artifacts.

### 0.2. Backend Environment (Node.js)
- Initialize `npm init -y` in `backend/`.
- Install core dependencies: `express`, `cors`, `dotenv`, `@google/generative-ai`, `zod`, `helmet`.
- Install dev dependencies: `typescript`, `@types/express`, `@types/node`, `ts-node-dev`.
- Create `.env.example` to document required keys without exposing values.
- Implement a `config.ts` validator to ensure the app fails fast if secrets are missing.
- Configure `tsconfig.json`.

### 0.3. Frontend Environment (Vite)
- Initialize Vite with React and TypeScript template in `frontend/`.
- Clean up default boilerplate.
- Set up CSS variables for the global design system.

## Deliverables
- Functional project skeleton with typed configuration.
- Dev servers ready for both frontend and backend.
