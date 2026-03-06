const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Credentials required' });
    }

    // 🔥 Allow login by EMAIL or PRN
    const [users] = await pool.query(
      `
      SELECT u.*, s.prn
      FROM users u
      LEFT JOIN students s ON u.user_id = s.user_id
      WHERE u.email = ? OR s.prn = ?
      `,
      [email, email] // same field handles both
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
  token,
  user: {
    user_id: user.user_id,
    name: user.name,   // ✅ ADD THIS
    role: user.role,
    email: user.email
  }
});

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};