import { Image } from "react-native";

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

    if (!response.ok) throw new Error(`Sunucu hatası: ${response.status}`);
    const data = await response.json();

    // GÖRSEL TAMAMEN İNMEDEN ARAYÜZE GEÇMEMESİ İÇİN ÖNBELLEĞE ALIYORUZ
    if (data.imageUrl && !data.imageUrl.includes("placeholder")) {
      await Image.prefetch(data.imageUrl);
    }

    if (data.imagePrompt) data.imagePrompt = sanitizeForUrl(data.imagePrompt);
    return data;
  } catch (error) {
    return {
      text: "Bağlantı koptu... Kalp ritmin yavaşlıyor. (İnternet hatası).",
      options: ["Tekrar Dene"],
      isEnd: false,
    };
  }
};
