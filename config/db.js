const sql = require('mssql')
const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    database: process.env.DB_NAME,
    server: process.env.DB_SERVER,
    pool: {
      max: 600,
      min: 0,
      idleTimeoutMillis: 30000
    },
    options: {
      encrypt: true, // for azure
      trustServerCertificate: true // change to true for local dev / self-signed certs
    }
  }



const CosecDbPool = new sql.ConnectionPool(sqlConfig)
const ProxyDbPool = new sql.ConnectionPool(sqlConfig)

module.exports = {CosecDbPool,ProxyDbPool, sql};