const express = require("express");
const { registerUser, loginUser, getUserProfile } = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware"); // Criaremos este middleware a seguir

const router = express.Router();

router.post("/register", registerUser); // Idealmente, proteger esta rota para ser acessível apenas por Admins
router.post("/login", loginUser);
router.get("/profile", protect, getUserProfile);

module.exports = router;
