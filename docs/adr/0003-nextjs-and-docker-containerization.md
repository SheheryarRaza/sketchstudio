# 0003: Next.js App Router and Multi-Container Docker Orchestration

We transitioned the frontend to Next.js 15 (App Router with standalone output) and fully containerized the application using Docker and Docker Compose. This ensures identical execution in local development and production VPS environments, provides automatic multi-stage image optimization for the Next.js frontend and Python FastAPI backend, and isolates PostgreSQL database storage in persistent Docker volumes from Day 1.
