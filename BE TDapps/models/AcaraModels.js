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
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tanggalAcara: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    idPDU: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    namaAcara: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    tipeAcara: {
      type: DataTypes.STRING(255),
      allowNull: false,
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
    timestamps: true,
  }
);

export default Acara;
