import express from 'express';
import { getUsers, register, login, logout } from '../controllers/User.js';
import { verifyToken } from '../midleware/VerifyToken.js'; // untuk verifikasi aksek harus login agara dapat token
import { refreshToken } from '../controllers/RefreshToken.js';
// import { getPDU } from '../controllers/PDU.js';

const router = express.Router();

router.get('/users', verifyToken, getUsers);
router.post('/register', register);
router.post('/login', login);
router.get('/token', refreshToken);
router.delete('/logout', logout);

// router.get('/pdu', getPDU);

export default router;
