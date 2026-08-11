const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const cron = require('node-cron');
const express = require('express');

const app = express();
const port = process.env.PORT || 10000;

let qrCodeUrl = "";
let statusMessage = "Sistem başlatılıyor, lütfen bekleyin...";

app.get('/', (req, res) => {
    if (qrCodeUrl) {
        res.send(`
            <html>
            <head><title>Cuma Botu</title><meta charset="utf-8"></head>
            <body style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                <h2>Lütfen WhatsApp'tan 'Cihaz Bağla' diyerek aşağıdaki QR kodu okutun:</h2>
                <img src="${qrCodeUrl}" alt="QR Kod" style="width: 300px; height: 300px; border: 2px solid #ccc; padding: 10px; border-radius: 10px;">
                <p style="color: gray; margin-top: 20px;">Not: 'Bağlanılamadı' hatası alırsanız sayfayı yenileyip (F5) yeni kodu okutun.</p>
            </body>
            </html>
        `);
    } else {
        res.send(`<h2 style="text-align: center; margin-top: 50px; font-family: sans-serif;">Durum: ${statusMessage}</h2>`);
    }
});

app.listen(port, () => console.log(`Web sunucusu ${port} portunda devrede.`));

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', (qr) => {
    console.log('✅ YENİ QR KOD OLUŞTURULDU! Lütfen web sitesine gidin.');
    qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(qr);
    statusMessage = "QR Kod okutulmayı bekliyor...";
});

client.on('ready', async () => {
    console.log('✅ WhatsApp bağlandı! Test mesajı gönderiliyor...');
    qrCodeUrl = ""; 
    statusMessage = "✅ WhatsApp başarıyla bağlandı! Cuma botu aktif.";

    const numaralar = [
        "905551112233@c.us", // BURAYA KENDİ NUMARANI YAZ (Örn: 905321234567@c.us)
        "905329998877@c.us"  // BURAYA DİĞER NUMARAYI YAZ
    ];

    // SİSTEM BAĞLANDIĞI AN GİDECEK DENEME MESAJI
    for (let numara of numaralar) {
        try {
            await client.sendMessage(numara, "🤖 Merhaba! Bu bir test mesajıdır. Bot şu an başarıyla kuruldu ve çalışıyor!");
            console.log(`✅ ${numara} numarasına test mesajı iletildi.`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5 saniye bekle
        } catch (error) {
            console.error(`❌ Hata: ${numara}`, error);
        }
    }

    // ASIL CUMA GÜNÜ ÇALIŞACAK ZAMANLAYICI (Türkiye Saati ile Cuma 10:00)
    cron.schedule('0 10 * * 5', async () => {
        console.log('Cuma mesajları gönderiliyor...');
        const cuma_mesaji = "Hayırlı Cumalar! Umarım harika bir gün geçirirsin. 🌹";

        for (let numara of numaralar) {
            try {
                await client.sendMessage(numara, cuma_mesaji);
                console.log(`✅ ${numara} numarasına Cuma mesajı iletildi.`);
                await new Promise(resolve => setTimeout(resolve, 10000));
            } catch (error) {
                console.error(`❌ Hata: ${numara}`, error);
            }
        }
    }, {
        scheduled: true,
        timezone: "Europe/Istanbul"
    });
});

client.initialize();