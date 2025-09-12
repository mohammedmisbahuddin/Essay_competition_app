# Google Sheets Import Setup Guide

## Overview
This guide will help you set up Google Sheets import functionality for the Essay Competition Management App.

## Prerequisites
1. A Google account
2. Access to Google Cloud Console
3. A Google Sheet with participant data

## Step 1: Create a Google Sheet Template

Create a new Google Sheet with the following columns in the first row (header):

| Column A | Column B | Column C | Column D | Column E | Column F | Column G | Column H |
|----------|----------|----------|----------|----------|----------|----------|----------|
| Full Name | Email | Phone | Gender | Date of Birth | Institution | Address | Notes |

### Sample Data Format:
```
Full Name,Email,Phone,Gender,Date of Birth,Institution,Address,Notes
John Doe,john.doe@email.com,+1234567890,male,1995-01-15,University of Example,123 Main St,Pre-registered
Jane Smith,jane.smith@email.com,+1234567891,female,1996-05-20,College of Example,456 Oak Ave,Pre-registered
```

## Step 2: Set Up Google Sheets API

### Option A: Using API Key (For Public Sheets)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click on it and press "Enable"
4. Create an API Key:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key
5. Make your Google Sheet public:
   - Open your Google Sheet
   - Click "Share" button
   - Change permissions to "Anyone with the link can view"
   - Copy the sharing link

### Option B: Using Service Account (Recommended for Private Sheets)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API (same as Option A)
4. Create a Service Account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the service account details
   - Click "Create and Continue"
   - Skip the optional steps and click "Done"
5. Create a key for the service account:
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON" format
   - Download the JSON file
6. Share your Google Sheet with the service account:
   - Open your Google Sheet
   - Click "Share" button
   - Add the service account email (found in the JSON file) as a viewer
   - The email looks like: `your-service-account@your-project.iam.gserviceaccount.com`

## Step 3: Configure the Backend

### Update your backend/.env file:

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Database Configuration
DATABASE_PATH=./database/competition.db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
JWT_EXPIRES_IN=24h

# Google Sheets Configuration
# Option 1: Use API Key (for public sheets)
GOOGLE_SHEETS_API_KEY=your-api-key-here

# Option 2: Use Service Account (recommended for private sheets)
# GOOGLE_SHEETS_KEY_FILE=./path/to/service-account-key.json

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### For Option A (API Key):
- Set `GOOGLE_SHEETS_API_KEY` to your API key
- Leave `GOOGLE_SHEETS_KEY_FILE` commented out

### For Option B (Service Account):
- Comment out `GOOGLE_SHEETS_API_KEY`
- Set `GOOGLE_SHEETS_KEY_FILE` to the path of your downloaded JSON file
- Place the JSON file in your backend directory

## Step 4: Install Required Dependencies

The Google Sheets API is already included in the backend dependencies. If you need to install it manually:

```bash
cd backend
npm install googleapis
```

## Step 5: Test the Import

1. Start your backend server:
   ```bash
   cd backend
   node src/server.js
   ```

2. Start your frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Login to the admin dashboard
4. Go to Settings page
5. Enter your Google Sheet URL in the "Import from Google Sheets" section
6. Click "Import"

## Google Sheet URL Format

Your Google Sheet URL should look like this:
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
```

## Troubleshooting

### Common Issues:

1. **"Google Sheets API not configured"**
   - Make sure you've set either `GOOGLE_SHEETS_API_KEY` or `GOOGLE_SHEETS_KEY_FILE` in your .env file

2. **"Invalid Google Sheets URL format"**
   - Make sure your URL contains `/spreadsheets/d/` in it
   - The URL should be the sharing link, not the edit link

3. **"No data found in the Google Sheet"**
   - Make sure your sheet has data in the first sheet
   - Check that the sheet is accessible (public or shared with service account)

4. **"Failed to initialize Google Sheets client"**
   - Check your API key or service account JSON file
   - Make sure the Google Sheets API is enabled in your project

5. **"No valid participant data found after cleaning"**
   - Check that your sheet has the correct column headers
   - Make sure there's data in the rows (not just headers)

## Data Cleaning Rules

The system automatically cleans and validates data:

- **Full Name**: Required, will be trimmed
- **Email**: Optional, must be valid email format if provided
- **Phone**: Optional, will be cleaned of non-numeric characters
- **Gender**: Required, must be 'male', 'female', or 'other'
- **Date of Birth**: Required, must be in YYYY-MM-DD format
- **Institution**: Optional
- **Address**: Optional

## Security Notes

- Never commit your API keys or service account JSON files to version control
- Use environment variables for sensitive data
- For production, consider using a more secure authentication method
- Regularly rotate your API keys

## Support

If you encounter issues:
1. Check the backend logs for detailed error messages
2. Verify your Google Sheets API setup
3. Test with a simple sheet first
4. Check that all required columns are present
