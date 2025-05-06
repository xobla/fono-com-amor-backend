const Ticket = require("../models/TicketModel");
const User = require("../models/UserModel");
const Counter = require("../models/CounterModel"); // Precisaremos criar este modelo para IDs sequenciais

// Função auxiliar para obter o próximo ID sequencial
async function getNextSequenceValue(sequenceName) {
  const sequenceDocument = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true } // new: true retorna o documento modificado, upsert: true cria se não existir
  );
  return sequenceDocument.sequence_value;
}

// Criar novo chamado
exports.createTicket = async (req, res) => {
  const {
    solicitanteId, // ID do usuário solicitante (geralmente o usuário logado)
    responsavelId, // Opcional, pode ser atribuído depois ou automaticamente
    prioridade,
    modulo,
    descricao,
    tags,
    // status e sistemaAtivo terão valores padrão definidos no schema
  } = req.body;

  try {
    const solicitante = await User.findById(solicitanteId);
    if (!solicitante) {
      return res.status(404).json({ message: "Solicitante não encontrado." });
    }

    const sequentialId = await getNextSequenceValue("ticketId");

    // Lógica de cálculo do SLA (simplificado aqui, pode ser mais complexo)
    let slaDueDate;
    const now = new Date();
    if (prioridade === "Alta") {
      slaDueDate = new Date(now.setDate(now.getDate() + 1)); // Ex: 1 dia para prioridade alta
    } else if (prioridade === "Média") {
      slaDueDate = new Date(now.setDate(now.getDate() + 3)); // Ex: 3 dias para prioridade média
    } else { // Baixa
      slaDueDate = new Date(now.setDate(now.getDate() + 7)); // Ex: 7 dias para prioridade baixa
    }

    const ticket = new Ticket({
      sequentialId,
      solicitante: solicitanteId,
      responsavel: responsavelId || null,
      prioridade,
      slaDueDate,
      modulo,
      descricao,
      tags: tags || [],
      // O histórico inicial é adicionado pelo middleware pre-save do TicketModel
    });

    // Adiciona o usuário que criou ao histórico, se não for o solicitante (ex: admin criando por telefone)
    // Se o solicitante é o usuário logado, o req.user.id pode ser usado aqui.
    // Por simplicidade, vamos assumir que o solicitanteId é o usuário que está efetivamente criando o chamado.
    ticket.historico[0].usuario = solicitanteId; 

    const createdTicket = await ticket.save();
    res.status(201).json(createdTicket);
  } catch (error) {
    console.error("Erro ao criar chamado:", error);
    res.status(500).json({ message: "Erro no servidor ao criar chamado", error: error.message });
  }
};

// Listar todos os chamados (com filtros e paginação no futuro)
exports.getAllTickets = async (req, res) => {
  try {
    // Adicionar filtros: req.query (ex: status, prioridade, responsavel, modulo)
    // Adicionar paginação
    const tickets = await Ticket.find()
      .populate("solicitante", "name email") // Popula com nome e email do solicitante
      .populate("responsavel", "name email") // Popula com nome e email do responsável
      .sort({ createdAt: -1 }); // Ordena pelos mais recentes
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: "Erro no servidor ao buscar chamados", error: error.message });
  }
};

// Obter um chamado por ID
exports.getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("solicitante", "name email accessLevel")
      .populate("responsavel", "name email accessLevel")
      .populate("historico.usuario", "name email"); // Popula usuário no histórico

    if (ticket) {
      res.json(ticket);
    } else {
      res.status(404).json({ message: "Chamado não encontrado" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro no servidor ao buscar chamado", error: error.message });
  }
};

// Atualizar um chamado
exports.updateTicket = async (req, res) => {
  const { id } = req.params;
  const { responsavelId, prioridade, modulo, status, descricao, tags, sistemaAtivo, comentario, justificativa } = req.body;
  const userId = req.user.id; // ID do usuário que está fazendo a atualização

  try {
    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return res.status(404).json({ message: "Chamado não encontrado" });
    }

    let acaoHistorico = "Chamado atualizado.";
    const detalhesHistorico = {};

    if (responsavelId !== undefined) {
      if (ticket.responsavel?.toString() !== responsavelId) {
        detalhesHistorico.responsavel_anterior = ticket.responsavel;
        detalhesHistorico.responsavel_novo = responsavelId;
        acaoHistorico += " Responsável alterado.";
      }
      ticket.responsavel = responsavelId;
    }
    if (prioridade && ticket.prioridade !== prioridade) {
      detalhesHistorico.prioridade_anterior = ticket.prioridade;
      detalhesHistorico.prioridade_nova = prioridade;
      acaoHistorico += " Prioridade alterada.";
      ticket.prioridade = prioridade;
      // Recalcular SLA se a prioridade mudar
      const now = new Date();
      if (prioridade === "Alta") ticket.slaDueDate = new Date(new Date(ticket.createdAt).setDate(new Date(ticket.createdAt).getDate() + 1));
      else if (prioridade === "Média") ticket.slaDueDate = new Date(new Date(ticket.createdAt).setDate(new Date(ticket.createdAt).getDate() + 3));
      else ticket.slaDueDate = new Date(new Date(ticket.createdAt).setDate(new Date(ticket.createdAt).getDate() + 7));
    }
    if (modulo && ticket.modulo !== modulo) {
      detalhesHistorico.modulo_anterior = ticket.modulo;
      detalhesHistorico.modulo_novo = modulo;
      acaoHistorico += " Módulo alterado.";
      ticket.modulo = modulo;
    }
    if (status && ticket.status !== status) {
      if (!justificativa && (status === "Concluído" || status === "Abandonado")) {
        // Exemplo de regra: Justificativa obrigatória para concluir ou abandonar
        // return res.status(400).json({ message: `Justificativa obrigatória para alterar status para ${status}` });
      }
      detalhesHistorico.status_anterior = ticket.status;
      detalhesHistorico.status_novo = status;
      acaoHistorico += ` Status alterado para ${status}.`;
      ticket.status = status;
    }
    if (descricao) ticket.descricao = descricao; // Descrição pode ser atualizada sem log detalhado de alteração, ou pode-se adicionar
    if (tags) ticket.tags = tags;
    if (sistemaAtivo !== undefined) ticket.sistemaAtivo = sistemaAtivo;

    // Adicionar ao histórico
    if (Object.keys(detalhesHistorico).length > 0 || comentario) {
        const entradaHistorico = {
            usuario: userId,
            acao: acaoHistorico,
            detalhes: Object.keys(detalhesHistorico).length > 0 ? detalhesHistorico : undefined,
            justificativa: comentario || justificativa, // Comentário público ou justificativa interna
            data: new Date(),
        };
        ticket.historico.push(entradaHistorico);
    }

    const updatedTicket = await ticket.save();
    res.json(updatedTicket);
  } catch (error) {
    console.error("Erro ao atualizar chamado:", error);
    res.status(500).json({ message: "Erro no servidor ao atualizar chamado", error: error.message });
  }
};

// Adicionar comentário a um chamado (forma específica de atualização)
exports.addCommentToTicket = async (req, res) => {
  const { id } = req.params;
  const { comentario, publico } = req.body; // publico: true/false
  const userId = req.user.id;

  try {
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: "Chamado não encontrado" });
    }

    const acao = publico ? "Comentário público adicionado" : "Comentário interno adicionado";
    ticket.historico.push({
      usuario: userId,
      acao: acao,
      detalhes: { comentario },
      data: new Date(),
    });

    await ticket.save();
    // Retornar o chamado atualizado para o frontend ter o histórico mais recente
    const updatedTicket = await Ticket.findById(id)
      .populate("solicitante", "name email")
      .populate("responsavel", "name email")
      .populate("historico.usuario", "name email");

    res.json(updatedTicket);
  } catch (error) {
    res.status(500).json({ message: "Erro ao adicionar comentário", error: error.message });
  }
};

// Excluir um chamado (ou marcar como abandonado/arquivado)
// A exclusão real pode não ser desejável para manter o histórico.
// Uma abordagem comum é alterar o status para "Abandonado" ou adicionar um campo "arquivado: true"
exports.deleteTicket = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return res.status(404).json({ message: "Chamado não encontrado" });
    }

    // Em vez de deletar, vamos marcar como Abandonado e adicionar ao histórico
    if (ticket.status !== "Abandonado") {
        ticket.status = "Abandonado";
        ticket.historico.push({
            usuario: userId,
            acao: "Chamado marcado como Abandonado",
            justificativa: req.body.justificativa || "Exclusão solicitada",
            data: new Date(),
        });
        await ticket.save();
        res.json({ message: "Chamado marcado como Abandonado" });
    } else {
        // Se já está abandonado, talvez uma exclusão real (se permitido por administradores)
        // await Ticket.findByIdAndDelete(id);
        // res.json({ message: "Chamado excluído permanentemente (se permitido)" });
        res.json({ message: "Chamado já está Abandonado" });
    }

  } catch (error) {
    res.status(500).json({ message: "Erro no servidor ao excluir/abandonar chamado", error: error.message });
  }
};

// TODO: Implementar upload de anexos (ex: usando multer)
// TODO: Implementar endpoints para relatórios e dashboard
// TODO: Implementar gerenciamento de usuários (CRUD) por administradores
