const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const express = require('express');

// Render'ın kapanmaması için sahte bir web sunucusu
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Cuma Botu Çalışıyor!'));
app.listen(port, () => console.log(`Web sunucusu ${port} portunda devrede.`));

// WhatsApp Ayarları
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', (qr) => {
    console.log('LÜTFEN BU QR KODU OKUTUN:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp bağlandı! Sistem Cuma gününü bekliyor...');

    // Her Cuma saat 10:00'da çalışır
    cron.schedule('0 10 * * 5', async () => {
        console.log('Mesajlar gönderiliyor...');

        const numaralar = [
            "905438559321@c.us", 
            "905523708393@c.us"
        ];

        const cuma_mesaji = "Hayırlı Cumalar! Umarım harika bir gün geçirirsin. 🌹";

        for (let numara of numaralar) {
            try {
                await client.sendMessage(numara, cuma_mesaji);
                console.log(`✅ ${numara} numarasına iletildi.`);
                await new Promise(resolve => setTimeout(resolve, 10000)); // 10 saniye bekle
            } catch (error) {
                console.error(`❌ Hata: ${numara}`, error);
            }
        }
    });
});

client.initialize();