const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: 'Token missing' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = decoded; // { user_id, role }
        next();
    });
};

exports.isStudent = (req, res, next) => {
    if (req.user.role !== 'STUDENT') {
        return res.status(403).json({ message: 'Student access only' });
    }
    next();
};


exports.isTPO = (req, res, next) => {
    if (req.user.role !== 'TPO') {
        return res.status(403).json({ message: 'TPO access only' });
    }
    next();
};