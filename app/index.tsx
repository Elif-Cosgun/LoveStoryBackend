import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import { Audio } from "expo-av";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import {
  BookOpen,
  CheckCircle,
  Clock,
  Heart,
  Settings,
  Timer,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
SplashScreen.preventAutoHideAsync();

const exampleThemes = [
  {
    id: 1,
    title: "Yağmurlu Kafe",
    prompt:
      "Paris'te yağmurlu bir günde kafede çarpışarak dökülen kahveler ve başlayan tutkulu aşk.",
  },
  {
    id: 2,
    title: "Lise Aşkı",
    prompt:
      "Yıllar sonra lise mezuniyet buluşmasında ilk aşkınla göz göze gelme anı.",
  },
  {
    id: 3,
    title: "Düşmanlıktan Aşka",
    prompt:
      "İş yerinde sürekli rekabet ettiğin ukala ama çekici iş arkadaşınla asansörde mahsur kalmak.",
  },
  {
    id: 4,
    title: "Yıldızların Altında",
    prompt:
      "Issız bir orman kampında, yıllardır en yakın arkadaşın olan kişiyle yalnız kaldığın o itiraf gecesi.",
  },
  {
    id: 5,
    title: "Trende Karşılaşma",
    prompt:
      "Doğu Ekspresinin lüks bir kompartımanında, gözlerini senden ayırmayan tehlikeli derecede çekici bir yolcu.",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [theme, setTheme] = useState("");
  const [duration, setDuration] = useState("medium");
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [adventures, setAdventures] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"completed" | "pending">(
    "completed",
  );
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAlertVisible, setIsAlertVisible] = useState(false);

  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [ttsVolume, setTtsVolume] = useState(1.0);
  const [isSfxEnabled, setIsSfxEnabled] = useState(true);
  const [sfxVolume, setSfxVolume] = useState(1.0);

  const bgmSound = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        let storedId = await SecureStore.getItemAsync("user_unique_id");
        if (!storedId) {
          storedId = `user_${Math.random().toString(36).substring(2, 9)}`;
          await SecureStore.setItemAsync("user_unique_id", storedId);
        }
        setUserId(storedId);

        const getBool = async (key: string) => await AsyncStorage.getItem(key);
        const getFloat = async (key: string) => {
          const val = await AsyncStorage.getItem(key);
          return val !== null ? parseFloat(val) : null;
        };

        if ((await getBool("musicEnabled")) !== null)
          setIsMusicEnabled((await getBool("musicEnabled")) === "true");
        if ((await getBool("ttsEnabled")) !== null)
          setIsTtsEnabled((await getBool("ttsEnabled")) === "true");
        if ((await getBool("sfxEnabled")) !== null)
          setIsSfxEnabled((await getBool("sfxEnabled")) === "true");

        const mVol = await getFloat("musicVolume");
        if (mVol !== null) setMusicVolume(mVol);
        const tVol = await getFloat("ttsVolume");
        if (tVol !== null) setTtsVolume(tVol);
        const sVol = await getFloat("sfxVolume");
        if (sVol !== null) setSfxVolume(sVol);

        SplashScreen.hideAsync();
      } catch (e) {
        console.error(e);
      }
    };
    initializeApp();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const startMusic = async () => {
        try {
          if (!bgmSound.current) {
            const { sound } = await Audio.Sound.createAsync(
              require("../assets/voices/happy.mp3"),
              {
                isLooping: true,
                volume: isMusicEnabled ? musicVolume : 0,
                shouldPlay: isMusicEnabled,
              },
            );
            if (isActive) bgmSound.current = sound;
            else sound.unloadAsync();
          } else if (isMusicEnabled) {
            await bgmSound.current.playAsync();
            await bgmSound.current.setVolumeAsync(musicVolume);
          }
        } catch (e) {}
      };
      startMusic();
      return () => {
        isActive = false;
        if (bgmSound.current) bgmSound.current.pauseAsync();
      };
    }, [isMusicEnabled, musicVolume]),
  );

  const playClickSound = async () => {
    if (!isSfxEnabled) return;
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/voices/click.mp3"),
      );
      await sound.setVolumeAsync(sfxVolume);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((s: any) => {
        if (s.didJustFinish) sound.unloadAsync();
      });
    } catch (e) {}
  };

  const startGame = async () => {
    playClickSound();
    if (!theme.trim()) {
      setIsAlertVisible(true);
      return;
    }
    if (bgmSound.current) await bgmSound.current.stopAsync();

    router.push({
      pathname: "/game",
      params: {
        theme: theme.trim(),
        duration,
        userId: userId,
        initialMusic: isMusicEnabled ? "true" : "false",
        initialTts: isTtsEnabled ? "true" : "false",
        initialSfx: isSfxEnabled ? "true" : "false",
        musicVolume: musicVolume.toString(),
        ttsVolume: ttsVolume.toString(),
        sfxVolume: sfxVolume.toString(),
      },
    });
  };

  const openHistory = async () => {
    playClickSound();
    if (!userId) return;
    setIsHistoryLoading(true);
    setIsHistoryVisible(true);
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(
        `https://love-story-backend-six.vercel.app/api/get-adventure?userId=${userId}&t=${timestamp}`,
        { headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } },
      );
      const data = await response.json();
      setAdventures(Array.isArray(data) ? data : []);
    } catch (e) {
      setAdventures([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const deleteAdventure = async (id: string) => {
    playClickSound();
    try {
      const response = await fetch(
        `https://love-story-backend-six.vercel.app/api/delete-adventure?id=${id}`,
        { method: "DELETE" },
      );
      if (response.ok)
        setAdventures((prev) => prev.filter((adv) => adv.id !== id));
    } catch (e) {}
  };

  const filteredAdventures = adventures.filter((adv) => {
    const isDone = adv.is_completed === true || adv.is_completed === "true";
    return activeTab === "completed" ? isDone : !isDone;
  });

  return (
    <SafeAreaProvider style={styles.mainWrapper}>
      <ImageBackground
        source={require("../assets/images/image_0.jpg")}
        style={styles.bgImage}
        resizeMode="cover"
      >
        <StatusBar style="light" />
        <View style={styles.overlay} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.topIconBar}>
            <TouchableOpacity
              onPress={() => {
                playClickSound();
                setIsSettingsVisible(true);
              }}
              style={styles.smallIconBtn}
            >
              <Settings size={22} color="#f6adf4" />
            </TouchableOpacity>
            <TouchableOpacity onPress={openHistory} style={styles.smallIconBtn}>
              <BookOpen size={22} color="#f6adf4" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.mainTitle}>LOVE STORY</Text>
                <Text style={styles.subTitle}>Kendi masalını yaz...</Text>
              </View>

              <View style={styles.glassPanel}>
                <View style={styles.inputSection}>
                  <Text style={styles.sectionLabel}>
                    HAYALİNDEKİ AŞK TEMASI
                  </Text>
                  <View style={styles.inputWrapper}>
                    <Heart size={18} color="#f6adf4" style={styles.inputIcon} />
                    <TextInput
                      placeholder="Kendi romantik hikayeni yaz..."
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      style={styles.input}
                      value={theme}
                      onChangeText={setTheme}
                      maxLength={80}
                    />
                  </View>
                </View>

                <View style={styles.examplesSection}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {exampleThemes.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.card,
                          theme === item.prompt && styles.activeCard,
                        ]}
                        onPress={() => {
                          playClickSound();
                          setTheme(item.prompt);
                        }}
                      >
                        <Text
                          style={[
                            styles.cardTitle,
                            theme === item.prompt && styles.activeCardTitle,
                          ]}
                        >
                          {item.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.durationSection}>
                  <View style={styles.durationRow}>
                    {["short", "medium", "long"].map((d, index) => (
                      <React.Fragment key={d}>
                        <TouchableOpacity
                          onPress={() => {
                            playClickSound();
                            setDuration(d);
                          }}
                          style={styles.dButton}
                        >
                          <Text
                            style={[
                              styles.dText,
                              duration === d && styles.activeDText,
                            ]}
                          >
                            {d === "short"
                              ? "KISA"
                              : d === "medium"
                                ? "ORTA"
                                : "UZUN"}
                          </Text>
                        </TouchableOpacity>
                        {index < 2 && (
                          <Text style={styles.durationSeparator}>|</Text>
                        )}
                      </React.Fragment>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.startTrigger}
                  onPress={startGame}
                  activeOpacity={0.8}
                >
                  <Text style={styles.startTriggerText}>KALBİNİ AÇ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>

        {/* UYARI MODALI */}
        <Modal visible={isAlertVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlayCen}>
            <View style={styles.customAlertBox}>
              <Heart color="#f6adf4" size={36} style={{ marginBottom: 15 }} />
              <Text style={styles.alertTitle}>AŞK İLHAM İSTER</Text>
              <Text style={styles.alertMessage}>
                Lütfen başlamadan önce nasıl bir aşk hikayesi yaşamak istediğini
                yaz veya seç.
              </Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => {
                  playClickSound();
                  setIsAlertVisible(false);
                }}
              >
                <Text style={styles.alertButtonText}>ANLADIM</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* GEÇMİŞ MODALI */}
        <Modal
          visible={isHistoryVisible}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: height * 0.85 }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitleDark}>AŞK DEFTERİ</Text>
                  <Text style={styles.modalSubtitleDark}>
                    Yarım kalan ve biten masalların
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    playClickSound();
                    setIsHistoryVisible(false);
                  }}
                  style={styles.modalCloseCircle}
                >
                  <X color="#ff1493" size={22} />
                </TouchableOpacity>
              </View>
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  onPress={() => {
                    playClickSound();
                    setActiveTab("completed");
                  }}
                  style={[
                    styles.tabButton,
                    activeTab === "completed" && styles.activeTab,
                  ]}
                >
                  <CheckCircle
                    size={16}
                    color={activeTab === "completed" ? "#fff" : "#ff1493"}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === "completed" && styles.activeTabText,
                    ]}
                  >
                    TAMAMLANANLAR
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    playClickSound();
                    setActiveTab("pending");
                  }}
                  style={[
                    styles.tabButton,
                    activeTab === "pending" && styles.activeTab,
                  ]}
                >
                  <Timer
                    size={16}
                    color={activeTab === "pending" ? "#fff" : "#ff1493"}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === "pending" && styles.activeTabText,
                    ]}
                  >
                    YARIM KALANLAR
                  </Text>
                </TouchableOpacity>
              </View>
              {isHistoryLoading ? (
                <View style={styles.emptyContainer}>
                  <ActivityIndicator size="large" color="#ff1493" />
                </View>
              ) : (
                <FlatList
                  data={filteredAdventures}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <View style={styles.cardWrapper}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.adventureCard}
                        onPress={() => {
                          playClickSound();
                          setIsHistoryVisible(false);
                          router.push({
                            pathname: "/game",
                            params: {
                              theme: item.theme,
                              duration: "medium",
                              adventureId: item.id,
                              resumedHistory: JSON.stringify(item.history),
                              userId,
                              initialMusic: isMusicEnabled ? "true" : "false",
                              initialSfx: isSfxEnabled ? "true" : "false",
                              initialTts: isTtsEnabled ? "true" : "false",
                              musicVolume: musicVolume.toString(),
                              ttsVolume: ttsVolume.toString(),
                              sfxVolume: sfxVolume.toString(),
                            },
                          });
                        }}
                      >
                        <View style={styles.advContent}>
                          <Text style={styles.advTheme} numberOfLines={1}>
                            {item.theme}
                          </Text>
                          <View style={styles.advDateRow}>
                            <Clock
                              size={12}
                              color="#ff1493"
                              style={{ marginRight: 4 }}
                            />
                            <Text style={styles.advDate}>
                              {new Date(item.created_at).toLocaleDateString(
                                "tr-TR",
                              )}
                            </Text>
                          </View>
                          <Text style={styles.advHistory} numberOfLines={1}>
                            {item.history.join(" ➔ ")}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => deleteAdventure(item.id)}
                          style={styles.deleteBtnStatic}
                        >
                          <Trash2 size={20} color="#ff4444" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={{ color: "#888", fontStyle: "italic" }}>
                        Burası henüz bomboş...
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        </Modal>

        {/* AYARLAR MODALI */}
        <Modal
          visible={isSettingsVisible}
          animationType="fade"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { height: "auto", paddingBottom: 40 },
              ]}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitleDark}>AYARLAR</Text>
                  <Text style={styles.modalSubtitleDark}>
                    Sesi ve hissi ayarla
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    playClickSound();
                    setIsSettingsVisible(false);
                  }}
                  style={styles.modalCloseCircle}
                >
                  <X color="#ff1493" size={22} />
                </TouchableOpacity>
              </View>

              <View style={styles.settingRowContainer}>
                <View style={styles.settingTopRow}>
                  <View>
                    <Text style={styles.settingLabel}>Aşk Melodisi</Text>
                    <Text style={styles.settingSubLabel}>Arka plan müziği</Text>
                  </View>
                  <TouchableOpacity
                    onPress={async () => {
                      playClickSound();
                      const val = !isMusicEnabled;
                      setIsMusicEnabled(val);
                      await AsyncStorage.setItem(
                        "musicEnabled",
                        val.toString(),
                      );
                    }}
                    style={[
                      styles.toggleBtn,
                      isMusicEnabled && styles.toggleBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        isMusicEnabled && { color: "#fff" },
                      ]}
                    >
                      {isMusicEnabled ? "AÇIK" : "KAPALI"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.1}
                  value={musicVolume}
                  disabled={!isMusicEnabled}
                  minimumTrackTintColor="#ff1493"
                  thumbTintColor={isMusicEnabled ? "#ff1493" : "#888"}
                  onValueChange={async (val) => {
                    setMusicVolume(val);
                    await AsyncStorage.setItem("musicVolume", val.toString());
                  }}
                />
              </View>

              <View style={styles.settingRowContainer}>
                <View style={styles.settingTopRow}>
                  <View>
                    <Text style={styles.settingLabel}>
                      Hikaye Seslendirmesi
                    </Text>
                    <Text style={styles.settingSubLabel}>
                      Karakter okumaları
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={async () => {
                      playClickSound();
                      const val = !isTtsEnabled;
                      setIsTtsEnabled(val);
                      await AsyncStorage.setItem("ttsEnabled", val.toString());
                    }}
                    style={[
                      styles.toggleBtn,
                      isTtsEnabled && styles.toggleBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        isTtsEnabled && { color: "#fff" },
                      ]}
                    >
                      {isTtsEnabled ? "AÇIK" : "KAPALI"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.1}
                  value={ttsVolume}
                  disabled={!isTtsEnabled}
                  minimumTrackTintColor="#ff1493"
                  thumbTintColor={isTtsEnabled ? "#ff1493" : "#888"}
                  onValueChange={async (val) => {
                    setTtsVolume(val);
                    await AsyncStorage.setItem("ttsVolume", val.toString());
                  }}
                />
              </View>

              <View style={styles.settingRowContainer}>
                <View style={styles.settingTopRow}>
                  <View>
                    <Text style={styles.settingLabel}>Aşk Tıkırtısı</Text>
                    <Text style={styles.settingSubLabel}>
                      Buton tıklama sesi
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={async () => {
                      playClickSound();
                      const val = !isSfxEnabled;
                      setIsSfxEnabled(val);
                      await AsyncStorage.setItem("sfxEnabled", val.toString());
                    }}
                    style={[
                      styles.toggleBtn,
                      isSfxEnabled && styles.toggleBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        isSfxEnabled && { color: "#fff" },
                      ]}
                    >
                      {isSfxEnabled ? "AÇIK" : "KAPALI"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.1}
                  value={sfxVolume}
                  disabled={!isSfxEnabled}
                  minimumTrackTintColor="#ff1493"
                  thumbTintColor={isSfxEnabled ? "#ff1493" : "#888"}
                  onValueChange={async (val) => {
                    setSfxVolume(val);
                    await AsyncStorage.setItem("sfxVolume", val.toString());
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      </ImageBackground>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#1a0b12" },
  bgImage: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20, 5, 10, 0.4)",
  },
  safeArea: { flex: 1 },

  topIconBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 25,
    paddingTop: 15,
    zIndex: 10,
  },
  smallIconBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(30, 0, 10, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f6adf4",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },

  keyboardView: { flex: 1, width: "100%" },
  content: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
  },
  header: { alignItems: "center", marginBottom: 30 },
  mainTitle: {
    fontSize: Platform.OS === "ios" ? 56 : 46,
    fontFamily: Platform.OS === "ios" ? "SnellRoundhand" : "serif",
    fontWeight: "bold",
    color: "#f6adf4",
    textAlign: "center",
    letterSpacing: 2,
    textShadowColor: "rgba(255, 20, 147, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  subTitle: {
    fontSize: 18,
    color: "#fff",
    fontStyle: "italic",
    marginTop: 5,
    textShadowColor: "#000",
    textShadowRadius: 5,
  },

  glassPanel: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(20, 5, 10, 0.75)",
    padding: 25,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: "#f6adf4",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  sectionLabel: {
    color: "#f6adf4",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 12,
    letterSpacing: 1.5,
  },

  inputSection: { width: "100%", marginBottom: 20 },
  inputWrapper: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: "#f6adf4",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 8,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    padding: 8,
    color: "#fff",
    fontSize: 16,
    height: 45,
    fontWeight: "500",
  },

  examplesSection: { height: 45, width: "100%", marginBottom: 25 },
  card: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(246, 173, 244, 0.4)",
    backgroundColor: "rgba(0,0,0,0.4)",
    height: 38,
  },
  activeCard: {
    borderColor: "#f6adf4",
    backgroundColor: "rgba(255, 20, 147, 0.3)",
  },
  cardTitle: { color: "#ccc", fontSize: 14, fontWeight: "600" },
  activeCardTitle: { color: "#f6adf4", fontWeight: "bold" },

  durationSection: { width: "100%", marginBottom: 20 },
  durationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 15,
    padding: 5,
  },
  dButton: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  dText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  activeDText: {
    color: "#f6adf4",
    textShadowColor: "#ff1493",
    textShadowRadius: 8,
  },
  durationSeparator: {
    color: "rgba(246, 173, 244, 0.2)",
    fontSize: 16,
    marginHorizontal: 2,
  },

  startTrigger: {
    backgroundColor: "#ff1493",
    paddingVertical: 16,
    width: "100%",
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#f6adf4",
    shadowColor: "#ff1493",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
  startTriggerText: {
    color: "#fff",
    fontSize: 22,
    fontFamily: Platform.OS === "ios" ? "SnellRoundhand" : "serif",
    fontWeight: "bold",
    letterSpacing: 2,
  },

  modalOverlayCen: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  customAlertBox: {
    width: width * 0.85,
    backgroundColor: "#1a0b12",
    borderRadius: 25,
    padding: 30,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#f6adf4",
  },
  alertTitle: {
    color: "#f6adf4",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    letterSpacing: 1,
  },
  alertMessage: {
    color: "#ddd",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 24,
  },
  alertButton: {
    backgroundColor: "#ff1493",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#f6adf4",
  },
  alertButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    width: width,
    backgroundColor: "#1a0b12",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 25,
    borderWidth: 2,
    borderColor: "#f6adf4",
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitleDark: {
    color: "#f6adf4",
    fontSize: 26,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "SnellRoundhand" : "serif",
    letterSpacing: 1,
  },
  modalSubtitleDark: { color: "#aaa", fontSize: 14, fontStyle: "italic" },
  modalCloseCircle: {
    width: 44,
    height: 44,
    backgroundColor: "rgba(255, 20, 147, 0.1)",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ff1493",
  },

  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: "#331520",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
  },
  activeTab: { backgroundColor: "rgba(255, 20, 147, 0.2)" },
  tabText: { color: "#888", fontSize: 14, marginLeft: 8, fontWeight: "bold" },
  activeTabText: { color: "#f6adf4" },
  cardWrapper: { marginBottom: 15 },
  adventureCard: {
    backgroundColor: "rgba(30, 0, 10, 0.6)",
    padding: 18,
    borderRadius: 15,
    borderLeftWidth: 5,
    borderLeftColor: "#f6adf4",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#331520",
  },
  advContent: { flex: 1 },
  advTheme: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  advDateRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  advDate: { color: "#ff1493", fontSize: 12, fontWeight: "600" },
  advHistory: { color: "#aaa", fontSize: 13, fontStyle: "italic" },
  deleteBtnStatic: {
    padding: 12,
    backgroundColor: "rgba(255,0,0,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,0,0,0.3)",
  },
  emptyContainer: { alignItems: "center", marginTop: 60 },

  settingRowContainer: {
    marginVertical: 12,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#331520",
  },
  settingTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  slider: { width: "100%", height: 40 },
  settingLabel: { color: "#f6adf4", fontSize: 18, fontWeight: "bold" },
  settingSubLabel: { color: "#aaa", fontSize: 13, marginTop: 4 },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "#555",
    minWidth: 85,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: "rgba(255, 20, 147, 0.2)",
    borderColor: "#ff1493",
  },
  toggleText: { color: "#777", fontWeight: "bold" },
});
