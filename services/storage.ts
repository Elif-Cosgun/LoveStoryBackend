// Bu dosya artık AsyncStorage kullanmıyor,
// sadece TypeScript için veri tiplerini (Interface) barındırıyor.

export interface Adventure {
  id: string;
  created_at: string; // Supabase'den gelen tarih
  theme: string;
  history: string[];
  final_text: string; // Supabase sütun adıyla uyumlu hale getirdik
  is_completed: boolean; // Supabase sütun adıyla uyumlu hale getirdik
}

// NOT: Kayıt ve Listeleme işlemleri artık Vercel API üzerinden
// direkt index.tsx ve game.tsx içinde fetch ile yapılıyor.
// Bu yüzden buradaki eski saveAdventure ve getPastAdventures fonksiyonlarına gerek kalmadı.
