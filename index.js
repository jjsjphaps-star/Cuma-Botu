const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const cron = require('node-cron');
const express = require('express');

const app = express();
const port = process.env.PORT || 10000;

let qrCodeUrl = "";
let statusMessage = "Sistem başlatılıyor...";

// Web Sitesi Arayüzü
app.get('/', (req, res) => {
    if (qrCodeUrl) {
        res.send(`
            <html>
            <head><title>Cuma Botu</title><meta charset="utf-8"></head>
            <body style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                <h2>Lütfen WhatsApp'tan cihaz bağla diyerek kodu okutun:</h2>
                <img src="${qrCodeUrl}" alt="QR Kod" style="width: 300px; height: 300px; border: 2px solid #ccc; padding: 10px; border-radius: 10px;">
                <p style="color: gray; margin-top: 20px;">Bağlandıktan sonra sayfa otomatik yenilenmez, 10 saniye sonra sayfayı manuel yenileyin.</p>
            </body>
            </html>
        `);
    } else {
        res.send(`<h2 style="text-align: center; margin-top: 50px; font-family: sans-serif;">Durum: ${statusMessage}</h2>`);
    }
});

app.listen(port, () => console.log(`Web sunucusu ${port} portunda devrede.`));

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }), // Terminali temiz tutmak için logları kapatıyoruz
        browser: ["Cuma Botu", "Chrome", "1.0.0"]
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('✅ YENİ QR KOD OLUŞTURULDU! Lütfen web sitesine gidin.');
            qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(qr);
            statusMessage = "QR Kod okutulmayı bekliyor...";
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Bağlantı durumu: Koptu. Yeniden bağlanmalı mı?', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                console.log('WhatsApp cihazlardan çıkış yapıldı.');
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp başarıyla bağlandı! Test mesajları gönderiliyor...');
            qrCodeUrl = "";
            statusMessage = "✅ WhatsApp bağlandı ve bot aktif!";

            const numaralar = [
                "905419755711@s.whatsapp.net", // BURAYA KENDİ NUMARAN
                "905523708393@s.whatsapp.net"  // BURAYA DİĞER NUMARA
            ];

            // BAĞLANIR BAĞLANMAZ GİDECEK TEST MESAJI
            for (let numara of numaralar) {
                try {
                    await sock.sendMessage(numara, { text: '🤖 Merhaba! Bot yeni ve hafif altyapısı ile başarıyla çalışıyor!' });
                    console.log(`✅ ${numara} numarasına test mesajı iletildi.`);
                } catch (error) {
                    console.error(`❌ Hata: ${numara}`, error);
                }
            }

            // HER CUMA SAAT 10:00'DA GİDECEK MESAJ
            cron.schedule('30 21 * * *', async () => {
                console.log('Cuma mesajları gönderiliyor...');
                for (let numara of numaralar) {
                    try {
                        await sock.sendMessage(numara, { text: 'Hayırlı Cumalar! Umarım harika bir gün geçirirsin. 🌹' });
                    } catch (error) {
                        console.error(`❌ Cuma mesajı hatası: ${numara}`, error);
                    }
                }
            }, { timezone: "Europe/Istanbul" });
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();