# Essay Competition Management App - System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESSAY COMPETITION MANAGEMENT APP             │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 14) - Port 3000                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ Registration│ │ Invigilator │ │ Evaluator   │ │ Admin Panel ││
│  │ Desk UI     │ │ UI          │ │ UI          │ │ UI          ││
│  │ - Validate  │ │ - Quick     │ │ - Score     │ │ - Analytics ││
│  │ - Spot Reg  │ │   Search    │ │ - Submit    │ │ - Results   ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  Backend API (Node.js/Express) - Port 5000                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ Auth        │ │ Google      │ │ Evaluation  │ │ Results     ││
│  │ Service     │ │ Sheets API  │ │ Service     │ │ Service     ││
│  │ - JWT       │ │ - Sync Data │ │ - Scoring   │ │ - Rankings  ││
│  │ - Roles     │ │ - Validate  │ │ - Submit    │ │ - Export    ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  Database Layer                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ Users       │ │ Participants│ │ Evaluations │ │ Settings    ││
│  │ & Roles     │ │ & Reg. Nos  │ │ & Scores    │ │ & Config    ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## User Roles & Permissions

### 1. Registration Desk
- **Responsibilities:**
  - Validate existing registration numbers
  - Handle spot registrations
  - Search participants by multiple criteria
  - Generate unique registration numbers

- **Access:**
  - View participant details
  - Create new participants
  - Update participant information
  - Search functionality

### 2. Invigilator
- **Responsibilities:**
  - Quick validation of registration numbers
  - Simple search interface
  - Verify participant identity during exam

- **Access:**
  - Search participants by registration number
  - View basic participant details
  - Validate registration status

### 3. Evaluator
- **Responsibilities:**
  - Score essays across 6 criteria
  - Submit evaluation forms
  - View evaluation history

- **Access:**
  - Search participants for evaluation
  - Submit/edit evaluation scores
  - View own evaluation history
  - Access evaluation form with max marks

### 4. Admin
- **Responsibilities:**
  - Manage all users and roles
  - Configure Google Sheets integration
  - View analytics and reports
  - Export results

- **Access:**
  - Full system access
  - User management
  - System configuration
  - Analytics dashboard
  - Results export

## Database Schema

### Core Tables

1. **users**
   - System users with role-based access
   - JWT authentication
   - Role-based permissions

2. **participants**
   - Competition participants
   - Unique registration numbers
   - Spot registration tracking

3. **evaluations**
   - Evaluation scores and feedback
   - Multi-criteria scoring
   - Evaluator tracking

4. **competition_settings**
   - System configuration
   - Maximum marks per criteria
   - Competition details

5. **google_sheets_config**
   - Google Sheets integration
   - Sync configuration
   - Last sync tracking

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (admin only)
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/change-password` - Change password

### Participants
- `GET /api/participants` - List participants (paginated)
- `GET /api/participants/search/:identifier` - Search participants
- `GET /api/participants/validate/:regNumber` - Validate registration
- `POST /api/participants` - Create participant (spot registration)
- `PUT /api/participants/:id` - Update participant
- `DELETE /api/participants/:id` - Delete participant (admin only)

### Evaluations
- `GET /api/evaluations/participant/:regNumber` - Get evaluation form
- `POST /api/evaluations` - Submit evaluation
- `GET /api/evaluations/my-evaluations` - Get evaluator's evaluations
- `PUT /api/evaluations/:id` - Update evaluation

### Admin
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/results` - Results with pagination/sorting
- `GET /api/admin/results/:id` - Detailed participant results
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id/status` - Update user status
- `GET /api/admin/export/results` - Export results to CSV

### Google Sheets
- `POST /api/google-sheets/configure` - Configure Google Sheets
- `POST /api/google-sheets/sync` - Sync participants from sheets
- `GET /api/google-sheets/status` - Get sync status
- `POST /api/google-sheets/test` - Test connection

## Technology Stack

### Frontend
- **Framework:** Next.js 14 (React 18)
- **Styling:** Tailwind CSS
- **State Management:** React Context + Hooks
- **HTTP Client:** Axios
- **Forms:** React Hook Form
- **Notifications:** React Hot Toast
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** SQLite (dev) / PostgreSQL (prod)
- **Authentication:** JWT
- **Validation:** Express Validator
- **Google APIs:** Google Sheets API v4
- **Security:** Helmet, CORS, Rate Limiting

### Deployment
- **Containerization:** Docker
- **Orchestration:** Docker Compose
- **Process Management:** PM2 (optional)
- **Reverse Proxy:** Nginx (optional)
- **Database:** SQLite (embedded) / PostgreSQL

## Security Features

1. **Authentication & Authorization**
   - JWT-based authentication
   - Role-based access control
   - Password hashing with bcrypt

2. **API Security**
   - Rate limiting
   - CORS protection
   - Input validation
   - SQL injection prevention

3. **Data Protection**
   - Environment variable configuration
   - Secure token storage
   - HTTPS support

## Scalability Considerations

1. **Database**
   - SQLite for small deployments
   - PostgreSQL for production
   - Indexed queries for performance

2. **Caching**
   - Client-side caching with React Query
   - API response caching

3. **Deployment**
   - Docker containerization
   - Horizontal scaling support
   - Load balancer ready

## Monitoring & Maintenance

1. **Health Checks**
   - Backend health endpoint
   - Database connectivity checks

2. **Logging**
   - Structured logging
   - Error tracking
   - Performance monitoring

3. **Backup**
   - Database backup scripts
   - Configuration backup
   - Automated backup scheduling

## Future Enhancements

1. **Features**
   - Real-time notifications
   - Advanced analytics
   - Mobile app support
   - Multi-competition support

2. **Technical**
   - Microservices architecture
   - Redis caching
   - Message queues
   - Advanced monitoring

3. **Integration**
   - Email notifications
   - SMS integration
   - Payment processing
   - Certificate generation

