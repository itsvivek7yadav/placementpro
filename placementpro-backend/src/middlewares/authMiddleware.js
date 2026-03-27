const jwt = require('jsonwebtoken');

function extractToken(req) {
    const authHeader =
        req.headers.authorization ||
        req.headers.Authorization ||
        req.get?.('authorization') ||
        req.get?.('Authorization');

    if (typeof authHeader === 'string' && authHeader.trim()) {
        const trimmed = authHeader.trim();
        if (/^Bearer\s+/i.test(trimmed)) {
            return trimmed.replace(/^Bearer\s+/i, '').trim();
        }
        return trimmed;
    }

    const fallbackToken =
        req.headers['x-access-token'] ||
        req.headers['x-auth-token'] ||
        req.query?.token;

    return typeof fallbackToken === 'string' && fallbackToken.trim()
        ? fallbackToken.trim()
        : null;
}

exports.verifyToken = (req, res, next) => {
    const token = extractToken(req);

    if (!token) {
        console.warn('[Auth] Missing token', {
            path: req.originalUrl,
            method: req.method,
            headerKeys: Object.keys(req.headers || {})
        });
        return res.status(401).json({ message: 'Token missing' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.warn('[Auth] Invalid token', {
                path: req.originalUrl,
                method: req.method,
                error: err.message
            });
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
