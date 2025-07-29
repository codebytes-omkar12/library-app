const mysql=require("mysql2");
const pool = mysql.createPool({
    host: 'localhost',
    user: 'library_user',
    password: 'your_secure_password',
    database: 'library_system'
});

module.exports = pool.promise();