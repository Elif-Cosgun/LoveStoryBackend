// api/speak.ts
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  const { text, voiceType } = req.body;
  const cleanText = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  const API_KEY = process.env.ELEVENLABS_API_KEY;

  // Yeni Genişletilmiş Ses Kadrosu
  const VOICES = {
    narrator_soft: "pFZP5JQG7iQjIQuC4Bku", // Lily (Hafif, tatlı anlatıcı)
    narrator_dramatic: "oWAxZDx7w5VEj9dCyTzz", // Grace (Derin anlatıcı)
    woman_sweet: "EXAVITQu4vr4xnSDxMaL", // Rachel (Tatlı kadın)
    woman_mature: "MF3mGyEYCl7XYWbV9V6O", // Elli (Olgun kadın)
    man_charming: "TX3OmfQAyNjNbJj7Q6pX", // Josh (Çekici erkek)
    man_deep: "N2lVS1w4EtoT3dr4eOWO", // Callum (Kalın sesli erkek)
    rival: "ErXwobaYiN019PkySvjV", // Antoni (Soğuk/Rakip)
  };

  const voiceId = VOICES[voiceType] || VOICES.narrator_soft;

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "xi-api-key": API_KEY },
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
    return res.status(200).json({ audioContent: buffer.toString("base64") });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
