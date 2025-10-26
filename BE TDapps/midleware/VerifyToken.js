import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token missing' });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.error('JWT verification error:', err);

        // 🔧 Bisa dibedakan antara token expired dan invalid
        if (err.name === 'TokenExpiredError') {
          return res.status(403).json({ message: 'Token expired' });
        } else if (err.name === 'JsonWebTokenError') {
          return res.status(403).json({ message: 'Invalid token' });
        } else {
          return res.status(403).json({ message: 'Token verification failed' });
        }
      }

      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('verifyToken error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
