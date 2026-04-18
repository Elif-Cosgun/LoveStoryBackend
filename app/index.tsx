import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import OpenAI from "openai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Şifreleri fonksiyonun içinde çekiyoruz
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Hata ayıklama modumuz: Eğer GET isteği atarsan şifrelerin durumunu görürsün
  if (req.method === "GET") {
    return res.status(200).json({
      status: "Sistem Mesajı",
      supabaseUrl: supabaseUrl ? "Tanimli ✅" : "EKSIK ❌",
      supabaseKey: supabaseKey ? "Tanimli ✅" : "EKSIK ❌",
      openaiKey: openaiKey ? "Tanimli ✅" : "EKSIK ❌",
    });
  }

  // Şifre kontrolü
  if (!supabaseUrl || !supabaseKey) {
    return res
      .status(200)
      .json({
        error:
          "Sistemde eksik anahtarlar var. Lütfen Vercel panelini kontrol et.",
      });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey || "" });

    const { action } = req.body;

    if (action === "START_ROMANCE") {
      return res.status(200).json({
        success: true,
        message: "OpenAI ve Supabase hazir! Ask hikayesi basliyor...",
      });
    }

    return res
      .status(200)
      .json({ message: "Post istegi basarili ama aksiyon tanimsiz." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
