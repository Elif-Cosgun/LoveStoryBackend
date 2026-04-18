const sanitizeForUrl = (text: string): string => {
  if (!text) return "dark+eerie+atmosphere";
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
  inventory: string[] = [], // YENİ: Envanter eklendi
  duration: string,
  adventureId?: string | null,
  userId?: string | null,
) => {
  try {
    const response = await fetch(
      "https://fatal-choice-backend.vercel.app/api/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme,
          choice,
          history,
          inventory, // YENİ: inventory backend'e gönderiliyor
          duration,
          adventureId,
          userId,
        }),
      },
    );

    if (!response.ok) throw new Error("Sunucu hatası.");

    const data = await response.json();
    if (data.imagePrompt) data.imagePrompt = sanitizeForUrl(data.imagePrompt);

    return data;
  } catch (error) {
    console.error("Bağlantı Hatası:", error);
    return {
      text: "Karanlık bir sessizlik çöktü... Bağlantı koptu gibi görünüyor.",
      options: ["Tekrar Odaklan"],
      isEnd: false,
    };
  }
};
