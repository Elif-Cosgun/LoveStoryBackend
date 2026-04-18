// services/api.ts

// BURAYA VERCEL'DEN KOPYALADIĞIN LİNKİ YAPIŞTIR (Sonunda /api olmak zorunda!)
const BASE_URL = "https://love-story-backend-8x5szjdrm-ed13.vercel.app";

export const testBackendConnection = async () => {
  try {
    // Vercel'deki index.ts dosyamıza POST isteği atıyoruz
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // Backend'e "Aşk hikayesini başlat" emrini gönderiyoruz
      body: JSON.stringify({ action: "START_ROMANCE", payload: {} }),
    });

    return await response.json();
  } catch (error) {
    console.error("Backend bağlantı hatası:", error);
    throw error;
  }
};
