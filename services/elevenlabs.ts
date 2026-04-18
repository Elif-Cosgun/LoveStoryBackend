export const fetchTTS = async (text: string, voiceType: string) => {
  try {
    const response = await fetch(
      "https://fatal-choice-backend.vercel.app/api/speak",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceType }),
      },
    );

    if (!response.ok) throw new Error("TTS Sunucu Hatası");

    const data = await response.json();

    if (data.audioContent) {
      // Expo-AV için data URI formatına getiriyoruz
      return `data:audio/mpeg;base64,${data.audioContent}`;
    }
    return null;
  } catch (error) {
    console.error("TTS İşleme Hatası:", error);
    return null;
  }
};
