
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/userModel");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-prod";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

const authController = {
  register: async (req, res, next) => {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password)
        return res.status(400).json({ error: "Name, email, and password are required" });
      if (password.length < 8)
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      if (UserModel.findByEmail(email))
        return res.status(409).json({ error: "Email already registered" });
      const passwordHash = await bcrypt.hash(password, 12);
      const user = UserModel.create({ name, email, passwordHash, role });
      const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json({ message: "User registered successfully", user: safeUser, token });
    } catch (err) { next(err); }
  },

  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ error: "Email and password are required" });
      const user = UserModel.findByEmail(email);
      if (!user || !(await bcrypt.compare(password, user.passwordHash)))
        return res.status(401).json({ error: "Invalid credentials" });
      const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      const { passwordHash: _, ...safeUser } = user;
      res.status(200).json({ message: "Login successful", user: safeUser, token });
    } catch (err) { next(err); }
  },

  validate: (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ valid: false, error: "No token provided" });
    try {
      const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
      res.status(200).json({ valid: true, user: { userId: decoded.userId, email: decoded.email, role: decoded.role } });
    } catch (err) {
      res.status(401).json({ valid: false, error: "Invalid or expired token" });
    }
  }
};

module.exports = authController;
