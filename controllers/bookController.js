const db = require("../config/db");

// Endpoint para agregar un nuevo book
exports.addBook = (req, res) => {
  const {
    titulo,
    descripcion,
    autor,
    categoria,
    numero_paginas,
    portada,
    publicacion_original,
    user_id
  } = req.body;

  // Validación básica
  if (
    !titulo ||
    !descripcion ||
    !autor ||
    !categoria ||
    !numero_paginas ||
    !portada ||
    !publicacion_original ||
    !user_id
  ) {
    return res.status(400).json({
      message: "Todos los campos obligatorios deben estar presentes.",
    });
  }

  // Inserta el nuevo book en la base de datos
  const query = `INSERT INTO books (titulo, descripcion, autor, categoria, numero_paginas, portada, publicacion_original, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const values = [
    titulo,
    descripcion,
    autor,
    categoria,
    numero_paginas,
    portada,
    publicacion_original,
    user_id
  ];

  db.query(query, values, (err, results) => {
    if (err) {
      console.error("Error al agregar el libro:", err);
      return res.status(500).json({ message: "Error al agregar el libro." });
    }
    res.status(201).json({ message: "Libro agregado exitosamente." });
  });
};


// Endpoint para obtener todos los books
exports.getAllBooks = (req, res) => {
  //Query para obtener todos los books
  const query = "SELECT * FROM books";

  //Ejecutar la consulta
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error al obtener todos los books:", err);
      res.status(500).json({ error: "Error al obtener todos los books" });
      return;
    }
    //Enviar la respuesta con los resultados
    res.json(results);
  });
};

// Endpoint para obtener los books nuevos
exports.getNewBooks = (req, res) => {
  // Obtener la fecha de hace 24 horas
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  //Query para obtener los books nuevos
  const query = "SELECT * FROM books WHERE created_at >= ?";

  //Ejecutar la consulta
  db.query(query, [twentyFourHoursAgo], (err, results) => {
    if (err) {
      console.error("Error al obtener los últimos libros:", err);
      res.status(500).json({ error: "Error al obtener los últimos libros" });
      return;
    }

    //Enviar la respuesta con los resultados
    res.json(results);
  });
};

// Endpoint para buscar books por categoría
exports.getBooksByCategory = (req, res) => {
  // Obtiene la categoría de los parámetros de la consulta
  const { categoria } = req.query;

  if (!categoria) {
    return res.status(400).json({ error: "La categoría es requerida" });
  }

  // Consulta SQL para buscar books por categoría
  const query = "SELECT * FROM books WHERE categoria = ?";

  // Ejecuta la consulta
  db.query(query, [categoria], (err, results) => {
    if (err) {
      console.error("Error al buscar books por categoría:", err);
      return res.status(500).json({ error: "Error al buscar books" });
    }

    // Envía los resultados como respuesta
    res.json(results);
  });
};

//Endpoint para guardar un book
exports.saveBook = (req, res) => {
  const { user_id, book_id } = req.body;

  // Verificar si la relación ya existe
  const sqlCheck =
    "SELECT * FROM user_savedbooks WHERE user_id = ? AND book_id = ?";
  db.query(sqlCheck, [user_id, book_id], (err, results) => {
    if (err) {
      console.error("Error al verificar si el book ya está guardado:", err);
      return res
        .status(500)
        .json({ success: false, message: "Error al verificar el book" });
    }

    if (results.length > 0) {
      // La relación ya existe
      return res
        .status(400)
        .json({ success: false, message: "Libro ya guardado." });
    } else {
      // Insertar la relación en la tabla intermedia
      const sqlInsert =
        "INSERT INTO user_savedbooks (user_id, book_id) VALUES (?, ?)";
      db.query(sqlInsert, [user_id, book_id], (err, result) => {
        if (err) {
          console.error("Error al guardar el book:", err);
          return res
            .status(500)
            .json({ success: false, message: "Error al guardar el book" });
        }

        res
          .status(200)
          .json({ success: true, message: "Book guardado exitosamente." });
      });
    }
  });
};

//Endpoint para obtener los books guardados por un usuario
exports.getSavedBooks = (req, res) => {
  const { user_id } = req.params;

  // Verificar si el user_id está presente
  if (!user_id) {
    return res.status(400).json({ success: false, message: "user_id es requerido." });
  }

  // Consulta para obtener los books guardados por el usuario
  const sqlQuery = `
    SELECT books.*
    FROM books
    INNER JOIN user_books ON books.id = user_books.book_id
    WHERE user_books.user_id = ?
  `;

  db.query(sqlQuery, [user_id], (err, results) => {
    if (err) {
      console.error("Error al obtener los books guardados:", err);
      return res.status(500).json({ success: false, message: "Error al obtener los books guardados." });
    }

    res.status(200).json({ success: true, books: results });
  });
};

// Endpoint para eliminar un book guardado por un usuario
exports.deleteSavedBook = (req, res) => {
  const { user_id, book_id } = req.body;

  // Verificar si user_id y book_id están presentes
  if (!user_id || !book_id) {
    return res.status(400).json({ success: false, message: "user_id y book_id son requeridos." });
  }

  // Consulta para eliminar el book guardado del usuario
  const sqlQuery = `
    DELETE FROM user_savedbooks 
    WHERE user_id = ? AND book_id = ?
  `;

  db.query(sqlQuery, [user_id, book_id], (err, result) => {
    if (err) {
      console.error("Error al eliminar el book guardado:", err);
      return res.status(500).json({ success: false, message: "Error al eliminar el book guardado." });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Libro no encontrado o ya fue eliminado." });
    }

    res.status(200).json({ success: true, message: "Libro eliminado exitosamente." });
  });
};

// Endpoint para obtener libros subidos por un usuario
exports.getBooksByUser = (req, res) => {
  const { user_id } = req.params;

  // Validación básica
  if (!user_id) {
    return res.status(400).json({
      message: "El campo 'user_id' es obligatorio.",
    });
  }

  // Consulta para obtener los libros del usuario
  const query = `SELECT * FROM books WHERE user_id = ?`;
  
  db.query(query, [user_id], (err, results) => {
    if (err) {
      console.error("Error al obtener los libros:", err);
      return res.status(500).json({ message: "Error al obtener los libros." });
    }

    res.status(200).json({
      message: "Libros obtenidos exitosamente.",
      books: results
    });
  });
};

// Endpoint para eliminar un book
exports.deleteBook = (req, res) => {
  const { book_id } = req.params;

  // Validación básica
  if (!book_id) {
    return res.status(400).json({
      message: "Se requiere el ID del libro para eliminarlo.",
    });
  }

  // Consulta para eliminar el libro de la base de datos
  const query = `DELETE FROM books WHERE id = ?`;
  
  db.query(query, [book_id], (err, results) => {
    if (err) {
      console.error("Error al eliminar el libro:", err);
      return res.status(500).json({ message: "Error al eliminar el libro." });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Libro no encontrado." });
    }

    res.status(200).json({ message: "Libro eliminado exitosamente." });
  });
};
