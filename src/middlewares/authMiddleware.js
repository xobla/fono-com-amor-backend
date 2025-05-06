const jwt = require("jsonwebtoken");
const User = require("../models/UserModel");

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Obter token do header
      token = req.headers.authorization.split(" ")[1];

      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_key_12345"); // Adicionado fallback para JWT_SECRET

      // Obter usuário do token (sem a senha)
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "Não autorizado, usuário não encontrado" });
      }

      next();
    } catch (error) {
      console.error("Erro na autenticação do token:", error);
      return res.status(401).json({ message: "Não autorizado, token falhou" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Não autorizado, sem token" });
  }
};

// Middleware para verificar o nível de acesso
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.accessLevel)) {
      return res.status(403).json({ message: `Usuário com nível '${req.user ? req.user.accessLevel : "desconhecido"}' não tem permissão para acessar este recurso. Níveis permitidos: ${roles.join(", ")}` });
    }
    next();
  };
};
