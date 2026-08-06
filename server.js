const express = require("express");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

app.get("/", (req, res) => {
  res.status(200).send("Otel rezervasyon robotu çalışıyor.");
});

// Meta webhook doğrulaması
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook başarıyla doğrulandı.");
    return res.status(200).send(challenge);
  }

  console.log("Webhook doğrulaması başarısız.");
  return res.sendStatus(403);
});

async function mesajGonder(alici, mesaj) {
  const response = await fetch(
    `https://graph.facebook.com/v26.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: alici,
        type: "text",
        text: {
          body: mesaj,
        },
      }),
    }
  );

  const sonuc = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(sonuc));
  }

  console.log("Otomatik cevap gönderildi:", sonuc);
}

// Gelen WhatsApp mesajları
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  console.log("Webhook POST isteği geldi.");

  try {
    const mesaj =
      req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!mesaj) {
      console.log("Kullanıcı mesajı bulunamadı.");
      return;
    }

    const telefon = mesaj.from;
    const metin =
      mesaj.type === "text" ? mesaj.text?.body || "" : "";

    console.log("Gelen mesaj:", telefon, metin);

    await mesajGonder(
      telefon,
      "🛎️ Mersin Otel Rezervasyon Sistemine Hoş Geldiniz.\n\nRezervasyon işleminizi başlatmak için hazırız."
    );
  } catch (hata) {
    console.error("Webhook hatası:", hata.message);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});
