import { Sequelize } from 'sequelize';
import db from '../config/Database.js';

const { DataTypes } = Sequelize;

const PDU = db.define(
  'pdu',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tanggal: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    userId: {
      // 🔧 GUNAKAN userld (sesuai database)
      type: DataTypes.INTEGER,
      allowNull: true, // 🔧 ubah ke true jika tidak wajib
    },
    namePDU: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    buktiSuratPerintahOperasional: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    buktiRondownAcaraHarian: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    timestamps: true, // 🔧 pastikan true untuk createdAt/updatedAt
  }
);

export default PDU;
