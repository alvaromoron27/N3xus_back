const db = require("../config/db");

// Endpoint para agregar un nuevo libro
exports.addBook = async (req, res) => {
  try {
    const {
      titulo,
      descripcion,
      autor,
      categoria,
      numero_paginas,
      publicacion_original,
      user_id,
    } = req.body;

    if (
      !titulo ||
      !descripcion ||
      !autor ||
      !categoria ||
      !numero_paginas ||
      !publicacion_original
    ) {
      return res.status(400).json({
        message: "Todos los campos obligatorios deben estar presentes.",
      });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No se recibió ninguna portada." });
    }

    // Aquí está la URL remota subida a Cloudinary gracias a multer
    const portadaUrl = req.file.path;

    const query = `
      INSERT INTO books 
      (titulo, descripcion, autor, categoria, numero_paginas, portada, publicacion_original, user_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      titulo,
      descripcion,
      autor,
      categoria,
      numero_paginas,
      portadaUrl,
      publicacion_original,
      user_id,
    ];

    const [result] = await db.query(query, values);

    res.status(201).json({ message: "Libro agregado exitosamente." });
  } catch (err) {
    console.error("Error al agregar el libro:", err);
    res
      .status(500)
      .json({ message: "Error interno del servidor al agregar el libro." });
  }
};

// Endpoint para editar un libro
exports.editBook = async (req, res) => {
  let {
    titulo,
    descripcion,
    autor,
    categoria,
    numero_paginas,
    publicacion_original,
    user_id,
  } = req.body;

  let { book_id } = req.params;

  // Conversión explícita de tipos numéricos
  book_id = Number(book_id);
  user_id = Number(user_id);
  numero_paginas = Number(numero_paginas);

  // Validación básica
  if (
    !titulo ||
    !descripcion ||
    !autor ||
    !categoria ||
    isNaN(numero_paginas) ||
    !publicacion_original ||
    isNaN(user_id) ||
    isNaN(book_id)
  ) {
    return res.status(400).json({
      message: "Todos los campos obligatorios deben estar presentes.",
    });
  }

  try {
    // Si no se ha subido una nueva portada, obtenemos la actual de la DB
    let portadaUrl;
    if (req.file) {
      portadaUrl = req.file.path; // Imagen nueva subida a Cloudinary
    } else {
      const [rows] = await db.query("SELECT portada FROM books WHERE id = ?", [
        book_id,
      ]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "Libro no encontrado." });
      }
      portadaUrl = rows[0].portada; // Mantenemos la existente
    }

    const created_at = new Date();

    const query = `
  UPDATE books SET
    titulo = ?,
    descripcion = ?,
    autor = ?,
    categoria = ?,
    numero_paginas = ?,
    portada = ?,
    publicacion_original = ?,
    created_at = ?
  WHERE id = ? AND user_id = ?
`;

    const values = [
      titulo,
      descripcion,
      autor,
      categoria,
      numero_paginas,
      portadaUrl,
      publicacion_original,
      created_at,
      book_id,
      user_id,
    ];

    const [result] = await db.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(403).json({
        message: "No tienes permiso para editar este libro o no existe.",
      });
    }

    res.status(200).json({
      message: "Libro editado correctamente!",
      updatedBook: {
        id: book_id,
        titulo,
        descripcion,
        autor,
        categoria,
        numero_paginas,
        portada: portadaUrl,
        publicacion_original,
        created_at,
        user_id,
      },
    });
  } catch (err) {
    console.error("Error al editar el libro:", err);
    res
      .status(500)
      .json({ message: "Error interno del servidor al editar el libro." });
  }
};

// Endpoint para obtener todos los libros
exports.getAllBooks = async (req, res) => {
  const query = "SELECT * FROM books";

  try {
    const [results] = await db.query(query);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error al obtener todos los libros:", error);
    res.status(500).json({ error: "Error al obtener todos los libros" });
  }
};

// Endpoint para obtener los books nuevos
exports.getNewBooks = async (req, res) => {
  try {
    // Obtener la fecha de hace 24 horas
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    //Query para obtener los books nuevos
    const query = "SELECT * FROM books WHERE created_at >= ?";
    //Ejecutar la consulta
    const [results] = await db.query(query, [twentyFourHoursAgo]);
    //Enviar la respuesta con los resultados
    res.status(200).json(results);
  } catch {
    console.error("Error al obtener los libros nuevos:", err);
    res.status(500).json({ error: "Error al obtener los libros nuevos" });
  }
};

// Endpoint para buscar libros por categoría
exports.getBooksByCategory = async (req, res) => {
  const { categoria } = req.query;

  if (!categoria) {
    return res.status(400).json({ error: "La categoría es requerida" });
  }

  try {
    const query = "SELECT * FROM books WHERE categoria = ?";
    const [results] = await db.query(query, [categoria]);

    res.status(200).json(results);
  } catch (error) {
    console.error("Error al buscar libros por categoría:", error);
    res.status(500).json({ error: "Error al buscar libros por categoría" });
  }
};

// Endpoint para guardar un libro
exports.saveBook = async (req, res) => {
  const { user_id, book_id } = req.body;

  if (!user_id || !book_id) {
    return res
      .status(400)
      .json({ success: false, message: "Faltan datos requeridos" });
  }

  try {
    const sqlCheck =
      "SELECT * FROM user_savedbooks WHERE user_id = ? AND book_id = ?";
    const [existing] = await db.query(sqlCheck, [user_id, book_id]);

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "Libro ya guardado." });
    }

    const sqlInsert =
      "INSERT INTO user_savedbooks (user_id, book_id) VALUES (?, ?)";
    await db.query(sqlInsert, [user_id, book_id]);

    res
      .status(200)
      .json({ success: true, message: "Libro guardado exitosamente." });
  } catch (error) {
    console.error("Error al guardar el libro:", error);
    res
      .status(500)
      .json({ success: false, message: "Error interno del servidor" });
  }
};

// Endpoint para obtener los libros guardados por un usuario
exports.getSavedBooks = async (req, res) => {
  const { user_id } = req.params;

  // Validación básica
  if (!user_id) {
    return res
      .status(400)
      .json({ success: false, message: "El user_id es requerido." });
  }

  try {
    const sqlQuery = `
      SELECT books.*
      FROM books
      INNER JOIN user_books ON books.id = user_books.book_id
      WHERE user_books.user_id = ?
    `;

    const [results] = await db.query(sqlQuery, [user_id]);

    res.status(200).json({ success: true, books: results });
  } catch (err) {
    console.error("Error al obtener los libros guardados:", err);
    res.status(500).json({
      success: false,
      message: "Error al obtener los libros guardados.",
    });
  }
};

// Endpoint para eliminar un libro guardado por un usuario
exports.deleteSavedBook = async (req, res) => {
  const { user_id, book_id } = req.body;

  // Validación básica
  if (!user_id || !book_id) {
    return res
      .status(400)
      .json({ success: false, message: "user_id y book_id son requeridos." });
  }

  try {
    const sqlQuery = `
      DELETE FROM user_savedbooks 
      WHERE user_id = ? AND book_id = ?
    `;

    const [result] = await db.query(sqlQuery, [user_id, book_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Libro no encontrado o ya fue eliminado.",
      });
    }

    res
      .status(200)
      .json({ success: true, message: "Libro eliminado exitosamente." });
  } catch (err) {
    console.error("Error al eliminar el libro guardado:", err);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor.",
    });
  }
};

// Endpoint para obtener libros subidos por un usuario
exports.getBooksByUser = async (req, res) => {
  const { user_id } = req.params;

  // Validación
  if (!user_id) {
    return res.status(400).json({
      success: false,
      message: "El campo 'user_id' es obligatorio.",
    });
  }

  try {
    const query = `SELECT * FROM books WHERE user_id = ?`;
    const [results] = await db.query(query, [user_id]);

    res.status(200).json({
      success: true,
      message: "Libros obtenidos exitosamente.",
      books: results,
    });
  } catch (err) {
    console.error("Error al obtener los libros del usuario:", err);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor al obtener los libros.",
    });
  }
};

// Endpoint para eliminar un book
exports.deleteBook = async (req, res) => {
  const { book_id } = req.params;
  const { user_id } = req.body; // user_id viene en body

  // Validación básica
  if (!book_id || !user_id) {
    return res.status(400).json({
      success: false,
      message:
        "Se requieren el ID del libro y el ID del usuario para eliminarlo.",
    });
  }

  try {
    // Verificar que el libro pertenezca al usuario
    const query = "SELECT * FROM books WHERE id = ? AND user_id = ?";
    const [result] = await db.query(query, [book_id, user_id]);

    if (result.length === 0) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para eliminar este libro.",
      });
    }

    // Si es dueño, eliminar el libro
    const queryDelete = "DELETE FROM books WHERE id = ?";
    const [resultDelete] = await db.query(queryDelete, [book_id]);

    if (resultDelete.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Libro no encontrado.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Libro eliminado exitosamente.",
    });
  } catch (err) {
    console.error("Error al eliminar el libro:", err);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor al eliminar el libro.",
    });
  }
};

exports.addComment = async (req, res) => {
  const { content, userId, bookId } = req.body;

  if (!content || !userId || !bookId) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }

  try {
    // 1. Insertar comentario
    const insertQuery = `
      INSERT INTO book_comments (book_id, user_id, content, created_at)
      VALUES (?, ?, ?, NOW())
    `;
    const [insertResult] = await db.execute(insertQuery, [
      bookId,
      userId,
      content,
    ]);

    const insertedId = insertResult.insertId;

    // 2. Consultar el comentario insertado
    const selectQuery = `
      SELECT id, book_id, user_id, content, created_at
      FROM book_comments
      WHERE id = ?
    `;
    const [rows] = await db.execute(selectQuery, [insertedId]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Comentario no encontrado después de insertar." });
    }

    // 3. Devolver el comentario completo
    return res.status(201).json({
      message: "Comentario guardado correctamente.",
      comment: rows[0],
    });
  } catch (error) {
    console.error("Error al guardar comentario:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

exports.getComments = async (req, res) => {
  const { bookId } = req.params;
  const limit = parseInt(req.query.limit, 10) || 5;
  const offset = parseInt(req.query.offset, 10) || 0;

  if (!bookId) {
    return res.status(400).json({ error: "Falta el ID del libro." });
  }

  try {
    // VALIDACIÓN adicional para evitar inyecciones
    if (!Number.isInteger(limit) || !Number.isInteger(offset)) {
      return res.status(400).json({ error: "Parámetros inválidos." });
    }

    const query = `
      SELECT id, book_id, user_id, content, created_at
      FROM book_comments
      WHERE book_id = ?
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await db.execute(query, [bookId]);

    const countQuery = `SELECT COUNT(*) AS total FROM book_comments WHERE book_id = ?`;
    const [[{ total }]] = await db.execute(countQuery, [bookId]);

    const hasMore = offset + limit < total;

    res.status(200).json({ comments: rows, hasMore });
  } catch (error) {
    console.error("Error al obtener comentarios:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

exports.addReply = async (req, res) => {
  const { content, userId, commentId } = req.body;

  if (!content || !userId || !commentId) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }

  try {
    // 1. Insertar respuesta
    const insertQuery = `
      INSERT INTO book_comment_replies (comment_id, user_id, content, created_at)
      VALUES (?, ?, ?, NOW())
    `;
    const [insertResult] = await db.execute(insertQuery, [
      commentId,
      userId,
      content,
    ]);

    const insertedId = insertResult.insertId;

    // 2. Consultar la respuesta insertada
    const selectQuery = `
      SELECT id, comment_id, user_id, content, created_at
      FROM book_comment_replies
      WHERE id = ?
    `;
    const [rows] = await db.execute(selectQuery, [insertedId]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Respuesta no encontrada después de insertar." });
    }

    // 3. Devolver la respuesta completa
    return res.status(201).json({
      message: "Respuesta guardada correctamente.",
      reply: rows[0],
    });
  } catch (error) {
    console.error("Error al guardar la respuesta:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

exports.getReplies = async (req, res) => {
  const commentId = parseInt(req.query.commentId, 10);
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 5); // máximo 100
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

  // Validaciones básicas
  if (!commentId || isNaN(commentId)) {
    return res.status(400).json({ error: "Falta un commentId válido en la query." });
  }

  try {
    const query = `
      SELECT id, comment_id, user_id, content, created_at
      FROM book_comment_replies
      WHERE comment_id = ?
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await db.execute(query, [commentId]);

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM book_comment_replies
      WHERE comment_id = ?
    `;
    const [[{ total }]] = await db.execute(countQuery, [commentId]);

    const hasMore = offset + limit < total;

    return res.status(200).json({
      replies: rows,
      total,
      hasMore,
    });
  } catch (error) {
    console.error("Error al obtener las respuestas:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

