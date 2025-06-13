const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWD,
  },
});

// Endpoint POST para registrar un nuevo usuario
exports.register = async (req, res) => {
  const { nombre, apellidos, correo, contraseña, usuario } = req.body;

  if (!usuario || !nombre || !apellidos || !correo || !contraseña) {
    return res.status(400).json({ message: "Todos los campos son requeridos" });
  }

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contraseña, saltRounds);

    // Intentar insertar el nuevo usuario
    const query = `
      INSERT INTO users (nombre, apellidos, email, contraseña, usuario) 
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(query, [
      nombre,
      apellidos,
      correo,
      hashedPassword,
      usuario,
    ]);

    // Generar token de confirmación
    const token = jwt.sign({ correo }, process.env.JWT_SECRET_CONFIRM, {
      expiresIn: "1h",
    });

    // Configurar correo
    const mailOptions = {
      from: process.env.EMAIL,
      to: correo,
      subject: "🔐 Confirma tu cuenta 🔐",
      text: `Hola ${nombre},\n\nGracias por registrarte. Por favor, confirma tu cuenta haciendo clic en el siguiente enlace:\n\nhttps://n3xus-project.vercel.app/confirm-account/${token}`,
    };

    await transporter.sendMail(mailOptions);

    res
      .status(201)
      .send("Usuario registrado con éxito. Por favor, verifica tu correo.");
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      if (err.message.includes("email")) {
        return res
          .status(409)
          .json({ message: "El correo electrónico ya está registrado." });
      }
      if (err.message.includes("usuario")) {
        return res
          .status(409)
          .json({ message: "El nombre de usuario ya está registrado." });
      }
    }

    console.error("Error al registrar el usuario:", err);
    res.status(500).send("Error interno del servidor");
  }
};

// Endpoint para reenviar el correo de confirmación
exports.resendConfirmation = async (req, res) => {
  const { identificador } = req.body;

  if (!identificador) {
    return res.status(400).json({ message: "El identificador es obligatorio" });
  }

  try {
    const esEmail = identificador.includes("@");
    const query = esEmail
      ? "SELECT * FROM users WHERE email = ?"
      : "SELECT * FROM users WHERE usuario = ?";
    const [results] = await db.query(query, [identificador]);

    if (results.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const usuario = results[0];

    if (usuario.confirmado === 1) {
      return res.status(400).json({ message: "La cuenta ya está confirmada." });
    }

    const correo = usuario.email;

    const token = jwt.sign({ correo }, process.env.JWT_SECRET_CONFIRM, {
      expiresIn: "1h",
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: correo,
      subject: "🔐Confirma tu cuenta - Reenvío🔐",
      text: `Hola ${usuario.nombre},\n\nReenvío de confirmación. Por favor, confirma tu cuenta haciendo clic en el siguiente enlace:\n\nhttps://n3xus-project.vercel.app/confirm-account/${token}`,
    };

    await transporter.sendMail(mailOptions);

    console.log("Correo enviado correctamente");

    res.status(200).json({
      message:
        "Correo de confirmación reenviado. Por favor, verifica tu bandeja de entrada.",
    });
  } catch (error) {
    console.error("Error procesando la solicitud:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Endpoint para confirmar la cuenta
exports.confirmAccount = async (req, res) => {
  const { token } = req.body;

  try {
    const { correo } = jwt.verify(token, process.env.JWT_SECRET_CONFIRM);

    const query = "UPDATE users SET confirmado = 1 WHERE email = ?";
    const [results] = await db.query(query, [correo]);

    res.status(200).json({
      message:
        "Cuenta confirmada correctamente, ya puedes cerrar esta pestaña e iniciar sesión.",
    });
  } catch (error) {
    console.error("Error verificando el token:", error);
    res.status(400).send("Enlace de confirmación inválido o expirado.");
  }
};

// Endpoint para iniciar sesión
exports.login = async (req, res) => {
  const { identificador, contraseña } = req.body;

  if (!identificador || !contraseña) {
    return res
      .status(400)
      .json({ message: "Identificador y contraseña son requeridos" });
  }

  try {
    // Buscar usuario por email o nombre de usuario
    const query = "SELECT * FROM users WHERE email = ? OR usuario = ?";
    const [results] = await db.query(query, [identificador, identificador]);

    if (results.length === 0) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const usuario = results[0];

    // Verificamos si la cuenta esta bloqueada
    const ahora = new Date();
    if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > ahora) {
      return res.status(403).json({
        message: `Intentelo de nuevo mas tarde`,
        bloqueado: true,
      });
    }

    // Verificar si la cuenta está confirmada
    if (usuario.confirmado !== 1) {
      return res.status(403).json({
        message: "La cuenta no ha sido confirmada.",
        unconfirmed: true,
      });
    }

    // Verificar la contraseña
    const match = await bcrypt.compare(contraseña, usuario.contraseña);

    if (!match) {
      // Verificar datos actuales antes de actualizar
      const [updated] = await db.query(
        "SELECT intentos_fallidos, baneos_totales, ultimo_acceso_incorrecto FROM users WHERE id = ?",
        [usuario.id]
      );

      let { intentos_fallidos, baneos_totales, ultimo_acceso_incorrecto } =
        updated[0];

      // Verificar si el último intento fue hace más de 1 hora
      const ahora = new Date();
      const umbralTiempo = 60 * 60 * 1000;

      if (
        ultimo_acceso_incorrecto &&
        ahora - new Date(ultimo_acceso_incorrecto) > umbralTiempo
      ) {
        // Reiniciamos los intentos fallidos
        await db.query(
          `UPDATE users 
     SET intentos_fallidos = 1, 
         ultimo_acceso_incorrecto = NOW() 
     WHERE id = ?`,
          [usuario.id]
        );
        intentos_fallidos = 1;
      } else {
        // Aumentamos los intentos fallidos normalmente
        await db.query(
          `UPDATE users 
     SET intentos_fallidos = intentos_fallidos + 1, 
         ultimo_acceso_incorrecto = NOW() 
     WHERE id = ?`,
          [usuario.id]
        );
        intentos_fallidos += 1;
      }

      // Evaluamos el número de intentos fallidos y si se da el caso aplicamos un baneo
      if (intentos_fallidos >= 5) {
        const nuevoBaneo = baneos_totales + 1;
        const minutosBloqueo = Math.min(nuevoBaneo * 5, 60);
        const bloqueadoHasta = new Date(
          Date.now() + minutosBloqueo * 60 * 1000
        );

        const applyBanQuery = `
          UPDATE users 
          SET 
            baneos_totales = ?, 
            bloqueado_hasta = ?,
            intentos_fallidos = 0
          WHERE id = ?
        `;
        await db.query(applyBanQuery, [nuevoBaneo, bloqueadoHasta, usuario.id]);

        return res.status(403).json({
          message: `Intentelo de nuevo mas tarde.`,
          bloqueado: true,
        });
      }

      return res.status(401).json({ message: "Credenciales inválidas" });
    } else {
      // Si la contraseña es correcta, obtener los libros guardados por el usuario
      const queryBooks = `
        SELECT books.* 
        FROM books
        INNER JOIN user_savedbooks ON books.id = user_savedbooks.book_id
        WHERE user_savedbooks.user_id = ?
      `;
      const [booksSaved] = await db.query(queryBooks, [usuario.id]);

      // Actualizamos la fecha de la última conexión
      const updateUltimaConexion = `
  UPDATE users 
  SET ultima_conexion = NOW() 
  WHERE id = ?
`;
      await db.query(updateUltimaConexion, [usuario.id]);

      // Responder con la información del usuario y los libros guardados
      res.status(200).json({
        Id: usuario.id,
        Avatar: usuario.avatar_url,
        Usuario: usuario.usuario,
        Nombre: usuario.nombre,
        Apellidos: usuario.apellidos,
        Correo: usuario.email,
        Fecha_de_creacion: usuario.fecha_creacion,
        LibrosGuardados: booksSaved,
      });

      const queryResetFailedAttempt = `
        UPDATE users 
        SET 
          intentos_fallidos = 0,
          bloqueado_hasta = NULL
        WHERE id = ?
      `;

      await db.query(queryResetFailedAttempt, [usuario.id]);
    }
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Endpoint POST para enviar el correo de recuperación de contraseña
exports.reset = async (req, res) => {
  const { email } = req.body;

  const token = crypto.randomBytes(32).toString("hex");
  const tokenExpiration = Date.now() + 30 * 60 * 1000; // 30 minutos

  try {
    // Guardar el token y su expiración en la base de datos
    const query = `
      UPDATE users 
      SET resetToken = ?, resetTokenExpiration = ? 
      WHERE email = ?
    `;
    const [result] = await db.query(query, [token, tokenExpiration, email]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Correo no encontrado." });
    }

    // Configurar y enviar el correo
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Recuperación de contraseña",
      text: `Para restablecer tu contraseña, haz clic en el siguiente enlace: https://n3xus-project.vercel.app/reset-password/${token} el enlace expirará en 30 minutos.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Correo enviado correctamente." });
  } catch (error) {
    console.error("Error en el proceso de recuperación:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// Endpoint GET para verificar validez del token
exports.verifyResetToken = async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ message: "Token requerido" });
  }

  try {
    const query = `
      SELECT resetTokenExpiration 
      FROM users 
      WHERE resetToken = ?
    `;
    const [results] = await db.query(query, [token]);

    if (
      !results.length ||
      !results[0].resetTokenExpiration ||
      results[0].resetTokenExpiration < Date.now()
    ) {
      return res.status(401).json({ message: "Token expirado" });
    } else if(token && token.length !== 64){
      return res.status(401).json({ message: "Token inválido" });
    }

    return res.status(200).json({ message: "Token válido" });
  } catch (error) {
    console.error("Error al verificar el token:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Endpoint POST para cambiar la contraseña
exports.resetPassword = async (req, res) => {
  const { token, contraseña } = req.body;

  if (!token || !contraseña) {
    return res
      .status(400)
      .json({ message: "Se requieren el token y la nueva contraseña" });
  }

  try {
    // Buscar el token en la base de datos
    const query =
      "SELECT email, resetTokenExpiration FROM users WHERE resetToken = ?";
    const [results] = await db.query(query, [token]);

    const { email } = results[0];

    // Hashear la nueva contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contraseña, saltRounds);

    // Actualizar contraseña y limpiar token
    const updateQuery = `
      UPDATE users 
      SET contraseña = ?, resetToken = NULL, resetTokenExpiration = NULL 
      WHERE email = ?
    `;
    await db.query(updateQuery, [hashedPassword, email]);

    res.status(200).send("Contraseña actualizada correctamente");
  } catch (error) {
    console.error("Error al restablecer la contraseña:", error);
    res.status(500).send("Error interno del servidor");
  }
};

exports.editAvatar = async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: "Falta el user_id." });
  }

  try {
    let avatarUrl;

    if (req.file) {
      avatarUrl = req.file.path; // Cloudinary ya lo sube y devuelve la URL
    } else {
      const [rows] = await db.query("SELECT avatar_url FROM users WHERE id = ?", [user_id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "Usuario no encontrado." });
      }
      avatarUrl = rows[0].avatar; // Mantener el actual
    }

    const query = `UPDATE users SET avatar_url = ? WHERE id = ?`;
    const [result] = await db.query(query, [avatarUrl, user_id]);

    if (result.affectedRows === 0) {
      return res.status(403).json({ message: "No se pudo actualizar el avatar." });
    }

    res.status(200).json({
      message: "Avatar actualizado correctamente.!",
      avatar: avatarUrl,
    });
  } catch (error) {
    console.error("Error al actualizar el avatar:", error);
    res.status(500).json({ message: "Error al actualizar el avatar." });
  }
};


// Endpoint para editar un nombre de usuario
exports.editUsername = async (req, res) => {
  const { user_id, username } = req.body;
  try {
    // Verificar si el nombre de usuario ya existe para otro usuario
    const checkQuery = "SELECT id FROM users WHERE usuario = ? AND id != ?";
    const [existingUser] = await db.query(checkQuery, [username, user_id]);

    if (existingUser.length > 0) {
      return res.status(400).send("Ese nombre de usuario ya está en uso");
    }

    const query = "UPDATE users SET usuario = ? WHERE id = ?";
    const [results] = await db.query(query, [username, user_id]);

    if (results.affectedRows === 0) {
      return res.status(404).send("Usuario no encontrado");
    }
    res.status(200).send({
      res: "Nombre de usuario modificado correctamente",
      Usuario: username,
    });
  } catch (error) {
    console.error("Error al modificar nombre de usuario:", error);
    res.status(500).send("Error interno del servidor");
  }
};

// Endpoint para editar el nombre
exports.editName = async (req, res) => {
  const { user_id, name } = req.body;
  try {
    const query = "UPDATE users SET nombre = ? WHERE id = ?";
    const [results] = await db.query(query, [name, user_id]);

    if (results.affectedRows === 0) {
      return res.status(404).send("Usuario no encontrado");
    }
    res.status(200).send({
      res: "Nombre modificado correctamente",
      Nombre: name,
    });
  } catch (error) {
    console.error("Error al modificar nombre:", error);
    res.status(500).send("Error interno del servidor");
  }
};

// Endpoint para editar el apellido
exports.editSurname = async (req, res) => {
  const { user_id, surname } = req.body;
  try {
    const query = "UPDATE users SET apellidos = ? WHERE id = ?";
    const [results] = await db.query(query, [surname, user_id]);

    if (results.affectedRows === 0) {
      return res.status(404).send("Usuario no encontrado");
    }
    res.status(200).send({
      res: "Apellido modificado correctamente",
      Apellidos: surname,
    });
  } catch (error) {
    console.error("Error al modificar apellido:", error);
    res.status(500).send("Error interno del servidor");
  }
};

// Endpoint para editar un email
exports.editEmail = async (req, res) => {
  const { user_id, email } = req.body;
  try {
    // Verificar si el nombre de usuario ya existe para otro usuario
    const checkQuery = "SELECT id FROM users WHERE email = ? AND id != ?";
    const [existingUser] = await db.query(checkQuery, [email, user_id]);

    if (existingUser.length > 0) {
      return res.status(400).send("Ese correo electrónico ya está en uso");
    }

    const query = "UPDATE users SET email = ? WHERE id = ?";
    const [results] = await db.query(query, [email, user_id]);

    if (results.affectedRows === 0) {
      return res.status(404).send("Usuario no encontrado");
    }
    res.status(200).send({
      res: "Email modificado correctamente",
      Correo: email,
    });
  } catch (error) {
    console.error("Error al modificar Email:", error);
    res.status(500).send("Error interno del servidor");
  }
};

// Endpoint para eliminar la cuenta de usuario
exports.deleteAccount = async (req, res) => {
  const userId = req.body.userId;
  try {
    // Primero, desvincular los libros subidos por el usuario
    const query = "UPDATE books SET user_id = 1 WHERE user_id = ?";
    await db.query(query, [userId]);

    // Luego, eliminar al usuario
    const deleteQuery = "DELETE FROM users WHERE id = ?";
    const [results] = await db.query(deleteQuery, [userId]);

    // Este endpoint solo es accesible desde el perfil de un usuario autenticado
    // Por eso se asume que `userId` siempre es válido
    res.status(200).send("Cuenta eliminada con éxito");
  } catch (error) {
    console.error("Error al eliminar la cuenta:", error);
    res.status(500).send("Error interno del servidor");
  }
};

// Endpoint para obtener un usuario por su id
exports.getUserById = async (req, res) => {
  const userId = req.params.userId;
  try{
    const query = "SELECT * FROM users WHERE id = ?";
    const [rows] = await db.query(query, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    res.status(200).json({
      message: "Usuario obtenido correctamente.",
      user: rows[0]
    })
  } catch(error){
    console.error("Error al obtener el usuario:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};