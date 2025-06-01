const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require('dotenv').config({ path: './config/.env' });

const app = express();
const PORT = process.env.PORT;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');

app.use('/api', authRoutes);
app.use('/api', bookRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
