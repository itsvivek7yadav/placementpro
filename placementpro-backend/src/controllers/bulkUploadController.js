const XLSX = require('xlsx');
const bcrypt = require('bcrypt');
const db = require('../config/db');

exports.uploadStudents = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  let data;
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    data = XLSX.utils.sheet_to_json(sheet);
  } catch (e) {
    console.error('Failed to parse Excel:', e);
    return res.status(400).json({ message: 'Could not read Excel file. Make sure it is a valid .xlsx file.' });
  }

  if (!data || data.length === 0) {
    return res.status(400).json({ message: 'Excel file is empty or has no readable rows.' });
  }

  console.log('📋 First row from Excel:', data[0]);

  let inserted = 0;
  let skipped = 0;
  const skippedReasons = [];

  for (const row of data) {
    const prn          = row['PRN']?.toString().trim();
    const programName  = row['Program Name']?.toString().trim();
    const programBatch = row['Program Batch']?.toString().trim();
    const firstName    = row['First Name']?.toString().trim();
    const lastName     = row['Last Name']?.toString().trim();
    const email        = row['College Email ID']?.toString().trim().toLowerCase();
    const fullName     = `${firstName || ''} ${lastName || ''}`.trim();

    if (!prn || !email || !fullName || !programName || !programBatch) {
      skipped++;
      skippedReasons.push({ prn: prn || 'N/A', reason: 'Missing required fields' });
      continue;
    }

    try {
      // Duplicate checks
      const [emailRows] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
      if (emailRows.length > 0) {
        skipped++;
        skippedReasons.push({ prn, reason: `Duplicate email: ${email}` });
        continue;
      }

      const [prnRows] = await db.query('SELECT student_id FROM students WHERE prn = ?', [prn]);
      if (prnRows.length > 0) {
        skipped++;
        skippedReasons.push({ prn, reason: 'Duplicate PRN' });
        continue;
      }

      // Default password = their PRN, hashed
      const hashedPassword = await bcrypt.hash(prn, 10);

      // ✅ Insert into users with first_name + last_name
      const [userResult] = await db.query(
        `INSERT INTO users (first_name, last_name, email, password, role)
         VALUES (?, ?, ?, ?, 'STUDENT')`,
        [firstName, lastName, email, hashedPassword]
      );

      const userId = userResult.insertId;

      // ✅ Insert into students with all fields
      await db.query(
        `INSERT INTO students
           (user_id, prn, first_name, last_name,
            program_name, program_batch,
            sicsr_program_name, college_email)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          prn,
          firstName,
          lastName,
          programName,
          programBatch,
          programName,   // sicsr_program_name = program_name
          email          // college_email = email
        ]
      );

      inserted++;
      console.log(`✅ Inserted: ${firstName} ${lastName} | ${email} | PRN: ${prn}`);

    } catch (rowError) {
      console.error(`❌ DB error for PRN ${prn}:`, rowError.message);
      skipped++;
      skippedReasons.push({ prn, reason: `DB error: ${rowError.message}` });
    }
  }

  console.log(`📊 Upload complete — Inserted: ${inserted} | Skipped: ${skipped}`);
  if (skippedReasons.length) console.table(skippedReasons);

  return res.json({ message: 'Upload completed', inserted, skipped, skippedReasons });
};