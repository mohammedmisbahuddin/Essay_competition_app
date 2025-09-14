# Essay Competition Management System - Django Backend

A comprehensive Django REST API backend for managing essay competitions, migrated from Node.js. This system handles participant registration, essay evaluation, user management, and administrative functions.

## 🚀 Features

### Core Functionality
- **User Management**: JWT-based authentication with role-based access control
- **Participant Management**: Registration, search, validation, and attendance tracking
- **Evaluation System**: Essay scoring across multiple criteria with computed totals
- **Admin Dashboard**: Statistics, data management, and bulk operations
- **Data Import/Export**: CSV import/export functionality
- **Google Sheets Integration**: Sync participants from Google Sheets

### User Roles
- **Admin**: Full system access, user management, data operations
- **Evaluator**: Essay evaluation and scoring
- **Invigilator**: Participant validation and monitoring
- **Registration Desk**: Participant registration and management

## 🏗️ Architecture

### Django Apps
- `authentication/` - User management and JWT authentication
- `participants/` - Participant registration and management
- `evaluations/` - Essay evaluation and scoring system
- `admin_panel/` - Administrative functions and statistics

### Database Models
- **User**: Custom user model with roles
- **Participant**: Competition participants
- **Evaluation**: Essay evaluations with computed totals
- **CompetitionSettings**: Configurable parameters
- **GoogleSheetsConfig**: Integration settings

## 📋 API Endpoints

### Authentication (`/api/auth/`)
- `POST /login/` - User login
- `POST /register/` - User registration (admin only)
- `GET /profile/` - Get user profile
- `POST /change-password/` - Change password
- `POST /refresh/` - Refresh JWT token

### Participants (`/api/participants/`)
- `GET /` - List participants (with pagination/search)
- `POST /` - Create participant (spot registration)
- `GET /<id>/` - Get participant details
- `PUT /<id>/` - Update participant
- `DELETE /<id>/` - Delete participant (admin only)
- `GET /search/` - Search participants
- `GET /validate/<reg_number>/` - Validate registration number
- `PATCH /<id>/present/` - Mark participant as present
- `POST /import/csv/` - Import participants from CSV
- `GET /export/results/` - Export results to CSV

### Evaluations (`/api/evaluations/`)
- `GET /` - List evaluations
- `POST /` - Create evaluation
- `GET /<id>/` - Get evaluation details
- `PUT /<id>/` - Update evaluation
- `DELETE /<id>/` - Delete evaluation
- `GET /participant/<reg_number>/` - Get evaluation form
- `POST /submit/` - Submit evaluation
- `POST /<id>/confirm/` - Confirm evaluation
- `GET /my-evaluations/` - Get user's evaluations

### Admin Panel (`/api/admin/`)
- `GET /dashboard/` - Get dashboard statistics
- `GET /stats/` - Get statistics only
- `GET /results/` - Get results with pagination/sorting
- `GET /users/` - Get all users
- `POST /users/create/` - Create new user
- `GET /settings/` - Get competition settings
- `GET /export/results/` - Export results to CSV
- `DELETE /clear-all-data/` - Clear all data (admin only)

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 12+
- pip

### Local Development

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd Essay_Assist_App
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment configuration**:
   ```bash
   cp config.env .env
   # Edit .env with your database credentials
   ```

4. **Database setup**:
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

5. **Run development server**:
   ```bash
   python manage.py runserver
   ```

### Docker Development

1. **Using Docker Compose**:
   ```bash
   docker-compose -f docker-compose.django.yml up --build
   ```

2. **Access the application**:
   - API: http://localhost:8000
   - Admin: http://localhost:8000/admin/

## 🐳 Docker Deployment

### Local Docker
```bash
# Build and run
docker build -f Dockerfile.django -t essay-competition-django .
docker run -p 8000:8000 essay-competition-django
```

### Docker Compose
```bash
docker-compose -f docker-compose.django.yml up -d
```

## 🚂 Railway Deployment

1. **Connect to Railway**:
   - Install Railway CLI: `npm install -g @railway/cli`
   - Login: `railway login`
   - Link project: `railway link`

2. **Set environment variables**:
   ```bash
   railway variables set SECRET_KEY=your-secret-key
   railway variables set DEBUG=False
   railway variables set DB_NAME=your-db-name
   railway variables set DB_USER=your-db-user
   railway variables set DB_PASSWORD=your-db-password
   railway variables set DB_HOST=your-db-host
   railway variables set DB_PORT=5432
   ```

3. **Deploy**:
   ```bash
   railway up
   ```

## 🧪 Testing

### Run all tests:
```bash
python run_tests.py
```

### Run specific tests:
```bash
python run_tests.py authentication
python run_tests.py participants
python run_tests.py evaluations
```

### Using Django test runner:
```bash
python manage.py test
python manage.py test authentication
python manage.py test participants
python manage.py test evaluations
```

## 📊 Database Schema

### Users Table
- `id`, `username`, `email`, `password_hash`, `role`, `full_name`, `is_active`, `created_at`, `updated_at`

### Participants Table
- `id`, `registration_number`, `full_name`, `email`, `phone`, `gender`, `age`, `qualification`, `father_name`, `registration_timestamp`, `is_spot_registration`, `attendance_marked`, `attendance_marked_at`, `created_at`, `updated_at`

### Evaluations Table
- `id`, `participant_id`, `evaluator_id`, `introduction_marks`, `content_marks`, `conclusion_marks`, `handwriting_marks`, `grammar_marks`, `special_points`, `total_marks` (computed), `comments`, `is_submitted`, `submitted_at`, `created_at`, `updated_at`

### Competition Settings Table
- `id`, `setting_key`, `setting_value`, `description`, `created_at`, `updated_at`

### Google Sheets Config Table
- `id`, `sheet_id`, `sheet_name`, `credentials_json`, `is_active`, `last_sync`, `created_at`, `updated_at`

## 🔧 Configuration

### Environment Variables
- `SECRET_KEY`: Django secret key
- `DEBUG`: Debug mode (True/False)
- `ALLOWED_HOSTS`: Comma-separated list of allowed hosts
- `DB_NAME`: Database name
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password
- `DB_HOST`: Database host
- `DB_PORT`: Database port
- `FRONTEND_URL`: Frontend URL for CORS
- `JWT_SECRET`: JWT signing secret
- `JWT_EXPIRES_IN`: JWT token expiration time

## 🔐 Security Features

- JWT-based authentication
- Role-based access control
- Password hashing with bcrypt
- CORS protection
- Rate limiting (configurable)
- Input validation and sanitization
- SQL injection protection
- XSS protection

## 📈 Performance Features

- Database query optimization
- Pagination for large datasets
- Efficient search functionality
- Caching for static files
- Connection pooling

## 🚀 Migration from Node.js

This Django backend is a complete migration from the original Node.js backend with the following improvements:

1. **Better ORM**: Django ORM provides better database abstraction
2. **Built-in Admin**: Django admin interface for easy management
3. **Better Testing**: Comprehensive test suite with Django's testing framework
4. **Security**: Enhanced security features and best practices
5. **Scalability**: Better structure for scaling and maintenance
6. **Documentation**: Comprehensive API documentation and code comments

## 📝 API Documentation

### Authentication
All API endpoints (except login and health check) require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Response Format
All API responses follow a consistent format:
```json
{
  "message": "Success message",
  "data": {...},
  "pagination": {...}  // For paginated responses
}
```

### Error Handling
Errors are returned with appropriate HTTP status codes and descriptive messages:
```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the test cases for usage examples

---

**Note**: This Django backend maintains full compatibility with the original Node.js API endpoints and functionality while providing enhanced features and better maintainability.
