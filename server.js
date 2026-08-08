const express = require("express");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

app.get("/", (req, res) => {
  res.status(200).send("Otel rezervasyon robotu çalışıyor.");
});

app.get("/privacy", (req, res) => {
  res.type("html").status(200).send([
    "<!DOCTYPE html>",
    "<html lang='tr'><head>",
    "<meta charset='UTF-8'>",
    "<meta name='viewport' content='width=device-width, initial-scale=1'>",
    "<title>Gizlilik Politikası</title>",
    "</head>",
    "<body style='max-width:800px;margin:40px auto;padding:20px;font-family:Arial;line-height:1.6;color:#222'>",
    "<h1>Gizlilik Politikası</h1>",
    "<p>Son güncelleme: 9 Ağustos 2026</p>",
    "<h2>Toplanan Bilgiler</h2>",
    "<p>WhatsApp üzerinden iletilen iletişim, konaklama ve rezervasyon bilgileri işlenebilir.</p>",
    "<h2>Kullanım Amacı</h2>",
    "<p>Bilgiler rezervasyon taleplerini yanıtlamak, oda ve fiyat bilgisi sunmak ve müşteri desteği sağlamak amacıyla kullanılır.</p>",
    "<h2>Bilgilerin Paylaşılması</h2>",
    "<p>Kişisel bilgiler satılmaz ve yalnızca hizmetin yürütülmesi için gerekli taraflarla paylaşılır.</p>",
    "<h2>Saklama ve Silme</h2>",
    "<p>Kullanıcılar WhatsApp destek hattı üzerinden bilgilerinin silinmesini talep edebilir.</p>",
    "<h2>İletişim</h2>",
    "<p>Gizlilik talepleriniz için işletmenin WhatsApp destek hattından bize ulaşabilirsiniz.</p>",
    "</body></html>"
  ].join(""));
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
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: alici,
        type: "text",
        text: {
          body: mesaj
        }
      })
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
