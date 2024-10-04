const mysql = require('mysql2');
require('dotenv').config({ path: './config/.env' });

// Configuración de la conexión a la base de datos
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

// Conectar a MySQL
connection.connect((err) => {
    if (err) {
        console.error('Error de conexión a MySQL: ' + err.stack);
        return;
    }
    console.log('Conexión a MySQL exitosa como ID ' + connection.threadId);
});

module.exports = connection;