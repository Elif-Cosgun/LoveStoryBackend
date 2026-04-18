// api/index.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Şifreler Vercel panelinden (Environment Variables) güvenli bir şekilde çekilecek
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string; // Tam yetkili şifre!
const geminiKey = process.env.GEMINI_API_KEY as string;

// Supabase ve Gemini motorlarımızı başlatıyoruz
const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Sadece POST isteklerine (veri gönderme) izin veriyoruz
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ message: "Sadece POST istekleri kabul edilir." });
  }

  const { action, payload } = req.body;

  try {
    // Mobil uygulamadan gelen isteğin türüne göre işlem yapacağız
    if (action === "START_ROMANCE") {
      // Burada ileride Gemini ile aşk hikayesini başlatacağız
      return res
        .status(200)
        .json({ success: true, message: "Aşk hikayesi backend'i ayakta!" });
    }

    // Bilinmeyen bir istek gelirse
    res.status(400).json({ error: "Bilinmeyen işlem türü" });
  } catch (error: any) {
    console.error("Backend Hatası:", error);
    res.status(500).json({ error: error.message });
  }
}
