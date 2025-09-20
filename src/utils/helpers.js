const { getQuery, runQuery } = require('./database');

// Extract name part for registration number
const extractNamePart = (fullName, length) => {
  if (!fullName) {
    return 'XX'.padEnd(length, 'X'); // Default for missing names
  }
  
  // Clean and extract first characters (remove spaces, special chars)
  const cleanName = fullName.replace(/[^A-Za-z]/g, '').toUpperCase();
  
  if (cleanName.length < length) {
    return cleanName.padEnd(length, 'X'); // Pad with X
  }
  
  return cleanName.substring(0, length);
};

// Generate PCWT format registration number
const generatePCWTRegistrationNumber = async (fullName, age) => {
  try {
    // Extract first 2 characters of name
    const namePart = extractNamePart(fullName, 2);
    
    // Format age as 2 digits
    const ageStr = age ? age.toString().padStart(2, '0') : '00';
    
    // Generate 5-character UUID part
    const uuidPart = require('crypto').randomUUID().substring(0, 5).toUpperCase();
    
    // Combine: PCWT + age + name + uuid
    let registrationNumber = `PCWT${ageStr}${namePart}${uuidPart}`;
    
    // Ensure uniqueness (very unlikely to need retry with 5-char UUID)
    const exists = await getQuery(
      'SELECT id FROM participants WHERE registration_number = ?',
      [registrationNumber]
    );

    if (exists) {
      // Regenerate UUID part if collision (extremely rare)
      const newUuidPart = require('crypto').randomUUID().substring(0, 5).toUpperCase();
      registrationNumber = `PCWT${ageStr}${namePart}${newUuidPart}`;
    }

    console.log(`Generated PCWT registration number: ${registrationNumber}`);
    return registrationNumber;
  } catch (error) {
    console.error('Error generating PCWT registration number:', error);
    // Fallback to original format
    return await generateRegistrationNumberFallback();
  }
};

// Generate fallback registration number (original format)
const generateRegistrationNumberFallback = async () => {
  try {
    const prefix = 'REG';
    const year = new Date().getFullYear().toString().slice(-2);
    
    // Get the last registration number for this year
    const lastReg = await getQuery(
      'SELECT registration_number FROM participants WHERE registration_number LIKE ? ORDER BY id DESC LIMIT 1',
      [`${prefix}${year}%`]
    );

    let nextNumber = 1;
    if (lastReg && lastReg.registration_number) {
      const lastNumber = parseInt(lastReg.registration_number.slice(-4));
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    // Format as REG25001, REG25002, etc.
    const registrationNumber = `${prefix}${year}${nextNumber.toString().padStart(4, '0')}`;
    
    // Double-check uniqueness
    const exists = await getQuery(
      'SELECT id FROM participants WHERE registration_number = ?',
      [registrationNumber]
    );

    if (exists) {
      // If somehow it exists, try next number
      return await generateRegistrationNumberFallback();
    }

    console.log(`Generated fallback registration number: ${registrationNumber}`);
    return registrationNumber;
  } catch (error) {
    console.error('Error generating fallback registration number:', error);
    // Fallback to timestamp-based number
    const timestamp = Date.now().toString().slice(-6);
    return `REG${timestamp}`;
  }
};

// Main function to generate registration number with fallback
const generateRegistrationNumber = async (fullName = null, age = null) => {
  if (fullName && age !== null) {
    return await generatePCWTRegistrationNumber(fullName, age);
  } else {
    return await generateRegistrationNumberFallback();
  }
};

// Clean and validate participant data from CSV
const cleanParticipantData = (rawData) => {
  const cleanedData = [];
  const seenEmails = new Set();
  const seenPhones = new Set();

  console.log('Raw data sample:', rawData.slice(0, 2)); // Debug: show first 2 rows

  for (const row of rawData) {
    // Skip empty rows
    if (!(row['Full Name :'] || row.full_name)) {
      console.log('Skipping empty row:', row);
      continue;
    }

    const participant = {
      full_name: (row['Full Name :'] || row.full_name)?.toString().trim(),
      email: (row['Email id :'] || row.email_id)?.toString().trim().toLowerCase(),
      phone: (row['Phone :'] || row.phone)?.toString().trim(),
      gender: (row['Gender :'] || row.gender)?.toString().trim().toLowerCase(),
      age: parseInt(row['Age :'] || row.age) || null,
      qualification: (row['Qualification :'] || row.qualification)?.toString().trim(),
      father_name: (row["Father's Name :"] || row.fathername)?.toString().trim(),
      registration_timestamp: (row['Column 1'] || row.timestamp_of_registration)?.toString().trim()
    };

    // Validate required fields
    if (!participant.full_name) continue;

    // Check for duplicates based on email or phone
    if (participant.email && seenEmails.has(participant.email)) continue;
    if (participant.phone && seenPhones.has(participant.phone)) continue;

    // Validate gender
    if (participant.gender && !['male', 'female', 'other'].includes(participant.gender)) {
      participant.gender = 'other';
    }

    // Validate email format
    if (participant.email && !isValidEmail(participant.email)) {
      participant.email = null;
    }

    // Validate phone format
    if (participant.phone && !isValidPhone(participant.phone)) {
      participant.phone = null;
    }

    // Validate age
    if (participant.age && (participant.age < 1 || participant.age > 100)) {
      participant.age = null;
    }

    // Parse registration timestamp
    if (participant.registration_timestamp) {
      const parsedDate = new Date(participant.registration_timestamp);
      if (isNaN(parsedDate.getTime())) {
        participant.registration_timestamp = null;
      } else {
        participant.registration_timestamp = parsedDate.toISOString();
      }
    }

    cleanedData.push(participant);
    
    if (participant.email) seenEmails.add(participant.email);
    if (participant.phone) seenPhones.add(participant.phone);
  }

  console.log('Cleaned data sample:', cleanedData.slice(0, 2)); // Debug: show first 2 cleaned participants
  console.log('Total cleaned participants:', cleanedData.length);

  return cleanedData;
};

// Email validation
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation (basic)
const isValidPhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// Date validation
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

// Calculate age from date of birth
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Format registration number for display
const formatRegistrationNumber = (regNumber) => {
  if (!regNumber) return '';
  return regNumber.toUpperCase();
};

// Generate statistics for admin dashboard
const generateStatistics = async () => {
  try {
    const stats = {};

    // Total participants
    const totalParticipants = await getQuery('SELECT COUNT(*) as count FROM participants');
    stats.totalParticipants = totalParticipants.count;

    // Participants by gender
    const genderStats = await getQuery(`
      SELECT gender, COUNT(*) as count 
      FROM participants 
      GROUP BY gender
    `);
    stats.genderDistribution = genderStats;

    // Spot registrations
    const spotRegistrations = await getQuery(`
      SELECT COUNT(*) as count 
      FROM participants 
      WHERE is_spot_registration = true
    `);
    stats.spotRegistrations = spotRegistrations.count;

    // Evaluations completed
    const evaluationsCompleted = await getQuery(`
      SELECT COUNT(*) as count 
      FROM evaluations 
      WHERE is_submitted = true
    `);
    stats.evaluationsCompleted = evaluationsCompleted.count;

    // Total evaluations
    const totalEvaluations = await getQuery('SELECT COUNT(*) as count FROM evaluations');
    stats.totalEvaluations = totalEvaluations.count;

    return stats;
  } catch (error) {
    console.error('Error generating statistics:', error);
    return {};
  }
};

module.exports = {
  generateRegistrationNumber,
  cleanParticipantData,
  isValidEmail,
  isValidPhone,
  isValidDate,
  calculateAge,
  formatRegistrationNumber,
  generateStatistics
};

