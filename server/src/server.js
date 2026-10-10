require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(
      `VentureDesk API running at http://localhost:${PORT}`
    );
  });
}

startServer().catch((error) => {
  console.error("Unable to start VentureDesk API:", error.message);
  process.exitCode = 1;
});

process.on("SIGINT", async () => {
  await mongoose.disconnect();
  process.exit(0);
});