import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// Supabase istemcisini başlatıyoruz
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// OpenAI istemcisini başlatıyoruz
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: any, res: any) {
  // Sadece POST isteklerine izin veriyoruz
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Sadece POST isteği atılabilir." });
  }

  // Frontend'den gelen tüm verileri alıyoruz
  const { theme, choice, history, inventory, duration, adventureId, userId } =
    req.body;

  // --- KRİTİK KONTROL: userId boşsa veritabanına NULL yazılmasını engelle ---
  if (!userId || userId === null || userId === "null") {
    console.error("HATA: Gelen userId geçersiz!", userId);
    return res
      .status(400)
      .json({ error: "Geçerli bir kullanıcı kimliği (userId) gerekli." });
  }

  // Geçmiş hikaye akışını yapay zekaya bağlam olarak sunmak için birleştiriyoruz
  const fullContext =
    history && history.length > 0
      ? history.join("\n--- SONRAKİ ADIM ---\n")
      : "Maceranın başlangıcı.";

  // Yapay zeka için hazırlanan detaylı talimat (Prompt)
  const prompt = `
    ### SENİN KİMLİĞİN VE ÜSLUBUN:
    Sen Edgar Allan Poe ve H.P. Lovecraft tarzında uzman bir gotik korku yazarı, usta bir anlatıcı ve interaktif RPG oyun tasarımcısısın. Oyuncuyu kelimelerinle karanlık bir atmosfere hapsetmelisin.

    ### BAĞLAM VE TAM HAFIZA:
    - ANA TEMA: ${theme}
    - ŞİMDİYE KADAR YAŞANANLARIN TAMAMI: ${fullContext}
    - OYUNCUNUN GİZLİ ENVANTERİ: ${inventory && inventory.length > 0 ? inventory.join(", ") : "Şu an boş."}
    - OYUNCUNUN SON SEÇİMİ: ${choice || "Başlangıç"}
    - SEÇİLEN OYUN SÜRESİ (TEMPO): ${duration}

    ### KURAL 0: GÖRSEL VE MANTIKSAL TUTARLILIK:
    - **Görsel Tutarlılık:** 'imagePrompt' oluştururken, geçmişte betimlediğin bir karakter veya nesne tekrar sahnedeyse, fiziksel özelliklerini bir öncekiyle AYNI betimle. Sahneler arası geçişlerde uyumlu görseller üret. Örneğin, eğer bir karakteri "uzun siyah pelerinli, solgun yüzlü ve derin gözlü" olarak tanımladıysan, sonraki sahnelerde o karakteri tanımlarken bu özellikleri korumalısın.
    - **Mantık:** Geçmişte ölen bir karakteri asla diriltme, girilen bir odayı veya bulunan bir eşyayı asla unutma. Hikaye lineer ve mantıklı ilerlemeli. Aynı zamanda görseller de gotik korku atmosferine uygun olmalı.
    - **Yankı ve Miras:** Oyuncunun geçmişte etkileşime girdiği kadim nesneler, mevcut sahnede 'anahtar' görevi görür. Alınan hatalar fiziksel kalıcı izler (Permanent Scars) bırakır.
    - **Fedakarlık Takası:** Bazı kapılar için oyuncunun fiziksel bir parçasından veya müttefikinden vazgeçmesi gerekebilir. Bunu nadir ve çarpıcı anlarda kullan.
    - **Süreklilik:** Her yeni oyunda farklı senaryo oluştur, yarım kalanlarda aynı senaryodan devam et.
    - **Sana verilen prompt yetersiz ve kısa olsa bile, hikayeyi detaylı, ağır ve atmosferik yap. Verilen bilgileri genişlet, derimleştir ve gotik korku unsurlarıyla süsle. Verilen temayı derinlemesine işle, yüzeysel kalma. Oyuncunun seçimlerini ve geçmişini unutma, hikayeyi bu bağlamda şekillendir.
    - **Oyuncuya verdiğin seçenklerde daima önceki seçimlerini ve envanterini hatırla. Eğer oyuncunun envanterinde kullanabileceği envanter öğeleri varsa bunları seçeneklere dahil et. Seçenekler her zaman oyuncunun önceki seçimleri ve envanterine göre şekillenmeli.
    - **Başlatılan her yeni hikaye birbirinden farklı olmalı. Öncekilerle benzer temalar olabilir ama olay örgüsü, karakterler, ortamlar ve detaylar tamamen yeni ve özgün olmalıdır. Yarım kalan bir hikayede ise aynı senaryodan devam etmek zorunludur. Yani her yeni oyun farklı bir hikaye anlatmalı, ancak oyuncu yarım bıraktığı bir hikayeye geri dönerse tam olarak aynı hikayeden devam etmeli.
    - **Kural: Oyuncuya hikayeyi ilerletmesi için DAİMA tam olarak 4 farklı seçenek sunmalısın. Ne 3 ne 5, kesinlikle 4 seçenek olmalı.
    - **SİSTEM KURALI: Eğer oyuncunun envanterinde işe yarar bir nesne varsa (örneğin anahtar vb.), o an bulunulan mekana ve duruma mantıksal olarak uygunsa, üreteceğin 4 seçenekten en az 1 tanesi kesinlikle bu nesneyi kullanmakla ilgili olmalıdır. Envanterde işe yarar bir nesne yoksa, seçenekler tamamen oyuncunun önceki seçimlerine ve hikayenin akışına göre şekillenmelidir. Ancak envanterde işe yarar bir nesne varsa, bu nesnenin kullanılabileceği en az 1 seçenek mutlaka olmalıdır.
    - **Her hikayede tutarlılık önemlidir. Senaryoyu mantık çerçevesinde ilerletmelisin. Oyuncunun önceki seçimlerini, hikayenin ilerleyişini ve envanterini unutma. Hikayeyi bu bağlamda şekillendir. Verilen temayı derinlemesine işle, yüzeysel kalma. Verilen bilgileri genişlet, derimleştir ve gotik korku unsurlarıyla süsle.

    ### KURAL 1: EDEBİ ANLATIM VE ATMOSFER (DERİN DETAY):
    - Cümlelerin asla kısa ve sığ olmamalı. Betimlemelerin ağır, kasvetli ve duyusal detaylarla dolu olmalı. 
    - Gotik korku unsurlarını her cümlede hissettir. Karakterler konuştuğunda mutlaka tırnak işareti (" ") kullan.

    ### KURAL 2: TEMPO VE SÜRE YÖNETİMİ:
    - **"short"**: Gerilim hemen tırmanmalı ve ilk büyük kırılma noktasında vurucu bir finalle mühürlenmelidir.
    - **"medium"**: Gizemi kur, tehlikeyi kademeli hissettir ve doygunluğa ulaştığında kaderi tayin et.
    - **"long"**: Çok katmanlı bir gizem oluştur. Yan karakterler ve alt sırlar ekle. 

    ### KURAL 3: PARÇALI SESLENDİRME VE DİNAMİK YÖNETİM (ÖNEMLİ):
    - Metni parçalara ayırırken konuşmacının kimliğini (yaş, cinsiyet, otorite) belirle.
    - Karakter diyaloglarını mutlaka tırnak işareti (" ") içinde yaz. Diyalog dışındaki anlatımları tırnak dışına bırak. Ses tipini (voiceType) tırnak içindeki ana karaktere göre belirle.
    1. **Kesin Bölme:** Bir karakterin konuşması başladığı an YENİ bir parça aç. Konuşma bittiği an (tırnak kapandığı an) AYRI bir parça aç ve anlatıcıya (narrator) geri dön.
    2. **Cinsiyet ve Rol Uyumu:** - Eğer karakter KADIN ise (Anne, Elara, Fısıltı vb.): "woman"
       - Eğer karakter YAŞLI/BİLGE ise: "priest"
       - Eğer karakter GENÇ/YARDIMCI ERKEK ise: "guide"
       - Eğer karakter TEHDİTKAR ise: "enemy"
       - Eğer karakter çocuk ise: "kid"
    3. **Hata Yasak:** Karakter konuşması dışındaki her şey (betimleme, ortam tasviri) KESİNLİKLE "narrator" olmalıdır. Konuşma başlamadan ses değiştirmek ağır bir hatadır.
    4. **Eğer ki konuşan kişi daha önce de konuşan karakterse aynı ses tipini kullan. Eğer yeni bir karakter konuşmaya başladıysa yukarıdaki kurallara göre ses tipini belirle.

    ### KURAL 4: GELİŞMİŞ ÇOKLU FİNAL SİSTEMİ:
    - Hikaye sonlandığında "isEnd": true olmalı. Galibiyet (zafer, kurtuluş, sorunu çözme, insanları kurtarma, vb.) ve mağlubiyet varyasyonlarını (delilik, lanetlenme, fedakarlık, ihanet, sakatlık, kurban edilme, yakınını kaybetme, vb.) ağır bedellerle belirle.

    ### KURAL 5: AMBİYANS VE SES EFEKTİ (SFX) YÖNETİMİ:
    - Sahne boyunca arka planda çalacak 'ambient' sesini seç: [tension, whispers, mystic, action, heartbeat].
    - Metin içerisinde belirli bir eylem olduğunda ilgili 'part' için 'sfx' seç: [leaves, door, scream_man, scream_woman, footsteps]. Eğer eylem yoksa boş bırak.
    - 'sfx': ANLIK EFEKTTİR. Eğer metin içerisinde kapı (door), adım (footsteps), yaprak hışırtısı (leaves) veya çığlık (scream_man, scream_woman) geçiyorsa SAKIN UNUTMA, o 'part' için ilgili sfx'i KESİNLİKLE ata. Eylem yoksa "sfx": null yap.

    ### KURAL 6: GİZLİ ENVANTER VE PANİK MODU (YENİ SİSTEM):
    - **Envanter (inventory):** Oyuncu hikaye içinde yeni bir anahtar, silah, not veya önemli bir eşya bulursa bunu JSON içindeki 'inventory' dizisine ekle. Eğer oyuncu eşyayı kullanır, kaybeder veya birine verirse diziden çıkar. Oyuncuya seçenek sunarken envanterindeki eşyaları kullanabilme şansı ver.
    - **Panik Modu (isPanic):** Eğer oyuncunun saniyeler içinde karar vermesi gereken ölümcül, ani veya çok acil bir durum varsa (örn: Canavar saldırıyor, kapı kırılıyor, yüksekten düşüyor) KESİNLİKLE "isPanic": true yap. Aksi halde false yap.

    ### KURAL 7: DİNAMİK VE BAĞLAMSAL MİNİ OYUNLAR (ÖNEMLİ):
    - Hikayenin akışında oyuncunun karşısına fiziksel veya zihinsel zorlu bir engel çıktığında, JSON çıktısına "miniGame" objesini eklemelisin.
    - Sıklık: Mini oyunlar her adımda ÇIKMAMALIDIR (Maksimum %15 ihtimalle, sadece tansiyonun yükseldiği, hikayenin sıkıştığı kritik anlarda sunulmalıdır).

    - MİNİ OYUN TÜRLERİ VE BAĞLAM KURALLARI:
      1. "riddle" (Kadim Fısıltı / Şifre Çözme):
         - Ne Zaman Kullanılır?: Oyuncu eski bir yazıt okumaya çalıştığında, gizemli bir heykelle/varlıkla karşılaştığında, şifreli bir kasa veya parşömen bulduğunda, vb.
         - Bağlam Şartı: Asla sıradan ve rastgele bilmeceler SORMA. Bilmece KESİNLİKLE o anki hikayenin temasına, mekanın tarihine veya peşindeki canavara uygun olmalıdır. Kurguyu desteklemelidir.
         - Format: { "type": "riddle", "question": "Gecenin rahminden doğar, sabahın ilk ışığıyla ölürüm. Kanla beslenir, aynada görünmem. Ben neyim?", "answer": "vampir" } (Cevap daima tek kelime olmalıdır).

      2. "simon" (Karanlık Ritüel / Hafıza):
         - Ne Zaman Kullanılır?: Oyuncu büyülü bir mührü kırmaya çalıştığında, bir tarikatın sembol sırasını taklit etmesi gerektiğinde, doğaüstü bir mekanizmayı/geçidi çalıştırması veya lanetli bir ritüeli durdurması gerektiğinde, vb.
         - Format: { "type": "simon" }

      3. "lockpick" (Kilit Kırma / Refleks):
         - Ne Zaman Kullanılır?: Kilitli bir ahşap kapı, paslı bir demir parmaklık, pranga/kelepçe çözme veya peşindeki canavar yaklaşırken zamanla yarışıp fiziksel/mekanik bir engeli hızla aşması gerektiğinde, vb.
         - Format: { "type": "lockpick" }

    - SEÇENEKLER (OPTIONS) KURALI (ÇOK ÖNEMLİ): 
      - Eğer bir "miniGame" objesi ekliyorsan, "options" dizisinin **İLK SEÇENEĞİ (index 0)** DAİMA oyuncunun bu engelle yüzleşme eylemi olmalıdır. 
      - Örnek Seçenek Setleri: 
        * Kilit için: ["Paslı kilidi maymuncukla zorla", "Kapıyı omuzlayarak kırmaya çalış", "Geri dön"]
        * Ritüel için: ["Rün taşlarına sırasıyla dokun", "Ritüel masasını devir", "Odadan kaç"]
        * Şifre için: ["Zihnini zorla ve şifreyi fısılda", "Yazıtı görmezden gel", "Kitabı yak"]
      - Sistem bu ilk seçeneği otomatik olarak oyunu başlatan özel bir butona çevirecektir. O yüzden ilk seçenek çok mantıklı olmalıdır.

    - SONUÇ İŞLEYİŞİ: Oyuncu bu oyunu oynadıktan sonra sana "[SİSTEM: Oyuncu BAŞARILI/BAŞARISIZ oldu]" şeklinde bir komut gelecek. Bir sonraki hikaye metnini KESİNLİKLE bu sonuca göre şekillendireceksin. Başarılıysa engeli aştır, başarısızsa ağır bir bedel ödet.
   
    ### KURAL 8: TEKNİK ZORUNLULUK (JSON):
    - Cevabın SADECE bu JSON formatında olmalı:
    {
      "parts": [
        { "text": "Metin...", "voiceType": "narrator", "sfx": "door" }
      ],
      "ambient": "tension",
      "options": ["seçenek 1", "seçenek 2", "seçenek 3", "seçenek 4"],
      "inventory": ["esya1"],
      "isPanic": false,
      "imagePrompt": "...",
      "isEnd": false,
      "endType": "good" // SADECE isEnd true ise: "good" (kurtuluş) veya "bad" (ölüm/delilik)
    }
  `;

  try {
    // 1. ADIM: OpenAI GPT-4o ile Metin Üretimi
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.85,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    // --- 🛡️ OTOMATİK SES VE DİYALOG AYRIŞTIRICI (TÜRKÇE KARAKTER DÜZELTMESİ) ---
    if (result.parts && Array.isArray(result.parts)) {
      const finalParts: any[] = [];

      result.parts.forEach((part: any) => {
        const segments = part.text.split(/([\"“].*?[\"”])/g);
        let sfxAssigned = false;

        // Metni tamamen Türkçe kurallarına göre küçük harfe çeviriyoruz
        const fullTextLower = part.text.toLocaleLowerCase("tr-TR");

        segments.forEach((segment: string) => {
          if (!segment || segment.trim() === "") return;

          const currentSfx = !sfxAssigned && part.sfx ? part.sfx : null;
          if (currentSfx) sfxAssigned = true;

          // Eğer segment tırnak içinde başlıyorsa (yani bir karakter konuşuyorsa)
          if (segment.startsWith('"') || segment.startsWith("“")) {
            let detectedVoice = part.voiceType;

            // Eğer AI 'narrator' (anlatıcı) bırakmışsa veya boşsa, metnin içeriğinden tahmin et
            if (detectedVoice === "narrator" || !detectedVoice) {
              // \b yerine boşluk ve noktalama işaretlerini hesaba katan, Türkçe karakterleri tanıyan RegExp
              const isWoman =
                /(?:^|[\s.,!?;:])(kadın|kız|anne|cadı|hemşire|kraliçe|elara|hanım|teyze)(?:[\s.,!?;:]|$)/.test(
                  fullTextLower,
                );
              const isPriest =
                /(?:^|[\s.,!?;:])(yaşlı|rahip|bilge|dede|ihtiyar|adam|baba)(?:[\s.,!?;:]|$)/.test(
                  fullTextLower,
                );
              const isEnemy =
                /(?:^|[\s.,!?;:])(yaratık|canavar|iblis|gölge|düşman|katil|şeytan)(?:[\s.,!?;:]|$)/.test(
                  fullTextLower,
                );
              const isKid =
                /(?:^|[\s.,!?;:])(çocuk|oğlan|ufaklık|bebek)(?:[\s.,!?;:]|$)/.test(
                  fullTextLower,
                );

              if (isWoman) {
                detectedVoice = "woman";
              } else if (isPriest) {
                detectedVoice = "priest";
              } else if (isEnemy) {
                detectedVoice = "enemy";
              } else if (isKid) {
                detectedVoice = "kid";
              } else {
                detectedVoice = "guide"; // Eşleşme bulamazsa varsayılan erkek
              }
            }

            finalParts.push({
              text: segment,
              voiceType: detectedVoice,
              sfx: currentSfx,
            });
          } else {
            // Tırnak dışı her zaman anlatıcıdır
            finalParts.push({
              text: segment,
              voiceType: "narrator",
              sfx: currentSfx,
            });
          }
        });
      });
      result.parts = finalParts;
    }

    // Veritabanı için metni birleştir
    const combinedText = result.parts.map((p: any) => p.text).join(" ");

    // 2. ADIM: DALL-E 3 ile Görsel Üretimi
    let finalImageUrl =
      "https://via.placeholder.com/1024x1024?text=Gorsel+Uretilemedi";
    try {
      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: `In a dark gothic horror oil painting style, highly detailed, eerie, ${result.imagePrompt}`,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      });
      finalImageUrl = imageResponse.data[0].url;
    } catch (imgErr) {
      console.error(
        "Görsel üretilirken hata oluştu, hikaye devam edecek.",
        imgErr,
      );
    }

    // 3. ADIM: Supabase Kayıt
    // Eğer [RESUME] isteği geldiyse (oyuna geri dönüldüyse), yeni history'i kaydetmiyoruz ki mükerrer adım oluşmasın.
    const isResume = choice && choice.includes("[RESUME]");
    let updatedHistory = history || [];

    if (!isResume && choice && choice !== "Başlangıç") {
      updatedHistory = [...updatedHistory, choice];
    }

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
      const { data: newData, error: dbError } = await supabase
        .from("adventures")
        .insert([{ theme, ...upsertData }])
        .select();

      if (!dbError && newData && newData.length > 0) {
        finalAdventureId = newData[0].id;
      }
    }

    return res.status(200).json({
      ...result,
      text: combinedText,
      imageUrl: finalImageUrl,
      adventureId: finalAdventureId,
    });
  } catch (error: any) {
    console.error("Hata Detayı:", error.message);
    return res.status(500).json({ error: "Sunucu tarafında bir hata oluştu." });
  }
}
