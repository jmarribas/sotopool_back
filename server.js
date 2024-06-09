require("dotenv").config();

const express = require("express");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");
const multer = require('multer');
const { sotoPoolDB } = require("./config/sotoPoolDB");
const userRoutes = require("./api/routes/user");
const app = express();
const PORT = process.env.PORT || 8080;

sotoPoolDB();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

app.use(express.json());
app.use(cors());
app.use(express.static('src'));
app.use('/licenses', express.static('src/licenses'));

app.use("/users", userRoutes);

app.use("*/", (req, res, next) => {
  return res.status(404).json("Route not found")
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});