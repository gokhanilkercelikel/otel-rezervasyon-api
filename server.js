const express = require("express");

const app = express();

app.use(express.json());

// Railway sunucusunun çalıştığını kontrol etmek için
app.get("/", (req, res) => {
  res.status(200).send("WhatsApp API çalışıyor.");
});

// Meta webhook doğrulaması
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verifyToken = process.env.VERIFY_TOKEN;

  if (!verifyToken) {
    console.error("VERIFY_TOKEN Railway üzerinde tanımlanmamış.");
    return res.sendStatus(500);
  }

  if (mode === "subscribe" && token === verifyToken) {
    console.log("Webhook başarıyla doğrulandı.");
    return res.status(200).send(challenge);
  }

  console.log("Webhook doğrulaması başarısız.");
  return res.sendStatus(403);
});

// Meta tarafından gönderilen WhatsApp olaylarını alma
app.post("/webhook", (req, res) => {
  // Meta'ya isteğin alındığını hemen bildir
  res.sendStatus(200);

  try {
    const body = req.body;

    if (body.object !== "whatsapp_business_account") {
      console.log("WhatsApp dışı webhook olayı alındı.");
      return;
    }

    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value || {};
        const messages = value.messages || [];

        for (const message of messages) {
          const senderNumber = message.from;
          const messageType = message.type;

          let messageContent = "";

          if (messageType === "text") {
            messageContent = message.text?.body || "";
          } else if (messageType === "interactive") {
            messageContent =
              message.interactive?.button_reply?.title ||
              message.interactive?.list_reply?.title ||
              "";
          } else {
            messageContent = `[${messageType} türünde mesaj]`;
          }

          console.log("Yeni WhatsApp mesajı:", {
            senderNumber,
            messageType,
            messageContent,
          });

          // Daha sonra buraya şu işlemleri ekleyeceğiz:
          // 1. Flow verilerini işleme
          // 2. Oda fiyatı hesaplama
          // 3. Google Sheets'e rezervasyon kaydetme
          // 4. Canlı desteğe bildirim gönderme
        }
      }
    }
  } catch (error) {
    console.error("Webhook işlenirken hata oluştu:", error);
  }
});

// Railway PORT değişkenini otomatik verir
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});
