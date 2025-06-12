const db = require('../config/db'); // tu pool con mysql2/promise

exports.uploadAvatar = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió ningún archivo' });
    }
    if (!userId) {
      return res.status(400).json({ message: 'No se recibió userId' });
    }

    // req.file.path contiene directamente la URL de la imagen en Cloudinary
    const imageUrl = req.file.path;

    const sql = 'UPDATE users SET avatar_url = ? WHERE id = ?';
    const [resultDb] = await db.query(sql, [imageUrl, userId]);

    if (resultDb.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.status(200).json({ message: 'Avatar actualizado correctamente', url: imageUrl });
  } catch (error) {
    console.error('Error al subir avatar:', error);
    res.status(500).json({ message: 'Error interno al subir avatar' });
  }
};


