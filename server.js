const express = require("express");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

const oturumlar = new Map();

app.get("/", (req, res) => {
  res.status(200).send("Dorel Marin rezervasyon robotu çalışıyor.");
});

app.get("/privacy", (req, res) => {
  res.type("html").status(200).send(`
    <!DOCTYPE html>
    <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Gizlilik Politikası</title>
      </head>
      <body style="max-width:800px;margin:40px auto;padding:20px;font-family:Arial;line-height:1.6;color:#222">
        <h1>Gizlilik Politikası</h1>
        <p>Son güncelleme: 11 Ağustos 2026</p>

        <h2>Toplanan Bilgiler</h2>
        <p>WhatsApp üzerinden iletilen iletişim, konaklama ve rezervasyon bilgileri işlenebilir.</p>

        <h2>Kullanım Amacı</h2>
        <p>Bilgiler; rezervasyon taleplerini yanıtlamak, oda ve fiyat bilgisi sunmak ve müşteri desteği sağlamak amacıyla kullanılır.</p>

        <h2>Bilgilerin Paylaşılması</h2>
        <p>Kişisel bilgiler satılmaz ve yalnızca hizmetin yürütülmesi için gerekli taraflarla paylaşılır.</p>

        <h2>Saklama ve Silme</h2>
        <p>Kullanıcılar WhatsApp destek hattı üzerinden bilgilerinin silinmesini talep edebilir.</p>

        <h2>İletişim</h2>
        <p>Gizlilik talepleriniz için işletmenin WhatsApp destek hattından bize ulaşabilirsiniz.</p>
      </body>
    </html>
  `);
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
          preview_url: false,
          body: mesaj
        }
      })
    }
  );

  const sonuc = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(sonuc));
  }

  console.log("Otomatik cevap gönderildi.");
}

function metniTemizle(metin) {
  return String(metin || "")
    .trim()
    .toLocaleLowerCase("tr-TR");
}

function tarihCoz(metin) {
  const eslesme = String(metin || "").trim().match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/
  );

  if (!eslesme) {
    return null;
  }

  const gun = Number(eslesme[1]);
  const ay = Number(eslesme[2]);
  const yil = Number(eslesme[3]);

  const tarih = new Date(Date.UTC(yil, ay - 1, gun));

  if (
    tarih.getUTCFullYear() !== yil ||
    tarih.getUTCMonth() !== ay - 1 ||
    tarih.getUTCDate() !== gun
  ) {
    return null;
  }

  return tarih;
}

function geceHesapla(giris, cikis) {
  return Math.round((cikis.getTime() - giris.getTime()) / 86400000);
}

async function anaMenuGonder(telefon) {
  oturumlar.set(telefon, {
    adim: "ana_menu"
  });

  await mesajGonder(
    telefon,
    "🛎️ *Mersin Dorel Marin Otel Rezervasyon Sistemine Hoş Geldiniz.*\n\n" +
    "Size nasıl yardımcı olabiliriz?\n\n" +
    "1️⃣ Rezervasyon & Fiyat Bilgisi\n" +
    "2️⃣ Otel Bilgileri\n" +
    "3️⃣ Canlı Destek\n\n" +
    "Lütfen yapmak istediğiniz işlemin numarasını yazınız.\n\n" +
    "Ana menüye dönmek için istediğiniz zaman *MENU* yazabilirsiniz."
  );
}

async function rezervasyonBaslat(telefon) {
  oturumlar.set(telefon, {
    adim: "kisi_secimi"
  });

  await mesajGonder(
    telefon,
    "👨‍👩‍👧‍👦 *Konaklayacak kişi seçimi*\n\n" +
    "1️⃣ 1 Yetişkin\n" +
    "2️⃣ 2 Yetişkin\n" +
    "3️⃣ 2 Yetişkin + 1 Çocuk\n" +
    "4️⃣ 2 Yetişkin + 2 Çocuk\n" +
    "5️⃣ 2 Yetişkin + 3 Çocuk\n" +
    "6️⃣ 2 Yetişkin + 4 Çocuk\n\n" +
    "Lütfen uygun seçeneğin numarasını yazınız."
  );
}

async function akisiYonet(telefon, metin) {
  const komut = metniTemizle(metin);

  if (
    komut === "menu" ||
    komut === "menü" ||
    komut === "basla" ||
    komut === "başla" ||
    komut === "0"
  ) {
    await anaMenuGonder(telefon);
    return;
  }

  let oturum = oturumlar.get(telefon);

  if (!oturum) {
    await anaMenuGonder(telefon);
    return;
  }

  if (oturum.adim === "ana_menu") {
    if (komut === "1") {
      await rezervasyonBaslat(telefon);
      return;
    }

    if (komut === "2") {
      await mesajGonder(
        telefon,
        "🏨 *Mersin Dorel Marin Otel Bilgileri*\n\n" +
        "✅ Ücretsiz açık büfe kahvaltı\n" +
        "✅ Ücretsiz yüksek hızlı Wi-Fi\n" +
        "✅ Talebe göre ücretsiz oda temizliği\n" +
        "✅ Klimalı odalar\n" +
        "✅ 24 saat sıcak su\n" +
        "✅ Havlu, şampuan, duş jeli ve terlik\n" +
        "✅ 24 saat ücretsiz çay hizmeti\n" +
        "✅ Otel çevresinde park\n\n" +
        "🛏️ *Oda Donanımları*\n" +
        "• Inverter split klima\n" +
        "• 43 inç Smart TV\n" +
        "• Mini buzdolabı\n" +
        "• Çalışma masası\n" +
        "• Elbise dolabı\n" +
        "• Elektronik kapı kilidi\n" +
        "• Modern LED aydınlatma\n\n" +
        "📍 Sahil yürüyüş yolu, restoranlar, Forum ve Marina AVM yürüme mesafesindedir.\n\n" +
        "Rezervasyon için *1*, ana menü için *MENU* yazabilirsiniz."
      );
      return;
    }

    if (komut === "3") {
      await mesajGonder(
        telefon,
        "🎧 *Canlı Destek*\n\n" +
        "Talebinizi bu konuşmaya yazabilirsiniz.\n" +
        "Rezervasyon ekibimiz en kısa sürede size yardımcı olacaktır.\n\n" +
        "Ana menüye dönmek için *MENU* yazabilirsiniz."
      );
      return;
    }

    await mesajGonder(
      telefon,
      "Lütfen yalnızca *1, 2 veya 3* seçeneklerinden birini yazınız."
    );
    return;
  }

  if (oturum.adim === "kisi_secimi") {
    const secenekler = {
      "1": {
        aciklama: "1 Yetişkin",
        cocukSayisi: 0
      },
      "2": {
        aciklama: "2 Yetişkin",
        cocukSayisi: 0
      },
      "3": {
        aciklama: "2 Yetişkin + 1 Çocuk",
        cocukSayisi: 1
      },
      "4": {
        aciklama: "2 Yetişkin + 2 Çocuk",
        cocukSayisi: 2
      },
      "5": {
        aciklama: "2 Yetişkin + 3 Çocuk",
        cocukSayisi: 3
      },
      "6": {
        aciklama: "2 Yetişkin + 4 Çocuk",
        cocukSayisi: 4
      }
    };

    const secim = secenekler[komut];

    if (!secim) {
      await mesajGonder(
        telefon,
        "Lütfen *1 ile 6* arasında geçerli bir seçenek yazınız."
      );
      return;
    }

    oturum.kisiSecimi = secim.aciklama;
    oturum.cocukSayisi = secim.cocukSayisi;

    if (secim.cocukSayisi > 0) {
      oturum.adim = "cocuk_yaslari";
      oturumlar.set(telefon, oturum);

      await mesajGonder(
        telefon,
        `👶 Lütfen ${secim.cocukSayisi} çocuğun yaşını aralarında virgül olacak şekilde yazınız.\n\n` +
        "Örnek: *3, 7*"
      );
      return;
    }

    oturum.adim = "giris_tarihi";
    oturumlar.set(telefon, oturum);

    await mesajGonder(
      telefon,
      "📅 Giriş tarihinizi *GG.AA.YYYY* biçiminde yazınız.\n\n" +
      "Örnek: *15.08.2026*"
    );
    return;
  }

  if (oturum.adim === "cocuk_yaslari") {
    const yaslar = metin
      .split(/[,;/\s]+/)
      .filter(Boolean)
      .map(Number);

    const gecerli =
      yaslar.length === oturum.cocukSayisi &&
      yaslar.every(
        yas => Number.isInteger(yas) && yas >= 0 && yas <= 12
      );

    if (!gecerli) {
      await mesajGonder(
        telefon,
        `Lütfen ${oturum.cocukSayisi} çocuğun yaşını 0–12 arasında, virgülle ayırarak yazınız.`
      );
      return;
    }

    oturum.cocukYaslari = yaslar.join(", ");
    oturum.adim = "giris_tarihi";
    oturumlar.set(telefon, oturum);

    await mesajGonder(
      telefon,
      "📅 Giriş tarihinizi *GG.AA.YYYY* biçiminde yazınız.\n\n" +
      "Örnek: *15.08.2026*"
    );
    return;
  }

  if (oturum.adim === "giris_tarihi") {
    const giris = tarihCoz(metin);

    if (!giris) {
      await mesajGonder(
        telefon,
        "Giriş tarihini *GG.AA.YYYY* biçiminde yazınız.\nÖrnek: *15.08.2026*"
      );
      return;
    }

    oturum.girisTarihi = metin.trim();
    oturum.girisTarihNesnesi = giris;
    oturum.adim = "cikis_tarihi";
    oturumlar.set(telefon, oturum);

    await mesajGonder(
      telefon,
      "📅 Çıkış tarihinizi *GG.AA.YYYY* biçiminde yazınız.\n\n" +
      "Örnek: *18.08.2026*"
    );
    return;
  }

  if (oturum.adim === "cikis_tarihi") {
    const cikis = tarihCoz(metin);

    if (!cikis) {
      await mesajGonder(
        telefon,
        "Çıkış tarihini *GG.AA.YYYY* biçiminde yazınız.\nÖrnek: *18.08.2026*"
      );
      return;
    }

    const gece = geceHesapla(
      oturum.girisTarihNesnesi,
      cikis
    );

    if (gece <= 0) {
      await mesajGonder(
        telefon,
        "Çıkış tarihi giriş tarihinden sonra olmalıdır."
      );
      return;
    }

    oturum.cikisTarihi = metin.trim();
    oturum.geceSayisi = gece;
    oturum.adim = "ad_soyad";
    oturumlar.set(telefon, oturum);

    await mesajGonder(
      telefon,
      "👤 Rezervasyon sahibinin *adını ve soyadını* yazınız."
    );
    return;
  }

  if (oturum.adim === "ad_soyad") {
    if (metin.trim().length < 3) {
      await mesajGonder(
        telefon,
        "Lütfen geçerli bir ad ve soyad yazınız."
      );
      return;
    }

    oturum.adSoyad = metin.trim();
    oturum.adim = "onay";
    oturumlar.set(telefon, oturum);

    const cocukBilgisi = oturum.cocukYaslari
      ? `\n👶 Çocuk yaşları: ${oturum.cocukYaslari}`
      : "";

    await mesajGonder(
      telefon,
      "📋 *Rezervasyon Talebi Özeti*\n\n" +
      `👤 Ad Soyad: ${oturum.adSoyad}\n` +
      `👨‍👩‍👧‍👦 Misafir: ${oturum.kisiSecimi}` +
      cocukBilgisi + "\n" +
      `📅 Giriş: ${oturum.girisTarihi}\n` +
      `📅 Çıkış: ${oturum.cikisTarihi}\n` +
      `🌙 Konaklama: ${oturum.geceSayisi} gece\n\n` +
      "Bilgileri onaylıyor musunuz?\n\n" +
      "1️⃣ Evet, talebi oluştur\n" +
      "2️⃣ Hayır, iptal et"
    );
    return;
  }

  if (oturum.adim === "onay") {
    if (
      komut === "1" ||
      komut === "evet" ||
      komut === "onay" ||
      komut === "onayla"
    ) {
      console.log(
        "YENİ REZERVASYON TALEBİ:",
        JSON.stringify({
          telefon,
          adSoyad: oturum.adSoyad,
          kisiSecimi: oturum.kisiSecimi,
          cocukYaslari: oturum.cocukYaslari || "",
          girisTarihi: oturum.girisTarihi,
          cikisTarihi: oturum.cikisTarihi,
          geceSayisi: oturum.geceSayisi
        })
      );

      oturumlar.delete(telefon);

      await mesajGonder(
        telefon,
        "🎉 *Rezervasyon talebiniz alınmıştır.*\n\n" +
        "Oda uygunluğu ve toplam fiyat kontrol edildikten sonra rezervasyon ekibimiz sizinle iletişime geçecektir.\n\n" +
        "Bizi tercih ettiğiniz için teşekkür ederiz. 🙏"
      );
      return;
    }

    if (
      komut === "2" ||
      komut === "hayır" ||
      komut === "hayir" ||
      komut === "iptal"
    ) {
      oturumlar.delete(telefon);

      await mesajGonder(
        telefon,
        "Rezervasyon talebiniz iptal edildi.\n\n" +
        "Yeniden başlamak için *MENU* yazabilirsiniz."
      );
      return;
    }

    await mesajGonder(
      telefon,
      "Lütfen onaylamak için *1*, iptal etmek için *2* yazınız."
    );
  }
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

    if (mesaj.type !== "text") {
      await mesajGonder(
        telefon,
        "Şimdilik yalnızca yazılı mesajları anlayabiliyorum.\nAna menü için *MENU* yazabilirsiniz."
      );
      return;
    }

    const metin = mesaj.text?.body || "";

    console.log("Gelen mesaj:", telefon, metin);

    await akisiYonet(telefon, metin);
  } catch (hata) {
    console.error("Webhook hatası:", hata.message);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});
