import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "DELETE") {
    return res
      .status(405)
      .json({ error: "Sadece DELETE istekleri kabul edilir." });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Silinecek macera ID'si gerekli." });
  }

  try {
    const { error } = await supabase.from("adventures").delete().eq("id", id);

    if (error) throw error;

    return res.status(200).json({ success: true, message: "Yazgı silindi." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
