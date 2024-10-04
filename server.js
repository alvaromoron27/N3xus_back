const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
require('dotenv').config({ path: './config/.env' });
const PORT = process.env.PORT;

app.use(bodyParser.json());
app.use(cors());

const authRoutes = require('./routes/authRoutes.js');
const bookRoutes = require('./routes/bookRoutes');

app.use('/', authRoutes);
app.use('/', bookRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
