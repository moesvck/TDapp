import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  try {
    // 🔍 Ambil header Authorization (biasanya formatnya: "Bearer <token>")
    const authHeader = req.headers['authorization'];

    // 🚫 Jika tidak ada header
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // 🔓 Pisahkan token dari "Bearer "
    const token = authHeader.split(' ')[1];

    // 🚫 Jika token tidak ada
    if (!token) {
      return res.status(401).json({ message: 'Access token missing' });
    }

    // ✅ Verifikasi token menggunakan secret dari .env
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.error('JWT verification error:', err);
        return res.status(403).json({ message: 'Invalid or expired token' });
      }

      // 🧩 Simpan data user ke req (supaya bisa diakses di endpoint lain)
      req.user = decoded; // berisi { userId, name, username, role, iat, exp }

      next(); // lanjut ke endpoint berikutnya
    });
  } catch (error) {
    console.error('verifyToken error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
