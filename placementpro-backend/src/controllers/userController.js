const db = require('../config/db');
const bcrypt = require('bcrypt');

exports.createStudent = async (req, res) => {
    const { name, email, program_name, program_batch } = req.body;

    if (!name || !email || !program_name || !program_batch) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const defaultPassword = 'Welcome@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    db.beginTransaction(err => {
        if (err) return res.status(500).json({ message: 'Transaction error' });

        const userQuery = `
            INSERT INTO users (name, email, password, role)
            VALUES (?, ?, ?, 'STUDENT')
        `;

        db.query(userQuery, [name, email, hashedPassword], (err, result) => {
            if (err) {
                return db.rollback(() => {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(409).json({ message: 'User already exists' });
                    }
                    res.status(500).json({ message: 'User creation failed' });
                });
            }

            const userId = result.insertId;

            const studentQuery = `
                INSERT INTO students (student_id, program_name, program_batch)
                VALUES (?, ?, ?)
            `;

            db.query(studentQuery, [userId, program_name, program_batch], err => {
                if (err) {
                    return db.rollback(() => {
                        res.status(500).json({ message: 'Student profile creation failed' });
                    });
                }

                db.commit(err => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json({ message: 'Commit failed' });
                        });
                    }

                    res.status(201).json({
                        message: 'Student created successfully',
                        defaultPassword
                    });
                });
            });
        });
    });
};