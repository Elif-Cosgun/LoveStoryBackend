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
    return res
      .status(400)
      .json({ error: "Geçerli bir kullanıcı kimliği (userId) gerekli." });
  }

  const fullContext =
    history && history.length > 0
      ? history.join("\n--- SONRAKİ ADIM ---\n")
      : "Romantik hikayenin başlangıcı.";

  const prompt = `
    ### SENİN KİMLİĞİN VE ÜSLUBUN:
    Sen Jane Austen tarzında usta bir aşk romanı yazarısın. Oyuncuyu duygusal ve romantik bir atmosfere hapsetmelisin.

    ### BAĞLAM:
    - ANA TEMA: ${theme}
    - ŞİMDİYE KADAR YAŞANANLAR: ${fullContext}
    - SON SEÇİM: ${choice || "Başlangıç"}
    - TEMPO: ${duration}

    ### KURAL 1: PARÇALI SESLENDİRME (DİYALOG):
    - Karakter konuşmaları tırnak (" ") içinde, anlatım tırnak dışında olmalı.
    - Anlatıcı için: "narrator", Kadın karakter için: "woman", Erkek karakter için: "guide", Kötü karakter için "enemy".
    - ŞİMDİLİK ANLIK SES EFEKTİ KULLANILMAYACAK ("sfx" alanı hep boş/null kalacak).
    
    ### KURAL 2: SEÇENEKLER VE FİNAL:
    - DAİMA tam olarak 4 farklı romantik/duygusal seçenek sun.
    - Hikaye sonlandığında "isEnd": true olmalı. Mutlu son "good", kötü son "bad" olmalı.

    ### KURAL 3: JSON FORMATI:
    - Cevabın SADECE bu JSON formatında olmalı:
    {
      "parts": [
        { "text": "Metin...", "voiceType": "narrator", "sfx": null }
      ],
      "ambient": "romantic",
      "options": ["seçenek 1", "seçenek 2", "seçenek 3", "seçenek 4"],
      "inventory": [],
      "isPanic": false,
      "imagePrompt": "A romantic digital painting of...",
      "isEnd": false,
      "endType": "good"
    }
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // GPT-4o yerine mini deniyoruz, bakiye dostudur.
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.85,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    // Görsel Üretimi (DALL-E 3)
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
      history: updatedHistory,
      is_completed: result.isEnd || false,
      final_text: result.isEnd ? combinedText : "",
      user_id: userId,
    };
    let finalAdventureId = adventureId;

    if (adventureId) {
      await supabase
        .from("adventures")
        .update(upsertData)
        .eq("id", adventureId);
    } else {
      const { data: newData } = await supabase
        .from("adventures")
        .insert([{ theme, ...upsertData }])
        .select();
      if (newData && newData.length > 0) finalAdventureId = newData[0].id;
    }

    return res
      .status(200)
      .json({
        ...result,
        text: combinedText,
        imageUrl: finalImageUrl,
        adventureId: finalAdventureId,
      });
  } catch (error: any) {
    console.error("Vercel Hatası:", error);
    // Eğer OpenAI 401 verirse bunu spesifik olarak bildiriyoruz
    if (error.status === 401) {
      return res
        .status(401)
        .json({ error: "OpenAI API Anahtarı geçersiz veya bakiye yetersiz." });
    }
    return res.status(500).json({ error: error.message });
  }
}
