const jwt = require("jsonwebtoken");
const User = require("../models/UserModel");

// Função para gerar token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "fallback_secret_key_12345", { // Adicionado fallback para JWT_SECRET
    expiresIn: "30d",
  });
};

// Registrar novo usuário (inicialmente pode ser uma rota protegida para admin)
exports.registerUser = async (req, res) => {
  const { name, email, password, accessLevel } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Usuário já existe" });
    }

    const user = await User.create({
      name,
      email,
      password,
      accessLevel,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        accessLevel: user.accessLevel,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: "Dados inválidos" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro no servidor", error: error.message });
  }
};

// Autenticar usuário e obter token
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).select("+password");

    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        accessLevel: user.accessLevel,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Email ou senha inválidos" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erro no servidor", error: error.message });
  }
};

// Obter perfil do usuário logado (exemplo de rota protegida)
exports.getUserProfile = async (req, res) => {
  // req.user será populado pelo middleware de autenticação
  const user = await User.findById(req.user.id).select("-password");
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ message: "Usuário não encontrado" });
  }
};
