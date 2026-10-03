const express = require("express");
const orderController = require("./order.controller");

const router = express.Router();

router.get("/", orderController.getAdminOrders);
router.get("/:id", orderController.getAdminOrderDetails);

module.exports = router;
