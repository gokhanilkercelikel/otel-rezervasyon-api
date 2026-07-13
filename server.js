const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("WhatsApp API çalışıyor.");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor.`);
});
