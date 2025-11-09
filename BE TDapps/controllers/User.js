import Users from '../models/UserModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const getUsers = async (req, res) => {
  try {
    // Cek role user dari token - HANYA admin dan staff yang boleh akses
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({
        message: 'Access denied. Admin or Staff role required.',
      });
    }

    const users = await Users.findAll({
      attributes: ['id', 'name', 'username', 'role'],
    });

    res.json({
      message: 'Users retrieved successfully',
      data: users,
      count: users.length,
    });
  } catch (error) {
    console.error('Error in getUsers:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await Users.findOne({
      where: { id },
      attributes: ['id', 'name', 'username', 'role'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User retrieved successfully',
      data: user,
    });
  } catch (error) {
    console.error('Error in getUserById:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const register = async (req, res) => {
  const { name, username, password, confirmPassword, role } = req.body;

  // Validasi password
  if (password !== confirmPassword) {
    return res
      .status(400)
      .json({ message: 'Password and confirm password do not match' });
  }

  try {
    // 🔍 Cek apakah username sudah ada
    const existingUser = await Users.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // 🔐 Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 🧩 Simpan user baru
    await Users.create({
      name: name,
      username: username,
      password: hashedPassword,
      role: role,
    });

    res.status(201).json({ message: 'User has been registered' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong' });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 🔍 Cek username
    const user = await Users.findOne({ where: { username } });
    if (!user) {
      return res.status(404).json({ message: 'Username not found' });
    }

    // 🔐 Cek password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: 'Wrong password' });
    }

    // ✅ Buat token
    const payload = {
      userId: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: '15m', //15menit token habis
    });

    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: '1d',
    });

    // 🔄 Simpan refresh token di DB
    await Users.update(
      { refresh_token: refreshToken },
      { where: { id: user.id } }
    );

    // 🍪 Kirim cookie HTTP-only
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      // sameSite: 'none',
      // secure: true,
    });

    res.status(200).json({ accessToken });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    console.log('Received refresh token:', refreshToken);

    if (!refreshToken) return res.sendStatus(204);

    const user = await Users.findOne({
      where: { refresh_token: refreshToken },
    });
    console.log('User found:', user);

    if (!user) return res.sendStatus(204);

    await Users.update({ refresh_token: null }, { where: { id: user.id } });

    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Logout success' });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({ message: 'Logout failed', error: error.message });
  }
};
