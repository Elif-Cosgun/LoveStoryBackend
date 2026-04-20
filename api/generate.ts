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

  console.log("-> YENİ HİKAYE İSTEĞİ | ID:", adventureId, "| USER:", userId);

  if (!userId || userId === "null") {
    return res.status(400).json({ error: "Kullanıcı ID gerekli." });
  }

  // ADIM SAYACI VE FİNAL KONTROLÜ
  const currentStep = history ? history.length + 1 : 1;
  let targetSteps = 5; // Varsayılan orta
  if (duration === "short") targetSteps = 3;
  if (duration === "long") targetSteps = 8;

  const fullContext =
    history && history.length > 0
      ? history.join("\n--- SONRAKİ ADIM ---\n")
      : "Hikayenin başlangıcı.";

  const prompt = `
    ### KİMLİK VE ÜSLUP:
    Sen Jane Austen derinliğine ve modern romantik dram ustalığına sahip, ödüllü bir aşk romanı yazarısın.
    
    ### MEVCUT DURUM:
    - Orijinal Tema: ${theme}
    - Şu Anki Aşama: ${currentStep}. Adım (Hedeflenen final adımı: ${targetSteps})
    - Geçmişte Yaşananlar: ${fullContext}
    - Oyuncunun Son Seçimi: ${choice || "Hikayeye başla"}

    ### KURAL 1: MANTIKLI İLERLEME VE TEKRAR YASAĞI (ÇOK ÖNEMLİ)
    - Hikaye ASLA yerinde saymamalı. Karakterler sürekli aynı duyguyu yaşamasın, aynı mekanda takılıp kalmasın. 
    - Oyuncunun seçimine göre her adımda zaman ilerlemeli, mekan değişmeli, bir sır ortaya çıkmalı veya yeni bir duygusal eşik aşılmalıdır.

    ### KURAL 2: SEÇENEKLER (4 FARKLI YAKLAŞIM)
    - Oyuncuya DAİMA 4 farklı karakter özelliği yansıtan seçenek sun. (Örn: Cesur, Utangaç, Mantıklı, Dramatik).
    - DİKKAT: Seçeneklerin başına ASLA "Flörtöz:", "Utangaç:" gibi etiketler YAZMA! Sadece oyuncunun yapacağı eylemi veya söyleyeceği sözü düz bir şekilde yaz.
    - Seçenekler hikayenin yönünü gerçekten değiştirmelidir.
    - EĞER hikaye bitiyorsa (isEnd: true), "options": ["Ana Menüye Dön", "Başa Sar", "Farklı Bir Son Dene", "Yeniden Oyna"] yap.

    ### KURAL 3: ZENGİN VE ÇARPICI FİNALLER (isEnd ve endType)
    - Eğer "Şu Anki Aşama", hedeflenen adıma (${targetSteps}) eşit veya daha büyükse, hikayeyi ÇARPICI BİR FİNALE bağla ve KESİNLİKLE "isEnd": true yap.
    - MUTLU SONLAR ("endType": "good"): Büyük ve tutkulu bir itiraf, yıllar sonra gelen evlilik teklifi, imkansızın aşılması, her şeyi geride bırakıp kaçma, ruh eşini bulma hissi, yağmur altında kavuşma vb.
    - KÖTÜ/HÜZÜNLÜ SONLAR ("endType": "bad"): Büyük bir yalanın/sırrın ortaya çıkması, aldatılma, yanlış anlaşılma yüzünden ebedi ayrılık, sadece arkadaş kalma, gururun aşka galip gelmesi, mantık evliliği yapıp mutsuz olma, toksik bağın koparılması vb.
    - Hikaye gidişatına göre adaletli ve mantıklı bir son seç. Çok fazla olumlu ve olumsuz varyasyon kullan, hep aynı finalleri yazma.

    ### KURAL 4: SESLENDİRME VE DİYALOG AYRIMI (ÇOK ÖNEMLİ)
    - Karakterlerin karşılıklı konuşmalarını KESİNLİKLE tırnak içinde ("...") yaz.
    - Olay anlatımı ve konuşmaları "parts" dizisinde AYIR.
    - SADECE şu voiceType'ları kullan: 
      * "narrator" (Olay anlatımı / Dış ses)
      * "man_charming" (Çekici, genç, romantik erkek başrol)
      * "man_deep" (Ciddi, olgun, gizemli erkek)
      * "woman_sweet" (Tatlı, duygusal kadın başrol)
      * "woman_mature" (Olgun, otoriter, rakip kadın)
      * "rival" (Soğuk, kötü niyetli, kibirli rakip)
    
    ### KURAL 5: GÖRSEL TUTARLILIK
    - imagePrompt İNGİLİZCE yazılmalıdır. Karakterlerin fiziksel özelliklerini hikaye boyunca koru (Örn: blonde hair, green eyes).
    - Cinsel içerik (NSFW) KESİNLİKLE YASAKTIR. Sadece duygusal yoğunluk ve romantizm kullan.

    ### JSON FORMATI (SADECE BUNA UY):
    {
      "parts": [ 
        { "text": "Ona doğru bir adım attı ve gözlerinin içine baktı.", "voiceType": "narrator" },
        { "text": "\\"Senden vazgeçmeyeceğim.\\"", "voiceType": "man_charming" }
      ],
      "options": ["Gülümse ve elini tut.", "Arkanı dönüp git.", "Sessizce gözlerine bak.", "Ona kızgın olduğunu söyle."],
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
    } catch (imgErr) {
      console.error("-> GÖRSEL ÜRETİM HATASI:", imgErr);
    }

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

    // GÜÇLENDİRİLMİŞ ÇİFT KAYIT ENGELLEYİCİ (UPSERT MANTIĞI)
    if (parsedId) {
      const { error: updateError } = await supabase
        .from("adventures")
        .update(dbData)
        .eq("id", parsedId);
      if (updateError) console.error("-> DB GÜNCELLEME HATASI:", updateError);
    } else {
      const { data: newData, error: insertError } = await supabase
        .from("adventures")
        .insert([dbData])
        .select();
      if (insertError) console.error("-> DB YENİ KAYIT HATASI:", insertError);
      if (newData && newData.length > 0) parsedId = newData[0].id;
    }

    console.log("-> BAŞARILI CEVAP DÖNDÜ, ID:", parsedId);
    return res.status(200).json({
      ...result,
      text: combinedText,
      imageUrl: finalImageUrl,
      adventureId: parsedId,
    });
  } catch (error: any) {
    console.error("-> GENEL SUNUCU HATASI:", error);
    return res.status(500).json({ error: error.message });
  }
}
