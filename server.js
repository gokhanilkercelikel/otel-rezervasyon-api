const express = require("express");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

const oturumlar = new Map();
const demoCevaplari = new Map();

const ANA_MENU =
  "🛎️ *Mersin Dorel Marin Otel Rezervasyon Sistemine Hoş Geldiniz.*\n\n" +
  "Size nasıl yardımcı olabiliriz?\n\n" +
  "1️⃣ Rezervasyon & Fiyat Bilgisi\n" +
  "2️⃣ Otel Bilgileri\n" +
  "3️⃣ Canlı Destek\n\n" +
  "Lütfen yapmak istediğiniz işlemin numarasını yazınız.\n\n" +
  "Ana menüye dönmek için istediğiniz zaman *MENU* yazabilirsiniz.";

const OTEL_BILGILERI =
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
  "Rezervasyon için *1*, ana menü için *MENU* yazabilirsiniz.";

const KISI_SECIMI =
  "👨‍👩‍👧‍👦 *Konaklayacak kişi seçimi*\n\n" +
  "1️⃣ 1 Yetişkin\n" +
  "2️⃣ 2 Yetişkin\n" +
  "3️⃣ 2 Yetişkin + 1 Çocuk\n" +
  "4️⃣ 2 Yetişkin + 2 Çocuk\n" +
  "5️⃣ 2 Yetişkin + 3 Çocuk\n" +
  "6️⃣ 2 Yetişkin + 4 Çocuk\n\n" +
  "Lütfen uygun seçeneğin numarasını yazınız.";

const KISI_SECENEKLERI = {
  "1": { aciklama: "1 Yetişkin", cocukSayisi: 0 },
  "2": { aciklama: "2 Yetişkin", cocukSayisi: 0 },
  "3": { aciklama: "2 Yetişkin + 1 Çocuk", cocukSayisi: 1 },
  "4": { aciklama: "2 Yetişkin + 2 Çocuk", cocukSayisi: 2 },
  "5": { aciklama: "2 Yetişkin + 3 Çocuk", cocukSayisi: 3 },
  "6": { aciklama: "2 Yetişkin + 4 Çocuk", cocukSayisi: 4 }
};

app.get("/", (req, res) => {
  res.status(200).send(
    "Dorel Marin rezervasyon robotu çalışıyor. Demo: /demo"
  );
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
        <p>Bilgiler rezervasyon taleplerini yanıtlamak, oda ve fiyat bilgisi sunmak ve müşteri desteği sağlamak amacıyla kullanılır.</p>
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
  if (demoCevaplari.has(alici)) {
    demoCevaplari.get(alici).push(mesaj);
    return;
  }

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
  const eslesme = String(metin || "")
    .trim()
    .match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);

  if (!eslesme) return null;

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
  return Math.round(
    (cikis.getTime() - giris.getTime()) / 86400000
  );
}

async function anaMenuGonder(telefon) {
  oturumlar.set(telefon, { adim: "ana_menu" });
  await mesajGonder(telefon, ANA_MENU);
}

async function rezervasyonBaslat(telefon) {
  oturumlar.set(telefon, { adim: "kisi_secimi" });
  await mesajGonder(telefon, KISI_SECIMI);
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
      await mesajGonder(telefon, OTEL_BILGILERI);
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
    const secim = KISI_SECENEKLERI[komut];

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
        "Giriş tarihini *GG.AA.YYYY* biçiminde yazınız.\n" +
        "Örnek: *15.08.2026*"
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
        "Çıkış tarihini *GG.AA.YYYY* biçiminde yazınız.\n" +
        "Örnek: *18.08.2026*"
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

function demoSayfasi() {
  return `
    <!DOCTYPE html>
    <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Dorel Marin Rezervasyon Robotu</title>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 18px;
            font-family: Arial, sans-serif;
            background:
              radial-gradient(circle at top left, #2b7a62, transparent 38%),
              linear-gradient(135deg, #063d32, #0e6b55);
          }

          .telefon {
            width: 100%;
            max-width: 450px;
            height: min(880px, 94vh);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 7px solid #17211f;
            border-radius: 28px;
            background: #efeae2;
            box-shadow: 0 25px 70px rgba(0, 0, 0, 0.38);
          }

          .baslik {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 15px;
            color: white;
            background: #075e54;
          }

          .logo {
            width: 45px;
            height: 45px;
            display: grid;
            place-items: center;
            border-radius: 50%;
            font-size: 24px;
            color: #075e54;
            background: white;
          }

          .baslik h1 {
            margin: 0 0 3px;
            font-size: 17px;
          }

          .durum {
            font-size: 12px;
            opacity: 0.86;
          }

          .mesajlar {
            flex: 1;
            overflow-y: auto;
            padding: 18px 12px;
            background:
              radial-gradient(circle at 12px 12px, rgba(7,94,84,.06) 2px, transparent 3px),
              #efeae2;
            background-size: 28px 28px;
          }

          .mesaj {
            max-width: 86%;
            margin-bottom: 10px;
            padding: 10px 12px;
            border-radius: 11px;
            white-space: pre-wrap;
            font-size: 14px;
            line-height: 1.42;
            box-shadow: 0 1px 2px rgba(0,0,0,.13);
          }

          .robot {
            margin-right: auto;
            border-top-left-radius: 2px;
            background: white;
          }

          .kullanici {
            margin-left: auto;
            border-top-right-radius: 2px;
            background: #d9fdd3;
          }

          .hizli {
            display: flex;
            gap: 7px;
            overflow-x: auto;
            padding: 9px 10px;
            background: rgba(255,255,255,.9);
            border-top: 1px solid #ddd;
          }

          .hizli button {
            flex: 0 0 auto;
            padding: 8px 12px;
            border: 1px solid #0a806f;
            border-radius: 18px;
            color: #075e54;
            background: white;
            cursor: pointer;
            font-weight: bold;
          }

          form {
            display: flex;
            gap: 8px;
            padding: 10px;
            background: #f0f2f5;
          }

          input {
            flex: 1;
            min-width: 0;
            padding: 12px 15px;
            border: 0;
            border-radius: 22px;
            outline: none;
            font-size: 15px;
          }

          .gonder {
            width: 46px;
            height: 46px;
            border: 0;
            border-radius: 50%;
            color: white;
            background: #00a884;
            cursor: pointer;
            font-size: 19px;
          }

          .gonder:disabled {
            opacity: .55;
          }
        </style>
      </head>

      <body>
        <main class="telefon">
          <header class="baslik">
            <div class="logo">🏨</div>
            <div>
              <h1>Mersin Dorel Marin Otel</h1>
              <div class="durum">Rezervasyon robotu çevrimiçi</div>
            </div>
          </header>

          <section id="mesajlar" class="mesajlar"></section>

          <div class="hizli">
            <button type="button" data-mesaj="1">1</button>
            <button type="button" data-mesaj="2">2</button>
            <button type="button" data-mesaj="3">3</button>
            <button type="button" data-mesaj="4">4</button>
            <button type="button" data-mesaj="5">5</button>
            <button type="button" data-mesaj="6">6</button>
            <button type="button" data-mesaj="MENU">MENU</button>
          </div>

          <form id="form">
            <input
              id="metin"
              autocomplete="off"
              placeholder="Mesajınızı yazınız"
            >
            <button id="gonder" class="gonder" type="submit">➤</button>
          </form>
        </main>

        <script>
          const oturumKimligi =
            window.crypto && crypto.randomUUID
              ? crypto.randomUUID()
              : String(Date.now()) + Math.random();

          const mesajlar = document.getElementById("mesajlar");
          const form = document.getElementById("form");
          const metin = document.getElementById("metin");
          const gonder = document.getElementById("gonder");

          function mesajEkle(yazi, tur) {
            const kutu = document.createElement("div");
            kutu.className = "mesaj " + tur;
            kutu.textContent = String(yazi).replaceAll("*", "");
            mesajlar.appendChild(kutu);
            mesajlar.scrollTop = mesajlar.scrollHeight;
          }

          function bekle(sure) {
            return new Promise(resolve => setTimeout(resolve, sure));
          }

          async function robotaGonder(yazi, kullaniciyiGoster) {
            if (!yazi.trim()) return;

            if (kullaniciyiGoster) {
              mesajEkle(yazi, "kullanici");
            }

            gonder.disabled = true;

            try {
              const response = await fetch("/demo/mesaj", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  oturumKimligi,
                  mesaj: yazi
                })
              });

              const sonuc = await response.json();

              for (const cevap of sonuc.cevaplar || []) {
                await bekle(350);
                mesajEkle(cevap, "robot");
              }
            } catch (hata) {
              mesajEkle(
                "Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.",
                "robot"
              );
            } finally {
              gonder.disabled = false;
              metin.focus();
            }
          }

          form.addEventListener("submit", event => {
            event.preventDefault();

            const yazi = metin.value;
            metin.value = "";

            robotaGonder(yazi, true);
          });

          document.querySelectorAll("[data-mesaj]").forEach(button => {
            button.addEventListener("click", () => {
              robotaGonder(button.dataset.mesaj, true);
            });
          });

          robotaGonder("MENU", false);
        </script>
      </body>
    </html>
  `;
}

app.get("/demo", (req, res) => {
  res.type("html").status(200).send(demoSayfasi());
});

app.post("/demo/mesaj", async (req, res) => {
  const oturumKimligi = String(
    req.body?.oturumKimligi || "gecici"
  ).replace(/[^a-zA-Z0-9_-]/g, "");

  const mesaj = String(req.body?.mesaj || "").slice(0, 500);
  const demoTelefon = `demo_${oturumKimligi}`;
  const cevaplar = [];

  demoCevaplari.set(demoTelefon, cevaplar);

  try {
    await akisiYonet(demoTelefon, mesaj);
    res.status(200).json({ cevaplar });
  } catch (hata) {
    console.error("Demo hatası:", hata.message);

    res.status(500).json({
      cevaplar: [
        "Sistem hatası oluştu. Lütfen tekrar deneyiniz."
      ]
    });
  } finally {
    demoCevaplari.delete(demoTelefon);
  }
});

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
        "Şimdilik yalnızca yazılı mesajları anlayabiliyorum.\n" +
        "Ana menü için *MENU* yazabilirsiniz."
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
