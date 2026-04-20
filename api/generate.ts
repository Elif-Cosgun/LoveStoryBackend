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

  const currentStep = history ? history.length + 1 : 1;
  let targetSteps = 5; // Medium varsayılan
  if (duration === "short") targetSteps = 3;
  if (duration === "long") targetSteps = 8;

  const fullContext =
    history && history.length > 0
      ? history.join("\n--- SONRAKİ ADIM ---\n")
      : "Hikayenin başlangıcı.";

  const prompt = `
    ### KİMLİK VE ÜSLUP:
    Sen Jane Austen derinliğine ve modern romantik dram ustalığına sahip bir başyazarsın.
    
    ### MEVCUT DURUM:
    - Orijinal Tema: ${theme}
    - Şu Anki Aşama: ${currentStep}. Adım (Hedeflenen final adımı: ${targetSteps})
    - Geçmişte Yaşananlar: ${fullContext}
    - Oyuncunun Son Seçimi: ${choice || "Hikayeye başla"}

    ### KURAL 1: MANTIKLI İLERLEME VE TEKRAR YASAĞI (ÇOK ÖNEMLİ)
    - Hikaye ASLA yerinde saymamalı. Karakterler sürekli aynı duyguyu yaşamasın, aynı mekanda takılıp kalmasın. 
    - Oyuncunun seçimine göre her adımda zaman ilerlemeli, mekan değişmeli, bir sır ortaya çıkmalı veya yeni bir duygusal eşik aşılmalıdır.

    ### KURAL 2: SEÇENEKLER (4 FARKLI YAKLAŞIM)
    - Oyuncuya DAİMA 4 farklı karakter özelliği yansıtan seçenek sun: 
      1) Cesur/Flörtöz, 2) Utangaç/Çekingen, 3) Şüpheci/Mantıklı, 4) Esprili/Dramatik.
    - Seçenekler hikayenin yönünü gerçekten değiştirmelidir.
    - EĞER hikaye bitiyorsa (isEnd: true), "options": ["Ana Menüye Dön"] yap.

    ### KURAL 3: ZENGİN VE ÇARPICI FİNALLER (isEnd ve endType)
    - Eğer "Şu Anki Aşama", hedeflenen adıma (${targetSteps}) eşit veya daha büyükse, hikayeyi ÇARPICI BİR FİNALE bağla ve KESİNLİKLE "isEnd": true yap.
    - MUTLU SONLAR ("endType": "good"): Büyük ve tutkulu bir itiraf, yıllar sonra gelen evlilik teklifi, imkansızın aşılması, her şeyi geride bırakıp kaçma, ruh eşini bulma hissi vb.
    - KÖTÜ/HÜZÜNLÜ SONLAR ("endType": "bad"): Büyük bir yalanın/sırrın ortaya çıkması, aldatılma, yanlış anlaşılma yüzünden ebedi ayrılık, sadece arkadaş kalma, gururun aşka galip gelmesi, toksik bağın koparılması vb.
    - Hikaye gidişatına göre adaletli ve mantıklı bir son seç.

    ### KURAL 4: SESLENDİRME VE DİYALOG AYRIMI (parts)
    - Diyalogları (" ") ve olay anlatımlarını "parts" dizisinde KESİNLİKLE AYIR.
    - SADECE şu voiceType'ları kullan: 
      * "narrator" (Olay anlatımı / Dış ses)
      * "man_charming" (Çekici, genç, romantik erkek)
      * "man_deep" (Ciddi, olgun, gizemli erkek)
      * "woman_sweet" (Tatlı, duygusal kadın)
      * "woman_mature" (Olgun, otoriter, rakip kadın)
      * "rival" (Soğuk, kötü niyetli, kibirli rakip erkek)
    
    ### KURAL 5: GÖRSEL TUTARLILIK
    - imagePrompt İNGİLİZCE yazılmalıdır. Karakterlerin fiziksel özelliklerini hikaye boyunca koru (Örn: blonde hair, green eyes).
    - Cinsel içerik (NSFW) KESİNLİKLE YASAKTIR.

    ### JSON FORMATI (SADECE BUNA UY):
    {
      "parts": [ 
        { "text": "Ona doğru bir adım attı ve gözlerinin içine baktı.", "voiceType": "narrator" },
        { "text": "Senden vazgeçmeyeceğim.", "voiceType": "man_charming" }
      ],
      "options": ["seçenek 1", "seçenek 2", "seçenek 3", "seçenek 4"],
      "imagePrompt": "A highly detailed, cinematic digital painting of...",
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

    const dbData = {
      theme: theme,
      history: updatedHistory,
      is_completed: result.isEnd === true,
      final_text: result.isEnd ? combinedText : "",
      user_id: userId,
    };

    let parsedId =
      adventureId && adventureId !== "null" && adventureId !== "undefined"
        ? adventureId
        : null;

    if (parsedId) {
      await supabase.from("adventures").update(dbData).eq("id", parsedId);
    } else {
      const { data: newData } = await supabase
        .from("adventures")
        .insert([dbData])
        .select();
      if (newData && newData.length > 0) parsedId = newData[0].id;
    }

    return res.status(200).json({
      ...result,
      text: combinedText,
      imageUrl: finalImageUrl,
      adventureId: parsedId,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
