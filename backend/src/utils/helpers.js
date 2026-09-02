const { getQuery, allQuery } = require('./database');

const MAX_REGISTRATION_ATTEMPTS = 10;

const isRegistrationNumberConflict = (error) => {
  const text = `${error?.message || ''} ${error?.detail || ''} ${error?.constraint || ''}`;
  const isUniqueViolation = error?.code === '23505' || /UNIQUE constraint failed/i.test(text);
  return isUniqueViolation && /registration_number/i.test(text);
};

// In-process lock serializing the generate-then-insert critical section.
// generateRegistrationNumber() reads committed rows to pick the next number,
// so two calls running concurrently in the same process can both pick the
// same number before either commits. This process is the only writer in the
// common single-instance deployment, so the lock removes that race entirely;
// the retry loop below stays as a backstop for multi-instance/Postgres.
let registrationLock = Promise.resolve();

const withRegistrationLock = (fn) => {
  const result = registrationLock.then(fn, fn);
  registrationLock = result.catch(() => {});
  return result;
};

// Generates a registration number and inserts via insertFn, retrying with a
// fresh number on a UNIQUE(registration_number) collision. The generate-then-
// insert gap is a TOCTOU race under concurrent requests; the DB constraint is
// the real guard, this just makes losing the race retry instead of 500ing.
const createWithUniqueRegistrationNumber = (insertFn) => withRegistrationLock(async () => {
  for (let attempt = 0; attempt < MAX_REGISTRATION_ATTEMPTS; attempt++) {
    const registrationNumber = await generateRegistrationNumber();
    try {
      return await insertFn(registrationNumber);
    } catch (error) {
      if (isRegistrationNumberConflict(error) && attempt < MAX_REGISTRATION_ATTEMPTS - 1) {
        continue;
      }
      throw error;
    }
  }
});

const REGISTRATION_PREFIX = process.env.REGISTRATION_PREFIX || 'BCA';

const normalizeHeader = (header) => {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const getFieldValue = (row, fieldNames) => {
  for (const fieldName of fieldNames) {
    const normalizedFieldName = normalizeHeader(fieldName);
    if (Object.prototype.hasOwnProperty.call(row, normalizedFieldName)) {
      return row[normalizedFieldName];
    }
  }
  return undefined;
};

const normalizeDataRows = (rawData, headers = null) => {
  if (!Array.isArray(rawData)) {
    return [];
  }

  if (headers && Array.isArray(headers)) {
    const normalizedHeaders = headers.map(normalizeHeader);
    return rawData.map((row) => {
      const normalizedRow = {};
      normalizedHeaders.forEach((header, index) => {
        if (header) {
          normalizedRow[header] = Array.isArray(row) ? row[index] : row?.[index];
        }
      });
      return normalizedRow;
    });
  }

  return rawData.map((row) => {
    const normalizedRow = {};
    Object.entries(row || {}).forEach(([key, value]) => {
      normalizedRow[normalizeHeader(key)] = value;
    });
    return normalizedRow;
  });
};

// Generate unique registration number
const generateRegistrationNumber = async () => {
  try {
    const prefix = REGISTRATION_PREFIX;
    const year = new Date().getFullYear().toString().slice(-2);
    
    const existingRegistrations = await allQuery(
      'SELECT registration_number FROM participants WHERE registration_number LIKE ?',
      [`${prefix}${year}%`]
    );

    const highestNumber = existingRegistrations.reduce((highest, row) => {
      const match = String(row.registration_number || '').match(new RegExp(`^${prefix}${year}(\\d+)$`));
      if (!match) return highest;
      const currentNumber = parseInt(match[1], 10);
      return Number.isNaN(currentNumber) ? highest : Math.max(highest, currentNumber);
    }, 0);

    const nextNumber = highestNumber + 1;
    const registrationNumber = `${prefix}${year}${nextNumber.toString().padStart(4, '0')}`;
    
    // Double-check uniqueness
    const exists = await getQuery(
      'SELECT id FROM participants WHERE registration_number = ?',
      [registrationNumber]
    );

    if (exists) {
      // If somehow it exists, try next number
      return await generateRegistrationNumber();
    }

    console.log(`Generated registration number: ${registrationNumber}`);
    return registrationNumber;
  } catch (error) {
    console.error('Error generating registration number:', error);
    // Fallback to timestamp-based number
    const timestamp = Date.now().toString().slice(-6);
    return `${REGISTRATION_PREFIX}${timestamp}`;
  }
};

// Clean and validate participant data from CSV
const cleanParticipantData = (rawData, headers = null) => {
  const cleanedData = [];
  const seenEmails = new Set();
  const seenPhones = new Set();
  const normalizedRows = normalizeDataRows(rawData, headers);

  console.log('Raw data sample:', normalizedRows.slice(0, 2)); // Debug: show first 2 rows

  for (const row of normalizedRows) {
    const fullName = getFieldValue(row, ['full_name', 'full name', 'full name :', 'name', 'participant name']);
    const email = getFieldValue(row, ['email', 'email_id', 'email id', 'email id :', 'email address']);
    const phone = getFieldValue(row, ['phone', 'phone :', 'mobile', 'mobile number', 'contact number', 'phone number']);
    const gender = getFieldValue(row, ['gender', 'gender :']);
    const age = getFieldValue(row, ['age', 'age :']);
    const qualification = getFieldValue(row, ['qualification', 'qualification :', 'education']);
    const fatherName = getFieldValue(row, ['father_name', 'fathername', 'fathers name', "father's name", "father's name :"]);
    const registrationTimestamp = getFieldValue(row, [
      'timestamp_of_registration',
      'timestamp',
      'registration_timestamp',
      'column 1',
      'submitted at',
      'date'
    ]);

    // Skip empty rows
    if (!fullName) {
      console.log('Skipping empty row:', row);
      continue;
    }

    const participant = {
      full_name: fullName?.toString().trim(),
      email: email?.toString().trim().toLowerCase(),
      phone: phone?.toString().trim(),
      gender: gender?.toString().trim().toLowerCase(),
      age: parseInt(age, 10) || null,
      qualification: qualification?.toString().trim(),
      father_name: fatherName?.toString().trim(),
      registration_timestamp: registrationTimestamp?.toString().trim()
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
    const genderStats = await allQuery(`
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

// Attendance/gender/age breakdown for a WHERE clause + params scoping the
// participants table (used both for the overall stats and per age-category)
const getAttendanceByGender = async (whereClause, params) => {
  return allQuery(`
    SELECT
      gender,
      COUNT(*) as total,
      SUM(CASE WHEN attendance_marked = true THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN attendance_marked != true OR attendance_marked IS NULL THEN 1 ELSE 0 END) as absent
    FROM participants
    ${whereClause}
    GROUP BY gender
  `, params).then((rows) => rows.map((row) => ({
    gender: row.gender,
    total: row.total,
    present: row.present,
    absent: row.absent,
    attendance_rate: row.total > 0 ? Math.round((row.present / row.total) * 10000) / 100 : 0
  })));
};

const getAgeCategoryStats = async (ageRange, minAge, maxAge) => {
  const whereClause = 'WHERE age BETWEEN ? AND ?';
  const params = [minAge, maxAge];

  const totals = await getQuery(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN attendance_marked = true THEN 1 ELSE 0 END) as present
     FROM participants ${whereClause}`,
    params
  );
  const total = totals?.total || 0;
  const present = totals?.present || 0;

  const genderDistribution = await allQuery(
    `SELECT gender, COUNT(*) as count FROM participants ${whereClause} GROUP BY gender`,
    params
  );
  const attendanceByGender = await getAttendanceByGender(whereClause, params);

  return {
    age_range: ageRange,
    total_participants: total,
    present_participants: present,
    absent_participants: total - present,
    attendance_rate: total > 0 ? Math.round((present / total) * 10000) / 100 : 0,
    gender_distribution: genderDistribution,
    attendance_by_gender: attendanceByGender
  };
};

// Full stats payload for the live admin dashboard / stats screens
const generateLiveStats = async () => {
  const totalParticipantsRow = await getQuery('SELECT COUNT(*) as count FROM participants');
  const totalParticipants = totalParticipantsRow.count;

  const genderDistribution = await allQuery(
    'SELECT gender, COUNT(*) as count FROM participants GROUP BY gender'
  );

  const attendanceByGender = await getAttendanceByGender('', []);
  const presentParticipants = attendanceByGender.reduce((sum, row) => sum + row.present, 0);
  const absentParticipants = totalParticipants - presentParticipants;

  const ageCategories = {
    gen_1: await getAgeCategoryStats('17-22', 17, 22),
    gen_2: await getAgeCategoryStats('23-70', 23, 70)
  };

  const spotRegistrations = await getQuery(
    'SELECT COUNT(*) as count FROM participants WHERE is_spot_registration = true'
  );

  const evaluationsCompleted = await getQuery(
    'SELECT COUNT(*) as count FROM evaluations WHERE is_submitted = true'
  );
  const totalEvaluations = await getQuery('SELECT COUNT(*) as count FROM evaluations');

  const topPerformers = await allQuery(`
    SELECT p.registration_number, p.full_name, p.gender,
           AVG(e.total_marks) as average_score,
           COUNT(e.id) as evaluation_count
    FROM participants p
    JOIN evaluations e ON p.id = e.participant_id AND e.is_submitted = true
    GROUP BY p.id, p.registration_number, p.full_name, p.gender
    ORDER BY average_score DESC
    LIMIT 10
  `);

  return {
    stats: {
      total_participants: totalParticipants,
      gender_distribution: genderDistribution,
      attendance_by_gender: attendanceByGender,
      age_categories: ageCategories,
      spot_registrations: spotRegistrations.count,
      present_participants: presentParticipants,
      absent_participants: absentParticipants,
      attendance_percentage: totalParticipants > 0
        ? Math.round((presentParticipants / totalParticipants) * 10000) / 100
        : 0,
      evaluations_completed: evaluationsCompleted.count,
      total_evaluations: totalEvaluations.count
    },
    top_performers: topPerformers
  };
};

module.exports = {
  REGISTRATION_PREFIX,
  generateRegistrationNumber,
  createWithUniqueRegistrationNumber,
  cleanParticipantData,
  isValidEmail,
  isValidPhone,
  isValidDate,
  calculateAge,
  formatRegistrationNumber,
  generateStatistics,
  generateLiveStats
};
