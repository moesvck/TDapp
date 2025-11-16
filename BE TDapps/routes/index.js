import express from 'express';
import {
  getUsers,
  getUserById,
  register,
  login,
  logout,
  deleteUserById,
  updateUserById,
} from '../controllers/User.js';
import { verifyToken } from '../midleware/VerifyToken.js'; // untuk verifikasi aksek harus login agara dapat token
import { refreshToken } from '../controllers/RefreshToken.js';
import {
  getPDU,
  createPDU,
  getAllPDU,
  updatePDU,
  deletePDU,
  getAllPDUStaff,
} from '../controllers/PDU.js';
import {
  createAcara,
  getAllAcara,
  getAcara,
  updateAcara,
  deleteAcara,
  getAcaraById,
} from '../controllers/Acara.js';

const router = express.Router();

router.get('/users', verifyToken, getUsers);
router.get('/users/:id', verifyToken, getUserById);
router.post('/register', register);
router.post('/login', login);
router.get('/token', refreshToken);
router.delete('/logout', logout);
router.patch('/users/:id', verifyToken, updateUserById);
router.delete('/users/:id', verifyToken, deleteUserById);

router.get('/pdu', verifyToken, getPDU);
router.post('/pdu', verifyToken, createPDU);
router.get('/pduadmin', verifyToken, getAllPDU);
router.get('/pdustaff', verifyToken, getAllPDUStaff);
router.put('/pdu/:id', verifyToken, updatePDU);
router.delete('/pdu/:id', verifyToken, deletePDU);

router.post('/acara', verifyToken, createAcara);
router.get('/admin/acara', verifyToken, getAllAcara);
router.get('/acara', verifyToken, getAcara);
router.put('/acara/:id', verifyToken, updateAcara);
router.delete('/acara/:id', verifyToken, deleteAcara);
router.get('/acara/:id', verifyToken, getAcaraById);

export default router;
