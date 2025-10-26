import { Sequelize } from 'sequelize';
import db from '../config/Database.js';

const { DataTypes } = Sequelize;

const PDU = db.define(
  'pdu',
  {
    tanggal: {
      type: DataTypes.DATE,
      allowNull: false,
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
  }
);
export default PDU;
