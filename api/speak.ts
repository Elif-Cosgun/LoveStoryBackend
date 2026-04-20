export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Sadece POST isteği atılabilir." });

  const { text, voiceType } = req.body;
  const cleanText = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  const API_KEY = process.env.ELEVENLABS_API_KEY;

  if (!API_KEY) return res.status(500).json({ error: "API Key eksik." });

  const VOICES = {
    narrator: "pFZP5JQG7iQjIQuC4Bku", // Sakin dış ses
    man_charming: "Ongxzjm6NAJamxlPiP4z", // Çekici erkek
    man_deep: "Ongxzjm6NAJamxlPiP4z", // Olgun erkek
    woman_sweet: "pPdl9cQBQq4p6mRkZy2Z", // Tatlı kadın
    woman_mature: "54Cze5LrTSyLgbO6Fhlc", // Olgun/Rakip kadın
    rival: "qA5SHJ9UjGlW2QwXWR7w", // Soğuk erkek rakip
  };

  const voiceId = VOICES[voiceType] || VOICES.narrator;

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

    if (!response.ok) throw new Error("ElevenLabs API hatası");

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return res.status(200).json({ audioContent: buffer.toString("base64") });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
