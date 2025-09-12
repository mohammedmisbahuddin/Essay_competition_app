# Essay Competition Management App

A comprehensive web application for managing essay competitions with multiple user roles and real-time evaluation capabilities.

## Features

### User Roles
- **Registration Desk**: Validate registrations, handle spot registrations
- **Invigilator**: Simple registration validation during exam
- **Evaluator**: Score essays across multiple criteria
- **Admin**: View analytics, manage results, generate reports

### Core Functionality
- Google Sheets integration for participant data
- Automatic duplicate detection and registration number generation
- Real-time spot registration
- Multi-criteria evaluation system
- Results dashboard with rankings and analytics

## Technology Stack

- **Frontend**: Next.js (React)
- **Backend**: Node.js with Express
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Authentication**: JWT with role-based access
- **Deployment**: Docker containerization

## Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run the application: `npm run dev`

## Project Structure

```
├── frontend/          # Next.js frontend application
├── backend/           # Node.js backend API
├── database/          # Database schema and migrations
├── docker/            # Docker configuration
└── docs/              # Documentation
```

