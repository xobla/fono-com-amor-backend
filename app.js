const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

// Carregar variáveis de ambiente
dotenv.config();

// Importar rotas
const authRoutes = require("./src/routes/authRoutes");
const ticketRoutes = require("./src/routes/ticketRoutes");
// const userRoutes = require("./src/routes/userRoutes"); // Para CRUD de usuários por admin

const app = express();

// Middlewares
app.use(cors()); // Habilitar CORS para todas as origens (ajustar em produção)
app.use(express.json()); // Para parsear JSON no corpo das requisições

// Conexão com o MongoDB
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/fono_com_amor_db";

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // useCreateIndex: true, // Não é mais necessário no Mongoose 6+
  // useFindAndModify: false, // Não é mais necessário no Mongoose 6+
})
.then(() => console.log("MongoDB conectado com sucesso!"))
.catch(err => console.error("Erro ao conectar com MongoDB:", err));

// Rotas da API
app.get("/api", (req, res) => {
  res.send("API Fono com Amor está funcionando!");
});
app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
// app.use("/api/users", userRoutes); // Rotas para gerenciamento de usuários

// Middleware de tratamento de erros (exemplo básico)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: "Algo deu errado no servidor!", error: err.message });
});

const PORT = process.env.PORT || 5001; // Porta para o backend

app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
});

module.exports = app; // Para testes ou outras necessidades

