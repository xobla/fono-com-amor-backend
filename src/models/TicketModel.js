const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema({
  sequentialId: {
    type: Number,
    required: true,
    unique: true, // Gerado automaticamente
  },
  solicitante: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  responsavel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    // Atribuição inteligente pode ser implementada no serviço
  },
  prioridade: {
    type: String,
    enum: ["Alta", "Média", "Baixa"],
    required: true,
    default: "Média",
  },
  slaDueDate: { // Data de vencimento do SLA calculada
    type: Date,
  },
  modulo: {
    type: String,
    enum: ["Sistema", "Financeiro", "Atendimento", "Administrativo", "Outro"],
    required: true,
  },
  status: {
    type: String,
    enum: ["A Iniciar", "Iniciado", "Aguardando Ivo", "Aguardando FCA", "Concluído", "Abandonado"],
    default: "A Iniciar",
    required: true,
  },
  sistemaAtivo: {
    type: Boolean,
    default: true,
  },
  descricao: {
    type: String,
    required: true,
  },
  anexos: [
    {
      fileName: String,
      filePath: String, // Caminho para o arquivo armazenado
      fileType: String,
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  tags: [String],
  historico: [
    {
      usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      acao: String, // Ex: "Status alterado para Concluído"
      detalhes: mongoose.Schema.Types.Mixed, // Para armazenar valores antigos/novos
      justificativa: String,
      data: { type: Date, default: Date.now },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware para atualizar `updatedAt`
TicketSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  // Lógica para adicionar ao histórico na criação pode ser aqui ou no controller/service
  if (this.isNew) {
    this.historico.push({
      // usuario: this.solicitante, // ou o usuário que está criando, se diferente
      acao: "Chamado criado",
      detalhes: { status: this.status, prioridade: this.prioridade, modulo: this.modulo },
      data: new Date(),
    });
  }
  next();
});

// Lógica para ID sequencial e SLA precisará ser implementada nos services/controllers
// ou usando um plugin/abordagem de auto-incremento para sequentialId se o MongoDB não suportar nativamente de forma simples.
// Para o sequentialId, uma abordagem comum é ter uma coleção separada de contadores.

module.exports = mongoose.model("Ticket", TicketSchema);
