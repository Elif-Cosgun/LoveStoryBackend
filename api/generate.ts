import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const openaiKey = process.env.OPENAI_API_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

export default async function handler(req: any, res: any) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  const { theme, choice, history, duration, adventureId, userId } = req.body;
  if (!userId || userId === "null")
    return res.status(400).json({ error: "Kullanıcı ID gerekli." });

  const currentStep = history ? history.length + 1 : 1;
  const targetSteps = duration === "short" ? 3 : duration === "long" ? 8 : 5;
  const fullContext =
    history && history.length > 0
      ? history.join("\n--- SONRAKİ ADIM ---\n")
      : "Başlangıç.";

  const prompt = `
    Sen modern romantik dram ve Jane Austen derinliğinde usta bir yazarsın. 
    Hikayeyi yazarken karakterlerin duygularını, iç çatışmalarını ve ilişkilerini derinlemesine keşfet.
    Her adımda hikayeyi ilerlet, yeni bir gelişme, yeni bir duygu, yeni bir mekan veya yeni bir karakter ekle. 
    Mantıklı ve sürükleyici bir hikaye oluştur, aynı mekanda ve duyguda takılıp kalma.
    Sunulan seçenekler de hikayeyi ilerletmeli, birbirinden farklı duygular ve sonuçlar içermeli.
    Hikayedeki kararkterler aynı kişiden devam ediyorsa hep onu aynı kişi olarak seslendir ve görüntüsünü de aynı şekilde oluştur. Eğer yeni bir karakter gelirse ona uygun yeni bir ses ve görsel oluştur.
    ADIMLARIN SONUNA GELDİĞİNDE HİKAYEYİ MUTLU SONLA MI BİTİRCEKSİN YOKSA TRAJİK BİR SONLA MI BİTİRCEKSİN KARAR VER VE ONA GÖRE HİKAYEYİ ŞEKİLLENDİR. Eğer ADIM >= ${targetSteps} ise kesinlikle "isEnd": true yap ve hikayeyi endType: "good" veya "bad" olarak bitir.
    Hikayede bir mekan, obje veya kişi geçtiyse ve başka sahnede de aynı mekan, obje veya kişi varsa bunların görsel ve ses özellikleri aynı olmalı. Örneğin hikayede "gül" objesi geçtiyse ve sonraki adımlarda da "gül" objesi geçerse her seferinde aynı görsel ve aynı ses tonu kullanılmalı. Eğer yeni bir karakter gelirse ona uygun yeni bir ses ve görsel oluştur.
    Hikayede bazı kritik noktalar olmalı, örneğin karakterlerin birbirlerine itiraf ettikleri duygular, büyük sürprizler, önemli karar anları gibi. Bu kritik noktalarda hikaye beklenmedik bir şekilde ilerlemeli ve okuyucunun ilgisini yüksek tutmalı.
    Kritik anlarda oyuncuya kritik seçimler sun. Bu kritik seçimler hikayenin gidişatını büyük ölçüde değiştirebilmeli ve farklı sonuçlara yol açabilmeli. Örneğin karakterlerden biri diğerine aşkını itiraf edebilir veya büyük bir sırrı ortaya çıkarabilir, bu tür anlarda oyuncuya önemli seçimler sun.
    Hikaye tekdüzelikten uzak olsun. Sadece iki karakter arasınnda geçmesin başka karakterler de dahil olabilir. Örneğin karakterlerin arkadaşları veya aile üyeleri hikayeye dahil olabilir ve hikayeyi zenginleştirebilir ama hikaye çok fazla karakterle de kalabalıklaşmasın. Her yeni karakter hikayeye anlamlı bir katkı sağlamalı.
    Hikayeyi yazarken karakterlerin duygularını, iç çatışmalarını ve ilişkilerini derinlemesine keşfet. Karakterlerin birbirlerine karşı hissettikleri duyguları detaylı bir şekilde anlat. Örneğin karakterlerden biri diğerine karşı derin bir aşk besliyor olabilir ama bunu itiraf etmekte zorlanıyor olabilir, bu tür durumlarda karakterlerin iç dünyasını ve duygusal çatışmalarını detaylı bir şekilde anlat.
    TEMA: ${theme} | ADIM: ${currentStep}/${targetSteps} | SON SEÇİM: ${choice || "Başlangıç"}

    ### KESİN SESLENDİRME VE PARÇALAMA KURALI:
    "parts" dizisini oluştururken metni atomik parçalara bölmelisin:
    1. Tırnak içindeki diyaloglar ("...") ve tırnak dışındaki anlatımlar ASLA aynı parça içinde olamaz.
    2. "Merhaba," dedi ve gülümsedi. cümlesini tam olarak şu şekilde böl:
       - {"text": "\\"Merhaba,\\"", "voiceType": "man_charming"}
       - {"text": "dedi ve gülümsedi.", "voiceType": "narrator"}
    3. Diyalog bittiği an (virgül olsa dahi) yeni bir parça aç ve "narrator" sesine dön.

    ### HİKAYE VE SEÇENEK KURALLARI:
    - Seçeneklerin başına ASLA "Cesur:", "Utangaç:" gibi etiketler yazma. Sadece metni yaz.
    - Hikaye sürekli ilerlemeli, aynı mekanda ve duyguda takılıp kalma. Her adımda yeni bir gelişme, yeni bir duygu, yeni bir mekan veya yeni bir karakter eklemeye çalış.
    - Eğer ADIM >= ${targetSteps} ise kesinlikle "isEnd": true yap ve hikayeyi endType: "good" veya "bad" olarak bitir.

    ### SES KADROSU:
    narrator (dış ses), man_charming (genç erkek), man_deep (olgun erkek), woman_sweet (genç kadın), woman_mature (olgun kadın), rival (soğuk karakter).

    JSON FORMATI:
    {
      "parts": [ {"text": "...", "voiceType": "..."} ],
      "options": ["Seçenek 1", "Seçenek 2", "Seçenek 3", "Seçenek 4"],
      "imagePrompt": "English cinematic digital art prompt...",
      "isEnd": false,
      "endType": "none"
    }
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    let finalImageUrl = "https://via.placeholder.com/1024x1024?text=Love+Story";
    try {
      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: `In a beautiful, romantic cinematic lighting style, high quality digital art, ${result.imagePrompt}`,
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
      theme,
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
