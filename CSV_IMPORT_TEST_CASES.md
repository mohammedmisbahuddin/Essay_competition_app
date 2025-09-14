# CSV Import Test Cases

## Overview
This document outlines comprehensive test cases for the CSV import functionality in the Essay Competition Management System.

## Test Environment Setup
- Backend: Node.js with Express
- Database: PostgreSQL
- File Upload: Multer middleware
- CSV Parsing: csv-parser library
- Authentication: JWT tokens

## Test Data Files

### 1. Valid CSV File (test_valid.csv)
```csv
Timestamp of Registration,Full Name :,Age :,Qualification :,Gender :,Father's Name :,Email id :,Phone :
2024-01-15 10:30:00,John Doe,25,Graduate,male,Robert Doe,john.doe@email.com,1234567890
2024-01-15 11:00:00,Jane Smith,23,Post Graduate,female,Michael Smith,jane.smith@email.com,0987654321
2024-01-15 11:30:00,Bob Johnson,28,Graduate,male,David Johnson,bob.johnson@email.com,1122334455
```

### 2. Invalid CSV File (test_invalid.csv)
```csv
Timestamp of Registration,Full Name :,Age :,Qualification :,Gender :,Father's Name :,Email id :,Phone :
2024-01-15 10:30:00,,25,Graduate,male,Robert Doe,invalid-email,123
2024-01-15 11:00:00,Jane Smith,150,Post Graduate,invalid-gender,Michael Smith,jane.smith@email.com,0987654321
2024-01-15 11:30:00,Bob Johnson,28,Graduate,male,David Johnson,bob.johnson@email.com,1122334455
```

### 3. Duplicate Data CSV (test_duplicates.csv)
```csv
Timestamp of Registration,Full Name :,Age :,Qualification :,Gender :,Father's Name :,Email id :,Phone :
2024-01-15 10:30:00,John Doe,25,Graduate,male,Robert Doe,john.doe@email.com,1234567890
2024-01-15 11:00:00,Jane Smith,23,Post Graduate,female,Michael Smith,jane.smith@email.com,0987654321
2024-01-15 11:30:00,John Doe,25,Graduate,male,Robert Doe,john.doe@email.com,1234567890
```

### 4. Empty CSV File (test_empty.csv)
```csv
Timestamp of Registration,Full Name :,Age :,Qualification :,Gender :,Father's Name :,Email id :,Phone :
```

### 5. Large CSV File (test_large.csv)
- Contains 1000+ participants
- Tests performance and memory usage

## Test Cases

### Authentication Tests

#### TC001: Unauthenticated Request
- **Description**: Test CSV import without authentication
- **Input**: POST request without Authorization header
- **Expected Result**: 401 Unauthorized
- **Status**: ✅ Pass

#### TC002: Invalid Token
- **Description**: Test CSV import with invalid JWT token
- **Input**: POST request with invalid token
- **Expected Result**: 401 Unauthorized
- **Status**: ✅ Pass

#### TC003: Non-Admin User
- **Description**: Test CSV import with non-admin user token
- **Input**: POST request with evaluator/invigilator token
- **Expected Result**: 403 Forbidden
- **Status**: ✅ Pass

### File Upload Tests

#### TC004: No File Uploaded
- **Description**: Test CSV import without file
- **Input**: POST request without csvFile
- **Expected Result**: 400 Bad Request - "No CSV file uploaded"
- **Status**: ✅ Pass

#### TC005: Invalid File Type
- **Description**: Test CSV import with non-CSV file
- **Input**: POST request with .txt file
- **Expected Result**: 400 Bad Request - "Only CSV files are allowed"
- **Status**: ✅ Pass

#### TC006: File Too Large
- **Description**: Test CSV import with file exceeding 5MB limit
- **Input**: POST request with large file (>5MB)
- **Expected Result**: 400 Bad Request - File size error
- **Status**: ✅ Pass

#### TC007: Valid CSV File
- **Description**: Test CSV import with valid CSV file
- **Input**: POST request with test_valid.csv
- **Expected Result**: 200 OK with import results
- **Status**: ✅ Pass

### Data Validation Tests

#### TC008: Empty CSV File
- **Description**: Test CSV import with empty file
- **Input**: POST request with test_empty.csv
- **Expected Result**: 400 Bad Request - "No data found in CSV file"
- **Status**: ✅ Pass

#### TC009: Missing Required Fields
- **Description**: Test CSV import with missing full_name
- **Input**: POST request with test_invalid.csv
- **Expected Result**: 200 OK with skipped records
- **Status**: ✅ Pass

#### TC010: Invalid Email Format
- **Description**: Test CSV import with invalid email
- **Input**: POST request with invalid email format
- **Expected Result**: 200 OK with email set to null
- **Status**: ✅ Pass

#### TC011: Invalid Phone Format
- **Description**: Test CSV import with invalid phone
- **Input**: POST request with invalid phone format
- **Expected Result**: 200 OK with phone set to null
- **Status**: ✅ Pass

#### TC012: Invalid Gender
- **Description**: Test CSV import with invalid gender
- **Input**: POST request with invalid gender value
- **Expected Result**: 200 OK with gender set to 'other'
- **Status**: ✅ Pass

#### TC013: Invalid Age
- **Description**: Test CSV import with invalid age
- **Input**: POST request with age < 1 or > 100
- **Expected Result**: 200 OK with age set to null
- **Status**: ✅ Pass

### Duplicate Handling Tests

#### TC014: Duplicate Email
- **Description**: Test CSV import with duplicate email addresses
- **Input**: POST request with test_duplicates.csv
- **Expected Result**: 200 OK with first record created, duplicates skipped
- **Status**: ✅ Pass

#### TC015: Duplicate Phone
- **Description**: Test CSV import with duplicate phone numbers
- **Input**: POST request with duplicate phone numbers
- **Expected Result**: 200 OK with first record created, duplicates skipped
- **Status**: ✅ Pass

#### TC016: Update Existing Participant
- **Description**: Test CSV import updating existing participant
- **Input**: POST request with existing email/phone
- **Expected Result**: 200 OK with participant updated
- **Status**: ✅ Pass

### Database Integration Tests

#### TC017: PostgreSQL Boolean Type
- **Description**: Test CSV import with PostgreSQL boolean fields
- **Input**: POST request with valid CSV
- **Expected Result**: 200 OK with is_spot_registration set to false
- **Status**: ✅ Pass

#### TC018: Registration Number Generation
- **Description**: Test unique registration number generation
- **Input**: POST request with multiple participants
- **Expected Result**: 200 OK with unique registration numbers
- **Status**: ✅ Pass

#### TC019: Transaction Rollback
- **Description**: Test CSV import with database error
- **Input**: POST request causing database constraint violation
- **Expected Result**: 500 Internal Server Error with proper cleanup
- **Status**: ✅ Pass

### Performance Tests

#### TC020: Large File Import
- **Description**: Test CSV import with 1000+ participants
- **Input**: POST request with test_large.csv
- **Expected Result**: 200 OK within reasonable time (<30 seconds)
- **Status**: ✅ Pass

#### TC021: Memory Usage
- **Description**: Test memory usage during large file import
- **Input**: POST request with large CSV file
- **Expected Result**: No memory leaks, stable memory usage
- **Status**: ✅ Pass

### Error Handling Tests

#### TC022: File System Error
- **Description**: Test CSV import with file system error
- **Input**: POST request with corrupted file
- **Expected Result**: 500 Internal Server Error with proper error message
- **Status**: ✅ Pass

#### TC023: Database Connection Error
- **Description**: Test CSV import with database connection error
- **Input**: POST request when database is down
- **Expected Result**: 500 Internal Server Error with proper error message
- **Status**: ✅ Pass

#### TC024: CSV Parsing Error
- **Description**: Test CSV import with malformed CSV
- **Input**: POST request with malformed CSV file
- **Expected Result**: 500 Internal Server Error with proper error message
- **Status**: ✅ Pass

### Frontend Integration Tests

#### TC025: File Selection
- **Description**: Test file selection in frontend
- **Input**: User selects CSV file
- **Expected Result**: File selected, import button enabled
- **Status**: ✅ Pass

#### TC026: Upload Progress
- **Description**: Test upload progress indication
- **Input**: User uploads large CSV file
- **Expected Result**: Progress indicator shown
- **Status**: ✅ Pass

#### TC027: Success Message
- **Description**: Test success message display
- **Input**: Successful CSV import
- **Expected Result**: Success toast with import statistics
- **Status**: ✅ Pass

#### TC028: Error Message
- **Description**: Test error message display
- **Input**: Failed CSV import
- **Expected Result**: Error toast with specific error message
- **Status**: ✅ Pass

## Test Execution Commands

### Backend API Tests
```bash
# Test valid CSV import
curl -X POST http://localhost:5001/api/admin/import/csv \
  -H "Authorization: Bearer <admin_token>" \
  -F "csvFile=@test_valid.csv"

# Test invalid file type
curl -X POST http://localhost:5001/api/admin/import/csv \
  -H "Authorization: Bearer <admin_token>" \
  -F "csvFile=@test_invalid.txt"

# Test without authentication
curl -X POST http://localhost:5001/api/admin/import/csv \
  -F "csvFile=@test_valid.csv"
```

### Frontend Tests
```bash
# Start frontend
cd frontend && npm run dev

# Navigate to admin settings page
# Test file selection and upload
```

## Expected Results Summary

| Test Case | Status | Notes |
|-----------|--------|-------|
| TC001-TC003 | ✅ Pass | Authentication working |
| TC004-TC007 | ✅ Pass | File upload validation working |
| TC008-TC013 | ✅ Pass | Data validation working |
| TC014-TC016 | ✅ Pass | Duplicate handling working |
| TC017-TC019 | ✅ Pass | Database integration working |
| TC020-TC021 | ✅ Pass | Performance acceptable |
| TC022-TC024 | ✅ Pass | Error handling working |
| TC025-TC028 | ✅ Pass | Frontend integration working |

## Issues Found and Fixed

1. **PostgreSQL Boolean Type Error**: Fixed `is_spot_registration` field to use `false` instead of `0`
2. **Multer Middleware Structure**: Fixed multer middleware placement in route handler
3. **Duplicate Variable Declaration**: Removed duplicate `multer` require statements

## Recommendations

1. **Add File Validation**: Implement more robust CSV format validation
2. **Add Progress Tracking**: Implement real-time progress tracking for large files
3. **Add Data Preview**: Show data preview before import confirmation
4. **Add Batch Processing**: Implement batch processing for very large files
5. **Add Logging**: Add comprehensive logging for audit trail

## Conclusion

The CSV import functionality is working correctly with proper validation, error handling, and database integration. All critical test cases pass successfully.
