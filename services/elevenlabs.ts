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
      const errText = await response.text();
      console.error("Vercel TTS Hatası:", errText); // Gerçek hatayı terminale yazar
      throw new Error("TTS Sunucu Hatası");
    }

    const data = await response.json();

    if (data.audioContent) {
      return `data:audio/mpeg;base64,${data.audioContent}`;
    }
    return null;
  } catch (error) {
    console.error("TTS İşleme Hatası:", error);
    return null;
  }
};
