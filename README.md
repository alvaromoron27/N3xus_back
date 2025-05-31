# N3xus Backend

Backend de **N3xus**, una plataforma pensada para conocer ebooks donde son los usuarios los que suben los libros electrónicos y alimentan el ecosistema.

No es una plataforma para leer los ebooks completos, sino para descubrir y explorar títulos.

---

## 🧩 Tecnologías

- Node.js  
- Express  
- MySQL  
- Bcrypt  
- Otros paquetes para autenticación, validación y manejo de archivos

---

## 🚀 Funcionalidades principales

- Registro y login de usuarios  
- Subida de ebooks (metadatos y sinopsis)  
- Consulta y búsqueda de libros  
- Gestión de usuarios y libros guardados  
- Confirmación de cuenta vía email  
- Seguridad con hashing de contraseñas

---

## 📦 Instalación

1. Clona el repositorio

   ```bash
   git clone https://github.com/tuusuario/n3xus_back.git
   cd n3xus_back
   ```

2. Instala dependencias

   ```bash
   npm install
   ```

3. Configura variables de entorno

   Crea un archivo `.env` con:

   ```env
   DB_HOST=localhost
   DB_USER=tu_usuario
   DB_PASSWORD=tu_contraseña
   DB_NAME=n3xus_db
   JWT_SECRET=tu_secreto_jwt
   EMAIL_USER=tu_email
   EMAIL_PASS=tu_password_email
   ```

4. Levanta el servidor

   ```bash
   npm start
   ```

---

## 🛠 Uso

Prueba los endpoints con Postman o intégralo con el frontend.

---

## 📄 Estructura básica

```
/controllers  
/models       
/routes       
/middleware   
/utils        
/app.js       
```

---

## 🤝 Contribuciones

Abierto a contribuciones, abre un issue o PR.

---

## ⚠️ Aviso legal

N3xus no aloja ni distribuye ebooks completos, solo info y sinopsis.

---

**N3xus** – La manera inteligente de descubrir ebooks.
