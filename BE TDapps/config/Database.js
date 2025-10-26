import { Sequelize } from 'sequelize';

const db = new Sequelize('td-db', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
});

export default db;
