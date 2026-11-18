const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const errorHandler = require("./middlewares/error.middleware");
const apiRoutes = require("./routes");
require('dotenv').config();

const app = express();

// Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan("dev"));

// Static files for Return Portal
app.use("/return_portal", express.static(path.join(__dirname, "../public/return_portal")));
app.use("/public", express.static(path.join(__dirname, "../public")));

// Routes (Hỗ trợ cả /api/v1 và /api theo sơ đồ kiến trúc)
app.use("/api/v1", apiRoutes);
app.use("/api", apiRoutes);

// Health check & Portal redirect
app.get("/", (req, res) =>
  res.json({ success: true, message: "Ceramic Shop Server running", return_portal: "/return_portal/" })
);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
