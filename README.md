# Hostel Room Allocation System

A beginner-friendly hostel administration app built with Node.js, Express, MongoDB Atlas, and vanilla HTML/CSS/JavaScript.

## Requirements
- Node.js LTS
- MongoDB Atlas database (or a MongoDB replica set)
- VS Code

## Setup
1. Open this folder in VS Code.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Replace `MONGO_URI` with your MongoDB Atlas connection string and set a long random `JWT_SECRET`.
5. Run `npm run dev`.
6. Open `http://localhost:5000`.
7. Create the first admin account. Public admin registration is disabled after the first account exists.

## Collections
- Users
- Students
- Rooms
- Allocations

## Capacity rule
Allocation uses a MongoDB transaction and an atomic conditional room update (`occupied < capacity`) before creating the allocation. The student active-allocation index also prevents a student from receiving multiple active rooms. MongoDB transactions require a replica set; MongoDB Atlas supports this.

## API overview
- `POST /api/auth/register` – create first admin only
- `POST /api/auth/login` – admin login
- `/api/students` – student CRUD
- `/api/rooms` – room CRUD
- `GET/POST /api/allocations` – list/create allocations
- `PATCH /api/allocations/:id/release` – release a room
- `GET /api/dashboard` – dashboard statistics

All routes except auth and health require a JWT bearer token.
