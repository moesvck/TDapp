import PDU from '../models/PDUModels.js';
import { Op, Sequelize } from 'sequelize';
import path from 'path';
import fs from 'fs';

//Get PDU oleh user tidak ada validasi bulan dan tahun
// export const getPDU = async (req, res) => {
//   try {
//     console.log('🟢 getPDU controller called');
//     console.log('👤 req.user:', req.user);

//     if (!req.user) {
//       console.log('❌ req.user is undefined');
//       return res.status(401).json({ message: 'User not authenticated' });
//     }

//     console.log('📋 req.user structure:', Object.keys(req.user));

//     // Coba beberapa kemungkinan property name
//     const userId = req.user.userId || req.user.id || req.user.userID;
//     console.log('🆔 Extracted userId:', userId);

//     if (!userId) {
//       console.log('❌ No userId found in token');
//       return res.status(400).json({ message: 'User ID not found in token' });
//     }

//     // ✅ PERBAIKI: gunakan userId BUKAN userld
//     const pdu = await PDU.findAll({
//       where: {
//         userId: userId, // 🔧 userId bukan userld
//       },
//     });

//     console.log('📦 PDU data found:', pdu.length, 'records');

//     res.json(pdu);
//   } catch (error) {
//     console.error('💥 Error in getPDU:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

//Create PDU oleh user
export const createPDU = async (req, res) => {
  try {
    console.log('🟢 createPDU controller called');

    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (
      !req.files?.buktiSuratPerintahOperasional ||
      !req.files?.buktiRondownAcaraHarian
    ) {
      return res.status(400).json({
        message: 'Both bukti surat and bukti rundown are required',
      });
    }

    // ✅ AMBIL namePDU DARI REQUEST BODY
    const { namePDU } = req.body;
    const { buktiSuratPerintahOperasional, buktiRondownAcaraHarian } =
      req.files;
    const user = req.user;
    const timestamp = Date.now();

    console.log('👤 User creating PDU:', user.name);
    console.log('🏷️ Manual namePDU:', namePDU);

    // Validasi namePDU
    if (!namePDU || namePDU.trim() === '') {
      return res.status(400).json({
        message: 'namePDU is required',
      });
    }

    // Create upload directories
    const baseDir = path.join(process.cwd(), 'uploads');
    const suratDir = path.join(baseDir, 'bukti_surat');
    const rondownDir = path.join(baseDir, 'bukti_rondown');

    [suratDir, rondownDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log('📁 Created directory:', dir);
      }
    });

    // Helper function to save file
    const saveFile = async (file, type) => {
      const fileExt = path.extname(file.name);
      const fileName = `${type}_${user.username}_${timestamp}${fileExt}`;
      const uploadPath = path.join(
        type === 'surat' ? suratDir : rondownDir,
        fileName
      );

      console.log(`💾 Saving ${type} file:`, uploadPath);
      await file.mv(uploadPath);
      return fileName;
    };

    // Save both files
    const [suratFileName, rondownFileName] = await Promise.all([
      saveFile(buktiSuratPerintahOperasional, 'surat'),
      saveFile(buktiRondownAcaraHarian, 'rondown'),
    ]);

    console.log('✅ Files saved:', { suratFileName, rondownFileName });

    // ✅ GUNAKAN namePDU DARI INPUT MANUAL
    const newPDU = await PDU.create({
      tanggal: new Date(),
      userId: user.userId || user.id,
      namePDU: namePDU.trim(), // Manual input
      buktiSuratPerintahOperasional: suratFileName,
      buktiRondownAcaraHarian: rondownFileName,
    });

    console.log('✅ PDU created in database:', newPDU.id);

    res.status(201).json({
      message: 'PDU created successfully',
      data: newPDU,
    });
  } catch (error) {
    console.error('💥 Create PDU Error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

//create PDU oleh user dimana data yang tampil merupakan data di bulan dan tahun yang sama ketika user getData
export const getPDU = async (req, res) => {
  try {
    console.log('🟢 getPDU controller called');
    console.log('👤 req.user:', req.user);

    if (!req.user) {
      console.log('❌ req.user is undefined');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = req.user.userId || req.user.id || req.user.userID;
    console.log('🆔 Extracted userId:', userId);

    if (!userId) {
      console.log('❌ No userId found in token');
      return res.status(400).json({ message: 'User ID not found in token' });
    }

    // ✅ DAPATKAN BULAN DAN TAHUN SEKARANG
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // January is 0, so add 1
    const currentYear = now.getFullYear();

    console.log('📅 Current month:', currentMonth);
    console.log('📅 Current year:', currentYear);

    // ✅ BUAT RANGE TANGGAL AWAL DAN AKHIR BULAN
    const startDate = new Date(currentYear, currentMonth - 1, 1); // First day of month
    const endDate = new Date(currentYear, currentMonth, 0); // Last day of month

    console.log('📅 Start date:', startDate.toISOString());
    console.log('📅 End date:', endDate.toISOString());

    // ✅ FILTER PDU BERDASARKAN USER ID DAN RANGE TANGGAL
    const pdu = await PDU.findAll({
      where: {
        userId: userId,
        tanggal: {
          [Op.between]: [startDate, endDate], // ✅ GUNAKAN Op.between
        },
      },
      order: [['tanggal', 'DESC']], // Urutkan dari tanggal terbaru
    });

    console.log('📦 PDU data found for current month:', pdu.length, 'records');

    res.json({
      message: `Data PDU untuk ${getMonthName(currentMonth)} ${currentYear}`,
      data: pdu,
      count: pdu.length,
      filter: {
        month: currentMonth,
        year: currentYear,
        monthName: getMonthName(currentMonth),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('💥 Error in getPDU:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// Helper function untuk mendapatkan nama bulan
function getMonthName(month) {
  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  return monthNames[month - 1];
}

//get data pdu oleh admin
export const getAllPDU = async (req, res) => {
  try {
    console.log('🟢 getAllPDU (Admin) controller called');
    console.log('👤 req.user:', req.user);

    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // ✅ CEK ROLE ADMIN
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied. Admin role required.',
      });
    }

    console.log('✅ User is admin, proceeding...');

    // ✅ GET SEMUA DATA PDU TANPA FILTER
    const allPDU = await PDU.findAll({
      order: [['createdAt', 'DESC']], // Urutkan dari yang terbaru
    });

    console.log('📦 All PDU data found:', allPDU.length, 'records');

    res.json({
      message: 'All PDU data retrieved successfully',
      data: allPDU,
      count: allPDU.length,
    });
  } catch (error) {
    console.error('💥 Error in getAllPDU:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

//update data pdu oleh user hanya bisa dilakukan di hari pembuatan dan hanya bisa menganti punyanya saja
export const updatePDU = async (req, res) => {
  try {
    console.log('🟢 updatePDU controller called');

    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { id } = req.params; // ID PDU yang akan diupdate
    const { namePDU } = req.body;
    const user = req.user;

    console.log('📝 Updating PDU ID:', id);
    console.log('👤 User:', user.name);

    // ✅ CEK APAKAH PDU ADA
    const existingPDU = await PDU.findOne({
      where: {
        id: id,
        userId: user.userId, // Hanya bisa update PDU milik sendiri
      },
    });

    if (!existingPDU) {
      return res.status(404).json({
        message: 'PDU not found or you dont have permission to update this PDU',
      });
    }

    // ✅ CEK BATASAN WAKTU - Hanya bisa update di hari pembuatan
    const createdAt = new Date(existingPDU.createdAt);
    const today = new Date();

    // Bandingkan tanggal (tanpa waktu)
    const isSameDay =
      createdAt.getDate() === today.getDate() &&
      createdAt.getMonth() === today.getMonth() &&
      createdAt.getFullYear() === today.getFullYear();

    console.log('📅 Created date:', createdAt.toDateString());
    console.log('📅 Today date:', today.toDateString());
    console.log('⏰ Is same day:', isSameDay);

    if (!isSameDay) {
      return res.status(403).json({
        message:
          'Cannot update PDU. You can only update on the same day it was created.',
      });
    }

    // ✅ PREPARE DATA UPDATE
    const updateData = {};

    // Jika ada namePDU baru
    if (namePDU && namePDU.trim() !== '') {
      updateData.namePDU = namePDU.trim();
    }

    // Jika ada file bukti surat baru
    if (req.files?.buktiSuratPerintahOperasional) {
      const buktiSurat = req.files.buktiSuratPerintahOperasional;
      const timestamp = Date.now();
      const fileExt = path.extname(buktiSurat.name);
      const fileName = `surat_${user.username}_${timestamp}${fileExt}`;

      const uploadPath = path.join(
        process.cwd(),
        'uploads',
        'bukti_surat',
        fileName
      );
      await buktiSurat.mv(uploadPath);

      updateData.buktiSuratPerintahOperasional = fileName;
    }

    // Jika ada file bukti rundown baru
    if (req.files?.buktiRondownAcaraHarian) {
      const buktiRondown = req.files.buktiRondownAcaraHarian;
      const timestamp = Date.now();
      const fileExt = path.extname(buktiRondown.name);
      const fileName = `rondown_${user.username}_${timestamp}${fileExt}`;

      const uploadPath = path.join(
        process.cwd(),
        'uploads',
        'bukti_rondown',
        fileName
      );
      await buktiRondown.mv(uploadPath);

      updateData.buktiRondownAcaraHarian = fileName;
    }

    // Jika tidak ada data yang diupdate
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: 'No data provided for update',
      });
    }

    // ✅ UPDATE PDU
    const [affectedRows] = await PDU.update(updateData, {
      where: {
        id: id,
        userId: user.userId,
      },
    });

    if (affectedRows === 0) {
      return res.status(404).json({
        message: 'PDU not found or no changes made',
      });
    }

    // ✅ GET DATA TERUPDATE
    const updatedPDU = await PDU.findByPk(id);

    console.log('✅ PDU updated successfully');

    res.json({
      message: 'PDU updated successfully',
      data: updatedPDU,
    });
  } catch (error) {
    console.error('💥 Error in updatePDU:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// hanya bisa dihapus oleh user yang membuatnya
export const deletePDU = async (req, res) => {
  try {
    console.log('🟢 deletePDU controller called');

    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { id } = req.params; // ID PDU yang akan dihapus
    const user = req.user;

    console.log('🗑️ Deleting PDU ID:', id);
    console.log('👤 User:', user.name);

    // ✅ CEK APAKAH PDU ADA DAN MILIK USER
    const existingPDU = await PDU.findOne({
      where: {
        id: id,
        userId: user.userId, // Hanya bisa hapus PDU milik sendiri
      },
    });

    if (!existingPDU) {
      return res.status(404).json({
        message: 'PDU not found or you dont have permission to delete this PDU',
      });
    }

    // ✅ HAPUS FILE FISIK JIKA ADA
    try {
      // Hapus file bukti surat
      if (existingPDU.buktiSuratPerintahOperasional) {
        const suratPath = path.join(
          process.cwd(),
          'uploads',
          'bukti_surat',
          existingPDU.buktiSuratPerintahOperasional
        );
        if (fs.existsSync(suratPath)) {
          fs.unlinkSync(suratPath);
          console.log('📄 Deleted surat file:', suratPath);
        }
      }

      // Hapus file bukti rundown
      if (existingPDU.buktiRondownAcaraHarian) {
        const rondownPath = path.join(
          process.cwd(),
          'uploads',
          'bukti_rondown',
          existingPDU.buktiRondownAcaraHarian
        );
        if (fs.existsSync(rondownPath)) {
          fs.unlinkSync(rondownPath);
          console.log('📄 Deleted rondown file:', rondownPath);
        }
      }
    } catch (fileError) {
      console.warn(
        '⚠️ Error deleting files, continuing with database delete:',
        fileError
      );
    }

    // ✅ HAPUS DARI DATABASE
    const deletedRows = await PDU.destroy({
      where: {
        id: id,
        userId: user.userId,
      },
    });

    if (deletedRows === 0) {
      return res.status(404).json({
        message: 'PDU not found or already deleted',
      });
    }

    console.log('✅ PDU deleted successfully');

    res.json({
      message: 'PDU deleted successfully',
      deletedId: id,
    });
  } catch (error) {
    console.error('💥 Error in deletePDU:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};
