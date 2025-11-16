import jwt from 'jsonwebtoken';
import User from '../models/UserModel.js'; // ✅ tambahkan .js

export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.sendStatus(401); // tidak ada token

    // 🔍 Cari user berdasarkan refresh token
    const user = await User.findOne({
      where: { refresh_token: refreshToken },
    });

    if (!user) return res.sendStatus(403); // token tidak cocok di DB

    // ✅ Verifikasi refresh token
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      (err, decoded) => {
        if (err) return res.sendStatus(403);

        const userId = user.id;
        const name = user.name;
        const username = user.username;
        const role = user.role;

        // 🔑 Buat access token baru
        const accessToken = jwt.sign(
          { userId, name, username, role },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: '1d' } // bisa kamu ubah durasinya
        );

        res.json({ accessToken });
      }
    );
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
};
