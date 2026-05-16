import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

dotenv.config();

// Initialize Firebase Client SDK for Backend
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.post("/api/telegram/notify", async (req, res) => {
     try {
       const { message, token: reqToken, chatIds: reqChatIds } = req.body;
       
       let botToken = reqToken;
       let targetChatIds = reqChatIds;

       // If not provided by client (which is the case for orders/consultations), fetch from Firestore using Client SDK
       if (!botToken || !targetChatIds) {
         try {
           const tgSnap = await getDoc(doc(db, 'settings', 'telegram'));
           if (tgSnap.exists()) {
             const data = tgSnap.data();
             if (data) {
               botToken = botToken || data.token;
               targetChatIds = targetChatIds || data.chatIds;
             }
           }
         } catch (dbErr) {
           console.error('Failed to fetch TG settings from DB:', dbErr);
         }
       }

       botToken = botToken || process.env.TG_BOT_TOKEN || '8708002341:AAHaRPYWhCR3Hgj6bUUDF-nmy5EMrMTf-LM';
       targetChatIds = targetChatIds || process.env.TG_CHAT_ID || '-1002315682855';
       
       const idArray = String(targetChatIds).split(',').map(id => id.trim()).filter(id => id);
       
       const results = [];
       for (const chatId of idArray) {
         const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             chat_id: chatId,
             text: message,
             parse_mode: 'HTML'
           })
         });
         const data = await response.json();
         results.push({ chatId, ...data });
       }
       
       res.json({ ok: results.every(r => r.ok), results });
     } catch (err: any) {
       res.status(500).json({ error: err.message });
     }
  });

  app.post("/api/telegram/invoice", async (req, res) => {
    try {
      const { title, description, payload, providerToken, currency, prices } = req.body;
      let botToken;
      try {
        const tgSnap = await getDoc(doc(db, 'settings', 'telegram'));
        if (tgSnap.exists()) {
          botToken = tgSnap.data().token;
        }
      } catch (dbErr) {
        console.error('Failed to fetch TG settings:', dbErr);
      }
      botToken = botToken || process.env.TG_BOT_TOKEN || '8708002341:AAHaRPYWhCR3Hgj6bUUDF-nmy5EMrMTf-LM';
      const response = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description, payload, provider_token: providerToken, currency: currency || 'UZS', prices
        })
      });
      const data = await response.json();
      if (data.ok) {
        res.json({ ok: true, link: data.result });
      } else {
        res.status(400).json({ ok: false, error: data.description });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
