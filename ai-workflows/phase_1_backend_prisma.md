# Phase 1: Backend Data Model & Prisma Integration

## Objective
Migrate the existing Python models to a TypeScript-compatible ORM (Prisma) and implement the core REST API.

## Tasks

### 1.1. Prisma Schema Definition
- Define `Book`, `Note`, `Tag`, and `Inconsistency` in `schema.prisma`.
- Configure SQLite provider for development.
- Run `npx prisma migrate dev` to initialize the database.

### 1.2. ID Encoding Port
- Port the `id_encoder.py` logic to a TypeScript utility (`idEncoder.ts`).
- Ensures binary-to-string conversion for friendly URL IDs.

### 1.3. Core API Endpoints
- Implement RESTful controllers for Books and Notes.
- Implement Tag management endpoints (associating tags with notes).
- Ensure all IDs are encoded in responses and decoded for queries.

## Deliverables
- `schema.prisma` file and migrated SQLite database.
- Functional REST API for all CRUD operations.
