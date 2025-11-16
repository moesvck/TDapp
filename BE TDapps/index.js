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
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

dotenv.config();
const app = express();

// ✅ CEK ACCESS_TOKEN_SECRET (sesuai dengan .env Anda)
if (!process.env.ACCESS_TOKEN_SECRET) {
  console.error(
    '❌ ACCESS_TOKEN_SECRET is not defined in environment variables'
  );
  process.exit(1);
}

console.log(
  '🔑 ACCESS_TOKEN_SECRET loaded:',
  process.env.ACCESS_TOKEN_SECRET ? 'Yes' : 'No'
);

const server = createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ SOCKET.IO SETUP
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Simpan io instance
app.set('io', io);

app.use(
  fileUpload({
    createParentPath: true,
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
    useTempFiles: false,
  })
);

// 🧠 Koneksi Database
try {
  await db.authenticate();
  console.log('✅ Database connected...');
} catch (error) {
  console.error('❌ Database connection error:', error);
}

// 🧩 Middleware
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🗂️ Static File Serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ SOCKET.IO AUTHENTICATION MIDDLEWARE - FIXED
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  console.log(
    '🔐 Socket auth attempt with token:',
    token ? 'Present' : 'Missing'
  );

  if (!token) {
    console.log(
      '⚠️ No token provided for socket connection - allowing limited access'
    );
    socket.isAuthenticated = false;
    socket.userId = 'anonymous';
    return next();
  }

  try {
    // ✅ GUNAKAN ACCESS_TOKEN_SECRET sesuai .env Anda
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log('✅ Socket authenticated for user:', decoded.userId);
    socket.userId = decoded.userId;
    socket.userData = decoded;
    socket.isAuthenticated = true;
    next();
  } catch (error) {
    console.log('❌ JWT verification failed:', error.message);

    // Untuk development, bypass auth sementara
    console.log('🛠️ Development mode: Bypassing auth for socket connection');
    socket.isAuthenticated = false;
    socket.userId = 'anonymous';
    return next();
  }
});

// ✅ SOCKET.IO CONNECTION HANDLER
io.on('connection', (socket) => {
  console.log(
    '🔌 User connected:',
    socket.id,
    'Authenticated:',
    socket.isAuthenticated,
    'User ID:',
    socket.userId
  );

  // Kirim status connection ke client
  socket.emit('connectionStatus', {
    status: 'connected',
    authenticated: socket.isAuthenticated,
    userId: socket.userId,
    message: socket.isAuthenticated ? 'Fully authenticated' : 'Limited access',
  });

  if (socket.isAuthenticated) {
    socket.join(`user_${socket.userId}`);
    socket.join('global');
  }

  // ✅ HANDLE CLIENT EVENTS
  socket.on('requestRefresh', () => {
    if (!socket.isAuthenticated) {
      socket.emit('error', {
        message: 'Authentication required for this action',
      });
      return;
    }
    console.log('🔄 Refresh requested by:', socket.userId);
    socket.broadcast.emit('dataRefreshed', {
      message: 'Data refreshed by another user',
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('acaraUpdated', (acaraData) => {
    if (!socket.isAuthenticated) return;
    console.log('📡 Acara updated by:', socket.userId, 'Data:', acaraData.id);
    socket.broadcast.emit('acaraUpdated', acaraData);
  });

  socket.on('acaraCreated', (acaraData) => {
    if (!socket.isAuthenticated) return;
    console.log('📡 Acara created by:', socket.userId, 'Data:', acaraData.id);
    socket.broadcast.emit('acaraCreated', acaraData);
  });

  socket.on('acaraDeleted', (acaraData) => {
    if (!socket.isAuthenticated) return;
    console.log('📡 Acara deleted by:', socket.userId, 'Data:', acaraData);
    socket.broadcast.emit('acaraDeleted', acaraData);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 User disconnected:', socket.id, 'Reason:', reason);
  });

  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });
});

// 🛣️ Routes
app.use(router);

// ✅ SOCKET.IO EMITTER MIDDLEWARE
const socketEmitter = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    const io = req.app.get('io');

    if (io && res.statusCode >= 200 && res.statusCode < 300) {
      if (req.method === 'POST' && req.originalUrl.includes('/acara')) {
        console.log('📡 Emitting acaraCreated event:', data.data?.id);
        io.emit('acaraCreated', data.data);
      } else if (req.method === 'PUT' && req.originalUrl.includes('/acara')) {
        console.log('📡 Emitting acaraUpdated event:', data.data?.id);
        io.emit('acaraUpdated', data.data);
      } else if (
        req.method === 'DELETE' &&
        req.originalUrl.includes('/acara')
      ) {
        console.log('📡 Emitting acaraDeleted event:', req.params.id);
        io.emit('acaraDeleted', {
          id: req.params.id,
          namaAcara: data.data?.namaAcara || 'Acara',
        });
      }
    }

    originalJson.call(this, data);
  };

  next();
};

app.use('/acara', socketEmitter);

// 🚀 Jalankan server
server.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
  console.log('🔌 Socket.IO server is ready');
  console.log(
    '🔑 Using ACCESS_TOKEN_SECRET:',
    process.env.ACCESS_TOKEN_SECRET ? 'Yes' : 'No'
  );
  console.log('🌍 Environment:', process.env.NODE_ENV);
  console.log('📁 Static files served from:', path.join(__dirname, 'uploads'));
});

export { app, server, io };
