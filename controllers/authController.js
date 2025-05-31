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

  if (!usuario, !nombre || !apellidos || !correo || !contraseña) {
    return res.status(400).json({ message: "Todos los campos son requeridos" });
  }

  try {
    // Genera un hash de la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contraseña, saltRounds);

    // Inserta el nuevo usuario en la base de datos
    const query =
      "INSERT INTO users (nombre, apellidos, email, contraseña, usuario) VALUES (?, ?, ?, ?, ?)";
    db.query(
      query,
      [nombre, apellidos, correo, hashedPassword, usuario],
      async (err, results) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            // Detecta si el error viene del campo "email" o "usuario"
            if (err.sqlMessage.includes("email")) {
              return res
                .status(409)
                .json({ message: "El correo electrónico ya está registrado." });
            }
            if (err.sqlMessage.includes("usuario")) {
              return res
                .status(409)
                .json({ message: "El nombre de usuario ya está registrado." });
            }
          }
          console.error(
            "Error insertando el usuario en la base de datos:",
            err
          );
          return res.status(500).send("Error interno del servidor");
        }

        // Generar un token de confirmación
        const token = jwt.sign({ correo }, process.env.JWT_SECRET_CONFIRM, {
          expiresIn: "1h",
        });

        // Enviar correo de confirmación
        const mailOptions = {
          from: process.env.EMAIL,
          to: correo,
          subject: "🔐Confirma tu cuenta🔐",
          text: `Hola ${nombre},\n\nGracias por registrarte. Por favor, confirma tu cuenta haciendo clic en el siguiente enlace:\n\nhttp://localhost:3000/confirm-account/${token}`,
        };

        try {
          await transporter.sendMail(mailOptions);
          res
            .status(201)
            .send(
              "Usuario registrado con éxito. Por favor, verifica tu correo."
            );
        } catch (emailError) {
          console.error("Error enviando el correo:", emailError);
          res
            .status(500)
            .send(
              "Error interno del servidor al enviar el correo de confirmación."
            );
        }
      }
    );
  } catch (error) {
    console.error("Error hasheando la contraseña:", error);
    res.status(500).send("Error interno del servidor");
  }
};


// Endpoint para reenviar el correo de confirmación
exports.resendConfirmation = async (req, res) => {
    const { correo } = req.body;
  
    if (!correo) {
      return res.status(400).json({ message: "El correo es obligatorio" });
    }
  
    try {
      // Consulta para obtener el usuario por correo electrónico
      const query = "SELECT * FROM users WHERE email = ?";
      db.query(query, [correo], async (err, results) => {
        if (err) {
          console.error("Error buscando usuario:", err);
          return res.status(500).json({ message: "Error interno del servidor" });
        }
  
        if (results.length === 0) {
          return res.status(404).json({ message: "Usuario no encontrado" });
        }
  
        const usuario = results[0];
  
        // Verificar si la cuenta ya está confirmada
        if (usuario.confirmado === 1) {
          return res
            .status(400)
            .json({ message: "La cuenta ya está confirmada." });
        }
  
        // Generar un nuevo token de confirmación
        const token = jwt.sign({ correo }, process.env.JWT_SECRET_CONFIRM, {
          expiresIn: "1h",
        });
  
        // Configuración del correo
        const mailOptions = {
          from: process.env.EMAIL,
          to: correo,
          subject: "🔐Confirma tu cuenta - Reenvío🔐",
          text: `Hola ${usuario.nombre},\n\nReenvío de confirmación. Por favor, confirma tu cuenta haciendo clic en el siguiente enlace:\n\nhttp://localhost:3000/confirm-account/${token}`,
        };
  
        // Enviar el correo de confirmación
        try {
          await transporter.sendMail(mailOptions);
          res.status(200).json({
            message:
              "Correo de confirmación reenviado. Por favor, verifica tu bandeja de entrada.",
          });
        } catch (emailError) {
          console.error("Error enviando el correo:", emailError);
          res.status(500).json({
            message:
              "Error interno del servidor al enviar el correo de confirmación.",
          });
        }
      });
    } catch (error) {
      console.error("Error procesando la solicitud:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };

  // Endpoint para confirmar la cuenta
exports.confirmAccount = (req, res) => {
  const { token } = req.body;

  try {
    const { correo } = jwt.verify(token, process.env.JWT_SECRET_CONFIRM);

    const query = "UPDATE users SET confirmado = 1 WHERE email = ?";
    db.query(query, [correo], (err, results) => {
      if (err) {
        console.error(
          "Error actualizando el usuario en la base de datos:",
          err
        );
        return res.status(500).send("Error interno del servidor");
      }

      res.status(200).json({ message: "Cuenta confirmada correctamente, ya puedes cerrar esta pestaña e iniciar sesión." });
    });
  } catch (error) {
    console.error("Error verificando el token:", error);
    res.status(400).send("Enlace de confirmación inválido o expirado.");
  }
};

// Endpoint para iniciar sesión
exports.login = async (req, res) => {

    return res
      .status(400)
      .json({ message: "Identificador y contraseña son requeridos" });
  }

  try {
    const query = "SELECT * FROM users WHERE email = ? OR usuario = ?";
      if (err) {
        console.error("Error al buscar usuario:", err);
        return res.status(500).json({ message: "Error interno del servidor" });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const usuario = results[0];
      // Verificar si la cuenta está confirmada
      if (usuario.confirmado !== 1) {
        return res.status(403).json({
          message:
            "La cuenta no ha sido confirmada. Por favor, verifica tu correo electrónico o nombre de usuario.",
          unconfirmed: true,
        });
      }
      // Verificar la contraseña
      const match = await bcrypt.compare(contraseña, usuario.contraseña);
      if (!match) {
        return res.status(401).json({ message: "Credenciales inválidas" });
      }

      // Si la contraseña es correcta, obtener los libros guardados por el usuario
      const queryBooks = `
        SELECT books.* 
        FROM books
        INNER JOIN user_savedbooks ON books.id = user_savedbooks.book_id
        WHERE user_savedbooks.user_id = ?
      `;
      db.query(queryBooks, [usuario.id], (err, booksSaved) => {
        if (err) {
          console.error("Error al obtener los libros guardados:", err);
          return res
            .status(500)
            .json({ message: "Error al obtener los libros guardados." });
        }

        // Responder con la información del usuario y los libros guardados
        res.status(200).json({
          Id: usuario.id,
          Usuario: usuario.usuario,
          Nombre: usuario.nombre,
          Apellidos: usuario.apellidos,
          Correo: usuario.email,
          Fecha_de_creacion: usuario.fecha_creacion,
          LibrosGuardados: booksSaved
        });
      });
    });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Ruta POST para enviar el correo de recuperación de contraseña
exports.reset = async (req, res) => {
  const { email } = req.body;

  const token = crypto.randomBytes(32).toString("hex");
  const tokenExpiration = Date.now() + 1800000; // 30 minutos

  // Guardar el token y su fecha de expiración en la base de datos
  const query =
    "UPDATE users SET resetToken = ?, resetTokenExpiration = ? WHERE email = ?";
  db.query(query, [token, tokenExpiration, email], (err, results) => {
    if (err) {
      console.error("Error guardando el token en la base de datos:", err);
      return res.status(500).json({ message: "Error interno del servidor" });
    }

    // Configurar el correo electrónico
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Recuperación de contraseña",
      text: `Para restablecer tu contraseña, haz clic en el siguiente enlace: http://localhost:3000/reset-password/${token}`,
    };

    transporter
      .sendMail(mailOptions)
      .then(() => {
        res.status(200).json({ message: "Correo enviado correctamente." });
      })
      .catch((error) => {
        console.error("Error al enviar el correo:", error);
        res.status(500).json({ message: "Error al enviar el correo." });
      });
  });
};

// Endpoint POST para cambiar la contraseña
exports.resetPassword = async (req, res) => {
  const { token, contraseña } = req.body;

  if (!token || !contraseña) {
    return res
      .status(400)
      .json({ message: "Se requieren el token y la nueva contraseña" });
  }

  // Buscar el token en la base de datos
  const query =
    "SELECT email, resetToken, resetTokenExpiration FROM users WHERE resetToken = ?";
  db.query(query, [token], async (err, results) => {
    if (err) {
      console.error("Error verificando el token:", err);
      return res.status(500).send("Error interno del servidor");
    }

    if (!results.length || results[0].resetTokenExpiration < Date.now()) {
      return res.status(401).json({ message: "Token inválido o expirado" });
    }

    const { email } = results[0];

    // Generar un hash de la nueva contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contraseña, saltRounds);

    // Actualizar la contraseña en la base de datos y eliminar el token
    const updateQuery =
      "UPDATE users SET contraseña = ?, resetToken = NULL, resetTokenExpiration = NULL WHERE email = ?";
    db.query(updateQuery, [hashedPassword, email], (err, results) => {
      if (err) {
        console.error(
          "Error actualizando la contraseña en la base de datos:",
          err
        );
        return res.status(500).send("Error interno del servidor");
      }

      res.status(200).send("Contraseña actualizada exitosamente");
    });
  });
};

// Endpoint para eliminar la cuenta de usuario
exports.deleteAccount = async (req, res) => {
  const userId = req.body.userId;
  try {
    const query = "DELETE FROM users WHERE id = ?";
    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error("Error eliminando el usuario de la base de datos:", err);
        return res.status(500).send("Error interno del servidor");
      }
      res.status(200).send("Cuenta eliminada con éxito");
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Error interno del servidor");
  }
};