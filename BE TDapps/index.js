import express from 'express';
import dotenv from 'dotenv';
import db from './config/Database.js';
import router from './routes/index.js';
import cookieParser from 'cookie-parser';
import Acara from './models/AcaraModels.js';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import PDU from './models/PDUModels.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();

// 🎯 Fix untuk __dirname di ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  fileUpload({
    createParentPath: true,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    useTempFiles: false,
  })
);

// 🧠 Koneksi Database
try {
  await db.authenticate();
  console.log('✅ Database connected...');
  // await Users.sync(); // aktifkan jika perlu auto-create table
  // await Acara.sync();
  // await PDU.sync();
} catch (error) {
  console.error('❌ Database connection error:', error);
}

// 🧩 Middleware penting
app.use(
  cors({
    origin: 'http://localhost:5173', // URL React (Vite)
    credentials: true, // Izinkan cookie dikirim
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // optional, tapi bagus untuk eksplisit
    allowedHeaders: ['Content-Type', 'Authorization'], // optional juga
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🗂️ STATIC FILE SERVING - TAMBAHKAN INI
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug middleware untuk melihat request ke static files
app.use('/uploads', (req, res, next) => {
  console.log('📁 Static file request:', req.url);
  next();
});

// 🛣️ Routes
app.use(router);

// 🚀 Jalankan server
app.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
  console.log('📁 Static files served from:', path.join(__dirname, 'uploads'));
});
