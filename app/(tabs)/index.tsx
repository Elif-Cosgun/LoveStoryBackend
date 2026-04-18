import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
// Dikkat: import yolunu tabs klasörüne göre ayarladık
import { testBackendConnection } from "../../services/api";

export default function HomeScreen() {
  const [message, setMessage] = useState("Hikaye motoru bekleniyor...");

  const handleConnect = async () => {
    setMessage("Vercel'e bağlanılıyor, lütfen bekle...");
    try {
      const result = await testBackendConnection();
      if (result.success) {
        setMessage(`💖 BAĞLANTI BAŞARILI: ${result.message}`);
      } else {
        setMessage(`❌ Bir sorun var: ${result.error}`);
      }
    } catch (error) {
      setMessage(
        "❌ Sunucuya ulaşılamadı. İnterneti veya Vercel linkini kontrol et.",
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Romance AI 🌹</Text>
      <Text style={styles.message}>{message}</Text>

      <TouchableOpacity style={styles.button} onPress={handleConnect}>
        <Text style={styles.buttonText}>Backend'i Test Et</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff0f5",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ff1493",
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginHorizontal: 20,
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#ff69b4",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  buttonText: { color: "white", fontSize: 18, fontWeight: "bold" },
});
