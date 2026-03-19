
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate, authorize } = require("../middleware/auth");

router.get("/me", authenticate, userController.getProfile);
router.put("/me", authenticate, userController.updateProfile);
router.get("/:id", authenticate, userController.getUserById);
router.get("/", authenticate, authorize("admin"), userController.getAllUsers);
router.delete("/:id", authenticate, authorize("admin"), userController.deleteUser);

module.exports = router;
