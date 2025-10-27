import Acara from '../models/AcaraModels.js';
import PDU from '../models/PDUModels.js';
import Users from '../models/UserModel.js';
import path from 'path';
import fs from 'fs';

//create acara (nilai field kendala valuenya true/false, jika true maka bukti dukung wajib ada dan keterangannya wajib ada)
//validasi field idpdu dan userId harus sama dengan id dan userId di tabel pdu
export const createAcara = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { idPDU, namaAcara, tipeAcara, kendala, keteranganKendala } =
      req.body;
    const user = req.user;

    // Validasi data wajib
    if (!namaAcara?.trim()) {
      return res.status(400).json({ message: 'Nama acara wajib diisi' });
    }

    if (!tipeAcara?.trim()) {
      return res.status(400).json({ message: 'Tipe acara wajib diisi' });
    }

    if (!idPDU) {
      return res.status(400).json({ message: 'idPDU wajib diisi' });
    }

    // Validasi PDU exists dan milik user
    const existingPDU = await PDU.findOne({
      where: {
        id: idPDU,
        userId: user.userId,
      },
    });

    if (!existingPDU) {
      return res.status(404).json({
        message: `PDU dengan ID ${idPDU} tidak ditemukan atau bukan milik Anda`,
      });
    }

    // Logic kendala
    const hasKendala =
      kendala === 'true' || kendala === '1' || kendala === true;

    let buktiDukungFileName = null;
    let finalKeteranganKendala = null;

    if (hasKendala) {
      if (!req.files?.buktiDukung) {
        return res.status(400).json({
          message: 'Bukti dukung wajib diupload ketika ada kendala',
        });
      }

      if (!keteranganKendala?.trim()) {
        return res.status(400).json({
          message: 'Keterangan kendala wajib diisi ketika ada kendala',
        });
      }

      // Upload file
      const buktiDukung = req.files.buktiDukung;
      const timestamp = Date.now();
      const fileExt = path.extname(buktiDukung.name);
      buktiDukungFileName = `bukti_dukung_${user.username}_${timestamp}${fileExt}`;

      const uploadDir = path.join(process.cwd(), 'uploads', 'bukti_dukung');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const uploadPath = path.join(uploadDir, buktiDukungFileName);
      await buktiDukung.mv(uploadPath);

      finalKeteranganKendala = keteranganKendala.trim();
    }

    // Create acara
    const newAcara = await Acara.create({
      userId: user.userId,
      tanggalAcara: new Date(),
      idPDU: parseInt(idPDU), // Pastikan integer
      namaAcara: namaAcara.trim(),
      tipeAcara: tipeAcara.trim(),
      kendala: hasKendala ? 'Ada Kendala' : 'Tidak Ada Kendala',
      buktiDukung: buktiDukungFileName,
      keteranganKendala: finalKeteranganKendala,
    });

    res.status(201).json({
      message: 'Acara berhasil dibuat',
      data: newAcara,
    });
  } catch (error) {
    console.error('Error in createAcara:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

//get all acara oleh admin
export const getAllAcara = async (req, res) => {
  try {
    console.log('🟢 getAllAcara (Admin) controller called');
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

    console.log('✅ User is admin, proceeding to get all acara...');

    // ✅ GET SEMUA DATA ACARA TANPA INCLUDE (SIMPLE VERSION)
    const allAcara = await Acara.findAll({
      order: [['createdAt', 'DESC']],
    });

    console.log('📦 All Acara data found:', allAcara.length, 'records');

    res.json({
      message: 'All acara data retrieved successfully',
      data: allAcara,
      count: allAcara.length,
    });
  } catch (error) {
    console.error('💥 Error in getAllAcara:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

//getacara oleh user where userId acara = userld user
export const getAcara = async (req, res) => {
  try {
    console.log('🟢 getAcara controller called');
    console.log('👤 req.user:', req.user);

    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const user = req.user;

    console.log('🔍 Filtering acara for user:', user.name, 'ID:', user.userId);

    // ✅ GET DATA ACARA HANYA UNTUK USER YANG LOGIN
    const acara = await Acara.findAll({
      where: {
        userId: user.userId, // Hanya ambil data user sendiri
      },
      order: [['createdAt', 'DESC']], // Urutkan dari yang terbaru
    });

    console.log(
      '📦 Acara data found:',
      acara.length,
      'records for user',
      user.name
    );

    // ✅ JIKA TIDAK ADA DATA
    if (acara.length === 0) {
      return res.status(404).json({
        message: 'Tidak ada data acara untuk user ' + user.name,
        data: [],
        count: 0,
      });
    }

    res.json({
      message: 'Data acara berhasil diambil',
      data: acara,
      count: acara.length,
    });
  } catch (error) {
    console.error('💥 Error in getAcara:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

//update acara by user
export const updateAcara = async (req, res) => {
  try {
    console.log('🟢 updateAcara controller called');

    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { id } = req.params; // ID Acara yang akan diupdate
    const { namaAcara, tipeAcara, kendala, keteranganKendala, idPDU } =
      req.body;
    const user = req.user;

    console.log('📝 Updating Acara ID:', id);
    console.log('👤 User:', user.name);
    console.log('📋 Request data:', {
      namaAcara,
      tipeAcara,
      kendala,
      keteranganKendala,
      idPDU,
    });

    // ✅ CEK APAKAH ACARA ADA DAN MILIK USER
    const existingAcara = await Acara.findOne({
      where: {
        id: id,
        userId: user.userId, // Hanya bisa update acara milik sendiri
      },
    });

    if (!existingAcara) {
      return res.status(404).json({
        message:
          'Acara not found or you dont have permission to update this acara',
      });
    }

    console.log('✅ Acara found and belongs to user');

    // ✅ VALIDASI idPDU JIKA DIUPDATE
    if (idPDU && idPDU !== existingAcara.idPDU) {
      const existingPDU = await PDU.findOne({
        where: {
          id: idPDU,
          userId: user.userId, // Pastikan PDU milik user yang login
        },
      });

      if (!existingPDU) {
        return res.status(404).json({
          message: 'PDU not found or you dont have permission to use this PDU',
        });
      }
      console.log('✅ PDU validation passed');
    }

    // ✅ KONVERSI kendala KE BOOLEAN
    const hasKendala = kendala === 'true' || kendala === true;
    console.log('🔧 Kendala status:', hasKendala);

    // ✅ PREPARE DATA UPDATE
    const updateData = {};

    // Field yang bisa diupdate
    if (namaAcara !== undefined) {
      if (!namaAcara || namaAcara.trim() === '') {
        return res.status(400).json({
          message: 'Nama acara cannot be empty',
        });
      }
      updateData.namaAcara = namaAcara.trim();
    }

    if (tipeAcara !== undefined) {
      if (!tipeAcara || tipeAcara.trim() === '') {
        return res.status(400).json({
          message: 'Tipe acara cannot be empty',
        });
      }
      updateData.tipeAcara = tipeAcara.trim();
    }

    if (idPDU !== undefined) {
      updateData.idPDU = idPDU || null;
    }

    // ✅ HANDLE KENDALA LOGIC
    if (kendala !== undefined) {
      if (hasKendala) {
        // Jika kendala = true, buktiDukung dan keteranganKendala wajib
        if (!req.files?.buktiDukung && !existingAcara.buktiDukung) {
          return res.status(400).json({
            message: 'Bukti dukung required when there are kendala',
          });
        }

        if (!keteranganKendala || keteranganKendala.trim() === '') {
          return res.status(400).json({
            message: 'Keterangan kendala required when there are kendala',
          });
        }

        updateData.kendala = 'Ada Kendala';
        updateData.keteranganKendala = keteranganKendala.trim();
      } else {
        // Jika kendala = false, buktiDukung dan keteranganKendala = null
        updateData.kendala = 'Tidak Ada Kendala';
        updateData.keteranganKendala = null;
        // Note: buktiDukung file tidak dihapus, hanya di-set null di database
      }
    }

    // ✅ HANDLE FILE UPLOAD BUKTI DUKUNG
    if (req.files?.buktiDukung) {
      const buktiDukung = req.files.buktiDukung;
      const timestamp = Date.now();
      const fileExt = path.extname(buktiDukung.name);
      const buktiDukungFileName = `bukti_dukung_${user.username}_${timestamp}${fileExt}`;

      const uploadDir = path.join(process.cwd(), 'uploads', 'bukti_dukung');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const uploadPath = path.join(uploadDir, buktiDukungFileName);
      await buktiDukung.mv(uploadPath);

      updateData.buktiDukung = buktiDukungFileName;
      console.log('💾 New bukti dukung saved:', buktiDukungFileName);
    }

    // ✅ JIKA TIDAK ADA DATA YANG DIUPDATE
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: 'No data provided for update',
      });
    }

    // ✅ UPDATE ACARA
    const [affectedRows] = await Acara.update(updateData, {
      where: {
        id: id,
        userId: user.userId,
      },
    });

    if (affectedRows === 0) {
      return res.status(404).json({
        message: 'Acara not found or no changes made',
      });
    }

    // ✅ GET DATA TERUPDATE
    const updatedAcara = await Acara.findByPk(id);

    console.log('✅ Acara updated successfully');

    res.json({
      message: 'Acara updated successfully',
      data: updatedAcara,
    });
  } catch (error) {
    console.error('💥 Error in updateAcara:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

//hapus acara :id by user
export const deleteAcara = async (req, res) => {
  try {
    console.log('🟢 deleteAcara controller called');

    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { id } = req.params; // ID Acara yang akan dihapus
    const user = req.user;

    console.log('🗑️ Deleting Acara ID:', id);
    console.log('👤 User:', user.name);

    // ✅ CEK APAKAH ACARA ADA DAN MILIK USER
    const existingAcara = await Acara.findOne({
      where: {
        id: id,
        userId: user.userId, // Hanya bisa hapus acara milik sendiri
      },
    });

    if (!existingAcara) {
      return res.status(404).json({
        message:
          'Acara not found or you dont have permission to delete this acara',
      });
    }

    console.log('✅ Acara found and belongs to user');

    // ✅ HAPUS FILE BUKTI DUKUNG JIKA ADA
    try {
      if (existingAcara.buktiDukung) {
        const buktiDukungPath = path.join(
          process.cwd(),
          'uploads',
          'bukti_dukung',
          existingAcara.buktiDukung
        );

        if (fs.existsSync(buktiDukungPath)) {
          fs.unlinkSync(buktiDukungPath);
          console.log('📄 Deleted bukti dukung file:', buktiDukungPath);
        } else {
          console.log('⚠️ Bukti dukung file not found:', buktiDukungPath);
        }
      }
    } catch (fileError) {
      console.warn(
        '⚠️ Error deleting bukti dukung file, continuing with database delete:',
        fileError
      );
    }

    // ✅ HAPUS DARI DATABASE
    const deletedRows = await Acara.destroy({
      where: {
        id: id,
        userId: user.userId,
      },
    });

    if (deletedRows === 0) {
      return res.status(404).json({
        message: 'Acara not found or already deleted',
      });
    }

    console.log('✅ Acara deleted successfully');

    res.json({
      message: 'Acara deleted successfully',
      deletedId: parseInt(id),
      deletedAcara: existingAcara.namaAcara,
    });
  } catch (error) {
    console.error('💥 Error in deleteAcara:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};
