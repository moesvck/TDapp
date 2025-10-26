// Di file model acara.js
import { Sequelize } from 'sequelize';
import db from '../config/Database.js';

const { DataTypes } = Sequelize;

const Acara = db.define(
  'acara',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tanggalAcara: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    idPDU: {
      type: DataTypes.INTEGER, // Ganti NUMBER dengan INTEGER
      allowNull: true,
      unique: true, // Tambahkan ini
    },
    tipeAcara: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    kendala: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    buktiDukung: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    keteranganKendala: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'acara',
    timestamps: true, // akan otomatis membuat createdAt dan updatedAt
  }
);

export default Acara;
