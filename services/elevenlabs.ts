export const fetchTTS = async (text: string, voiceType: string) => {
  try {
    const response = await fetch(
      "https://love-story-backend-six.vercel.app/api/speak",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceType }),
      },
    );

    if (!response.ok) {
      // Hata verip ekranı çökertmek yerine null dönüyoruz
      console.log("ElevenLabs Kotası dolmuş veya sunucu meşgul.");
      return null;
    }

    const data = await response.json();

    if (data.audioContent) {
      return `data:audio/mpeg;base64,${data.audioContent}`;
    }
    return null;
  } catch (error) {
    console.log("TTS Bağlantı Hatası, sessiz devam ediliyor...");
    return null; // Oyunun çökmesini engeller
  }
};
