import express from 'express';
import dotenv from 'dotenv';
import db from './config/Database.js';
import router from './routes/index.js';
import cookieParser from 'cookie-parser';
import Acara from './models/AcaraModels.js';
import cors from 'cors';
import PDU from './models/pduModels.js';

dotenv.config();
const app = express();

// 🧠 Koneksi Database
try {
  await db.authenticate();
  console.log('✅ Database connected...');
  // await Users.sync(); // aktifkan jika perlu auto-create table
  await Acara.sync();
  await PDU.sync();
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🛣️ Routes
app.use(router);

// 🚀 Jalankan server
app.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
