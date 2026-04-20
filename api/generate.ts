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

  // 1. ADIM SAYACI VE HEDEF BELİRLEME
  const currentStep = history ? history.length + 1 : 1;
  let targetSteps = 5; // Orta (Default)
  if (duration === "short") targetSteps = 3;
  if (duration === "long") targetSteps = 8;

  const fullContext =
    history && history.length > 0
      ? history.join("\n--- SONRAKİ ADIM ---\n")
      : "Hikayenin başlangıcı.";

  const prompt = `
    ### SENİN KİMLİĞİN:
    Sen Jane Austen derinliğine ve modern romantik dram ustalığına sahip, dünya çapında ödüllü bir aşk romanı yazarısın. Karakter tahlillerin sarsıcı, betimlemelerin ise okuyucuyu o ana hapsedecek kadar canlı olmalı.

    ### HİKAYE BAĞLAMI:
    - Orijinal Tema: ${theme}
    - Şu Anki Aşama: ${currentStep}. Adım (Hedeflenen final adımı: ${targetSteps})
    - Geçmişte Yaşananlar: ${fullContext}
    - Oyuncunun Son Seçimi: ${choice || "Hikayeye başla"}

    ### KURAL 1: MANTIKLI İLERLEME VE TEKRAR YASAĞI (ÇOK KRİTİK)
    - Hikaye ASLA yerinde saymamalı. Karakterler her adımda aynı şeyi söyleyip aynı mekanda durmamalı.
    - Her seçimde zaman ilerlemeli, mekan değişmeli veya hikayenin dengesini değiştirecek yeni bir olay/karakter/sır ortaya çıkmalıdır.

    ### KURAL 2: SEÇENEK KURALLARI (ETİKET KESİNLİKLE YASAK)
    - Oyuncuya her zaman 4 seçenek sun: 1) Cesur/Tutkulu, 2) Utangaç/Duygusal, 3) Mantıklı/Şüpheci, 4) Dramatik/Esprili.
    - DİKKAT: Seçeneklerin başına ASLA "Cesur:", "Flörtöz:", "Seçenek 1:" gibi etiketler yazma! Sadece yapılacak eylemi veya söylenecek cümleyi düz bir metin olarak yaz.
    - EĞER hikaye bitiyorsa (isEnd: true), seçenekleri ["Ana Menüye Dön", "Başa Sar", "Farklı Bir Son Dene", "Yeniden Oyna"] yap.

    ### KURAL 3: DİYALOG VE SESLENDİRME AYRIMI (SES HATASINI ÇÖZEN KURAL)
    - Karakterlerin konuşmalarını DAİMA tırnak içinde ("...") yaz.
    - **KESİN KURAL:** Bir "parts" objesi içinde ASLA hem tırnak içi diyalog hem de anlatım (örn: "dedi ve gülümsedi") BİR ARADA bulunamaz.
    - Konuşma bittiği an (tırnak kapandığı an), virgülden sonrası veya devamındaki anlatım için HEMEN YENİ BİR PART aç ve "voiceType": "narrator" yap.
    - Ses Kadrosu (VoiceTypes):
      * "narrator": Olay anlatımı, iç ses ve betimlemeler.
      * "man_charming": Genç, çekici, romantik başrol erkek.
      * "man_deep": Olgun, otoriter, ciddi veya bilge erkek.
      * "woman_sweet": Genç, tatlı, duygusal başrol kadın.
      * "woman_mature": Olgun, zarif, otoriter veya rakip kadın.
      * "rival": Kibirli, soğuk veya kötü niyetli rakip karakterler.

    ### KURAL 4: ZENGİN VE ÇEŞİTLİ FİNALLER (isEnd ve endType)
    - Eğer "Şu Anki Aşama" >= ${targetSteps} ise hikayeyi ÇARPICI BİR FİNALE bağla ve "isEnd": true yap.
    - Finaller tek düze olmamalı. 
    - MUTLU SONLAR ("good"): İmkansız aşkın zaferi, yağmur altında itiraf, yıllar sonra gelen kavuşma, her şeyi bırakıp kaçma.
    - KÖTÜ/HÜZÜNLÜ SONLAR ("bad"): Büyük ihanet, gurur yüzünden ayrılık, sadece arkadaş kalma, acı gerçeklerin ortaya çıkması, toksik bağın kopuşu.
    - Hikayenin gidişatına göre en mantıklı ve duygusal sonu sen seç.

    ### KURAL 5: GÖRSEL VE DİL KURALLARI
    - imagePrompt İNGİLİZCE olmalı. Karakterlerin fiziksel özelliklerini (saç, göz rengi vb.) hikaye boyunca koru.
    - Cinsel içerik (NSFW) KESİNLİKLE YASAKTIR. Sadece duygusal yoğunluk kullan.

    ### JSON FORMATI (BU YAPIYI ASLA BOZMA):
    {
      "parts": [ 
        { "text": "Ona doğru bir adım attı ve elini kalbine koydu.", "voiceType": "narrator" },
        { "text": "\\"Seni bir an bile unutamadım.\\"", "voiceType": "man_charming" },
        { "text": "diyerek fısıldadı, gözlerinden bir damla yaş süzülürken.", "voiceType": "narrator" }
      ],
      "options": ["Gözyaşlarını sil ve ona sarıl.", "Ona inanmadığını söyle.", "Sessizce oradan uzaklaş.", "Seni hala sevdiğimi biliyorsun de."],
      "imagePrompt": "A highly detailed, romantic cinematic digital painting, soft moonlight, emotional faces, 8k resolution...",
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

    // GÖRSEL ÜRETİMİ
    let finalImageUrl =
      "https://via.placeholder.com/1024x1024?text=Romantik+Sahne";
    try {
      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: `In a beautiful, romantic, vibrant cinematic lighting style, high quality digital art, ${result.imagePrompt}`,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      });
      finalImageUrl = imageResponse.data[0].url;
    } catch (imgErr) {
      console.error("Görsel Üretim Hatası:", imgErr);
    }

    // GEÇMİŞ GÜNCELLEME
    const isResume = choice && choice.includes("[RESUME]");
    let updatedHistory = history || [];
    if (!isResume && choice && choice !== "Başlangıç")
      updatedHistory = [...updatedHistory, choice];

    const combinedText = result.parts?.map((p: any) => p.text).join(" ") || "";

    // VERİTABANI İŞLEMLERİ (UPSERT)
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
      // Mevcut hikayeyi güncelle (Yeni satır açmaz)
      await supabase.from("adventures").update(dbData).eq("id", parsedId);
    } else {
      // İlk defa kaydediyorsa yeni satır aç ve ID al
      const { data: newData } = await supabase
        .from("adventures")
        .insert([dbData])
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
    console.error("Vercel API Hatası:", error);
    return res.status(500).json({ error: error.message });
  }
}
