import express from 'express';
import { getUsers, register, login, logout } from '../controllers/User.js';
import { verifyToken } from '../midleware/VerifyToken.js'; // untuk verifikasi aksek harus login agara dapat token
import { refreshToken } from '../controllers/RefreshToken.js';
import {
  getPDU,
  createPDU,
  getAllPDU,
  updatePDU,
  deletePDU,
} from '../controllers/PDU.js';
import {
  createAcara,
  getAllAcara,
  getAcara,
  updateAcara,
  deleteAcara,
} from '../controllers/Acara.js';

const router = express.Router();

router.get('/users', verifyToken, getUsers);
router.post('/register', register);
router.post('/login', login);
router.get('/token', refreshToken);
router.delete('/logout', logout);

router.get('/pdu', verifyToken, getPDU);
router.post('/pdu', verifyToken, createPDU);
router.get('/pduadmin', verifyToken, getAllPDU);
router.put('/pdu/:id', verifyToken, updatePDU);
router.delete('/pdu/:id', verifyToken, deletePDU);

router.post('/acara', verifyToken, createAcara);
router.get('/admin/acara', verifyToken, getAllAcara);
router.get('/acara', verifyToken, getAcara);
router.put('/acara/:id', verifyToken, updateAcara);
router.delete('/acara/:id', verifyToken, deleteAcara);

export default router;
