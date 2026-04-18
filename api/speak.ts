// api/speak.ts
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  const { text, voiceType } = req.body;
  // METNİ TEMİZLE: Yeni satırları ve gereksiz boşlukları ElevenLabs'e gitmeden siler
  const cleanText = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  const API_KEY = process.env.ELEVENLABS_API_KEY;

  const VOICES = {
    narrator: "pPPRQGqpCjwl7QI1MoPN", // Ana Anlatıcı
    guide: "Bj9UqZbhQsanLzgalpEG", // Dost/Yoldaş
    enemy: "fZvBgf6KNJW6Lj0v24xJ", // Düşman/Canavar
    woman: "Y0GXpBhnlgAEuKhjPmdn", // Gizemli Kadın
    priest: "imykPM99IzmngsvNRvEw", // Rahip/Bilge
    observer: "0S0t2YQAOXo65bCyAAe0", // Gözlemci
    kid: "2eYP7x6albjyHviibFR5", // Çocuk/Genç Karakter
  };

  const voiceId = VOICES[voiceType] || VOICES.narrator;

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": API_KEY,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    );

    if (!response.ok) throw new Error("ElevenLabs API hatası.");

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // SESİ BASE64'E ÇEVİRİP JSON OLARAK GÖNDERİYORUZ
    const base64Audio = buffer.toString("base64");

    return res.status(200).json({ audioContent: base64Audio });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
