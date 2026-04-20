const sanitizeForUrl = (text: string): string => {
  if (!text) return "romantic+atmosphere";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "+");
};

export const fetchStoryStep = async (
  theme: string,
  choice: string | null,
  history: string[] = [],
  inventory: string[] = [],
  duration: string,
  adventureId?: string | null,
  userId?: string | null,
) => {
  try {
    // VERCEL LINKIN BURADA
    const response = await fetch(
      "https://love-story-backend-six.vercel.app/api/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme,
          choice,
          history,
          inventory,
          duration,
          adventureId,
          userId,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Vercel'den Gelen Hata:", errorText);
      throw new Error(`Sunucu hatası: ${response.status}`);
    }

    const data = await response.json();
    if (data.imagePrompt) data.imagePrompt = sanitizeForUrl(data.imagePrompt);

    return data;
  } catch (error) {
    console.error("Bağlantı Hatası:", error);
    return {
      text: "Zaman aniden durdu, aranızdaki büyü bozuldu... (İnternet veya Sunucu hatası).",
      options: ["Gözlerine Tekrar Bak (Tekrar Dene)"],
      isEnd: false,
    };
  }
};
