import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS ayarları (Farklı cihazlardan erişim için bazen gerekir)
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ error: "Sadece GET istekleri kabul edilir." });
  }

  // Frontend'den gelen ?userId=... değerini alıyoruz
  const { userId } = req.query;

  if (!userId || userId === "null") {
    return res
      .status(400)
      .json({ error: "Geçerli bir userId parametresi bulunamadı." });
  }

  try {
    const { data, error } = await supabase
      .from("adventures")
      .select("*")
      .eq("user_id", userId) // Filtreleme
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase Hatası:", error.message);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data || []);
  } catch (error: any) {
    console.error("Beklenmedik Hata:", error.message);
    return res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
}
