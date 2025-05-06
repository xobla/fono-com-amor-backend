const express = require("express");
const {
  createTicket,
  getAllTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  addCommentToTicket,
} = require("../controllers/ticketController");
const { protect, authorize } = require("../middlewares/authMiddleware");

const router = express.Router();

// Rotas para Chamados
// Todos os usuários logados podem criar chamados e ver seus próprios chamados (lógica de filtro no controller)
// Gestores e Administradores podem ver todos os chamados
// Operadores podem ver chamados atribuídos a eles ou que eles criaram

router
  .route("/")
  .post(protect, createTicket) // Qualquer usuário logado pode criar
  .get(protect, getAllTickets); // Regras de visualização mais complexas no controller ou service

router
  .route("/:id")
  .get(protect, getTicketById) // Regras de visualização no controller
  .put(protect, updateTicket) // Regras de quem pode atualizar (ex: responsável, admin, gestor)
  .delete(protect, authorize("Administrador", "Gestor"), deleteTicket); // Somente Admin/Gestor podem "deletar" (marcar como abandonado)

router.post("/:id/comment", protect, addCommentToTicket); // Qualquer usuário logado envolvido no chamado pode comentar

// TODO: Adicionar rotas para upload de anexos
// TODO: Adicionar rotas específicas para relatórios e dashboard se necessário

module.exports = router;
