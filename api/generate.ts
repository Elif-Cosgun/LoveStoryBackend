import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const openaiKey = process.env.OPENAI_API_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

export default async function handler(req: any, res: any) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Sadece POST isteği atılabilir." });

  const { theme, choice, history, inventory, duration, adventureId, userId } =
    req.body;

  if (!userId || userId === "null") {
    return res.status(400).json({ error: "Kullanıcı ID gerekli." });
  }

  const fullContext =
    history && history.length > 0
      ? history.join("\n--- SONRAKİ ADIM ---\n")
      : "Hikayenin başlangıcı.";

  const prompt = `
    Sen Jane Austen ve modern romantik dram tarzında usta bir aşk romanı yazarısın. 
    TEMA: ${theme}
    GEÇMİŞ: ${fullContext}
    SEÇİM: ${choice || "Başlangıç"}
    TEMPO: ${duration}
    
    KURAL: 4 seçenek sun. Cinsel içerik kesinlikle yasaktır, romantizmde kal. Karakterlerin fiziksel özelliklerini hikaye boyunca koru. 
    JSON FORMATI:
    {
      "parts": [ { "text": "Metin...", "voiceType": "narrator_soft" } ],
      "options": ["seçenek 1", "seçenek 2", "seçenek 3", "seçenek 4"],
      "imagePrompt": "A highly detailed, romantic cinematic digital painting of...",
      "isEnd": false,
      "endType": "none"
    }
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.85,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    let finalImageUrl =
      "https://via.placeholder.com/1024x1024?text=Romantik+Sahne";
    try {
      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: `In a beautiful, romantic, vibrant cinematic lighting style, high quality digital art, romantic atmosphere, ${result.imagePrompt}`,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      });
      finalImageUrl = imageResponse.data[0].url;
    } catch (imgErr) {}

    const isResume = choice && choice.includes("[RESUME]");
    let updatedHistory = history || [];
    if (!isResume && choice && choice !== "Başlangıç")
      updatedHistory = [...updatedHistory, choice];
    const combinedText = result.parts?.map((p: any) => p.text).join(" ") || "";

    const upsertData = {
      theme: theme,
      history: updatedHistory,
      is_completed: result.isEnd === true,
      final_text: result.isEnd ? combinedText : "",
      user_id: userId,
    };

    // ID YÖNETİMİ (KESİN ÇÖZÜM)
    let parsedId =
      adventureId && adventureId !== "null" && adventureId !== "undefined"
        ? adventureId
        : null;

    if (parsedId) {
      // Eğer ID varsa ASLA yeni satır ekleme, SADECE GÜNCELLE
      await supabase.from("adventures").update(upsertData).eq("id", parsedId);
    } else {
      // Eğer ID yoksa yeni satır ekle ve ID'yi geri döndür
      const { data: newData } = await supabase
        .from("adventures")
        .insert([upsertData])
        .select();
      if (newData && newData.length > 0) parsedId = newData[0].id;
    }

    return res
      .status(200)
      .json({
        ...result,
        text: combinedText,
        imageUrl: finalImageUrl,
        adventureId: parsedId,
      });
  } catch (error: any) {
    if (error.status === 401)
      return res.status(401).json({ error: "OpenAI Hatası." });
    return res.status(500).json({ error: error.message });
  }
}
