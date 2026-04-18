import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import {
  BookOpen,
  CheckCircle,
  Heart,
  Settings,
  Timer,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
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
      "İş yerinde sürekli rekabet ettiğin çekici iş arkadaşınla asansörde mahsur kalmak.",
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

  const bgmSound = React.useRef<Audio.Sound | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
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

        const mVol = await getFloat("musicVolume");
        if (mVol !== null) setMusicVolume(mVol);
        const tVol = await getFloat("ttsVolume");
        if (tVol !== null) setTtsVolume(tVol);

        SplashScreen.hideAsync();
      } catch (e) {
        console.error(e);
      }
    };
    initializeApp();
  }, []);

  const playClickSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/voices/click.mp3"),
      );
      await sound.setVolumeAsync(1.0);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((s: any) => {
        if (s.didJustFinish) sound.unloadAsync();
      });
    } catch (e) {
      console.log("Click sound not found");
    }
  };

  const startGame = async () => {
    playClickSound();
    if (!theme.trim()) {
      setIsAlertVisible(true);
      return;
    }

    if (bgmSound.current) {
      await bgmSound.current.stopAsync();
    }

    router.push({
      pathname: "/game",
      params: {
        theme: theme.trim(),
        duration,
        userId: userId,
        initialMusic: isMusicEnabled ? "true" : "false",
        initialTts: isTtsEnabled ? "true" : "false",
        musicVolume: musicVolume.toString(),
        ttsVolume: ttsVolume.toString(),
      },
    });
  };

  const openHistory = async () => {
    playClickSound();
    if (!userId) return;
    setIsHistoryLoading(true);
    setIsHistoryVisible(true);
    try {
      const response = await fetch(
        `https://love-story-backend-8x5szjdrm-ed13.vercel.app/api/get-adventure?userId=${userId}`,
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
        `https://love-story-backend-8x5szjdrm-ed13.vercel.app/api/delete-adventure?id=${id}`,
        { method: "DELETE" },
      );
      if (response.ok)
        setAdventures((prev) => prev.filter((adv) => adv.id !== id));
    } catch (e) {}
  };

  const filteredAdventures = adventures.filter((adv) =>
    activeTab === "completed" ? adv.is_completed : !adv.is_completed,
  );

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: "#fff0f5" }}>
      <ImageBackground
        source={{
          uri: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1080&auto=format&fit=crop",
        }}
        style={styles.container}
        resizeMode="cover"
      >
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.overlay}>
            <View style={styles.topIconBar}>
              <TouchableOpacity
                onPress={() => {
                  playClickSound();
                  setIsSettingsVisible(true);
                }}
                style={styles.smallIconBtn}
              >
                <Settings size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openHistory}
                style={styles.smallIconBtn}
              >
                <BookOpen size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.keyboardView}
            >
              <View style={styles.content}>
                <View style={styles.header}>
                  <Text style={styles.mainTitle}>LOVE STORY</Text>
                </View>

                <View style={styles.glassPanel}>
                  <View style={styles.inputSection}>
                    <Text style={styles.sectionLabel}>AŞK TEMANI BELİRLE</Text>
                    <View style={styles.inputWrapper}>
                      <Heart
                        size={16}
                        color="#ff1493"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        placeholder="Kendi romantik hikayeni yaz..."
                        placeholderTextColor="#ffb6c1"
                        style={styles.input}
                        value={theme}
                        onChangeText={setTheme}
                        maxLength={80}
                      />
                    </View>
                  </View>

                  <View style={styles.examplesSection}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
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
                    activeOpacity={0.7}
                  >
                    <Text style={styles.startTriggerText}>KALBİNİ AÇ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </SafeAreaView>

        <Modal visible={isAlertVisible} animationType="fade" transparent={true}>
          <View style={styles.customAlertOverlay}>
            <View style={styles.customAlertBox}>
              <Heart color="#ff1493" size={32} style={{ marginBottom: 10 }} />
              <Text style={styles.alertTitle}>AŞK İLHAM İSTER</Text>
              <Text style={styles.alertMessage}>
                Lütfen önce hikayeni yaz veya seç.
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

        <Modal
          visible={isHistoryVisible}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>AŞK DEFTERİ</Text>
                  <Text style={styles.modalSubtitle}>
                    Yarım kalan ve biten hikayelerin
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    playClickSound();
                    setIsHistoryVisible(false);
                  }}
                  style={styles.modalCloseCircle}
                >
                  <X color="#ff1493" size={20} />
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
                    size={14}
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
                    size={14}
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
                      >
                        <View style={styles.advContent}>
                          <Text style={styles.advTheme} numberOfLines={1}>
                            {item.theme}
                          </Text>
                          <Text style={styles.advHistory} numberOfLines={1}>
                            {item.history.join(" ➔ ")}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => deleteAdventure(item.id)}
                          style={styles.deleteBtnStatic}
                        >
                          <Trash2 size={18} color="#ff4444" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={{ color: "#555" }}>
                        Burası henüz bomboş...
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        </Modal>

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
                <Text style={styles.modalTitle}>AYARLAR</Text>
                <TouchableOpacity
                  onPress={() => {
                    playClickSound();
                    setIsSettingsVisible(false);
                  }}
                  style={styles.modalCloseCircle}
                >
                  <X color="#ff1493" size={20} />
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
                    <Text style={styles.toggleText}>
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
                  thumbTintColor={isMusicEnabled ? "#ff1493" : "#444"}
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
                      Karakter okumaları (ElevenLabs)
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
                    <Text style={styles.toggleText}>
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
                  thumbTintColor={isTtsEnabled ? "#ff1493" : "#444"}
                  onValueChange={async (val) => {
                    setTtsVolume(val);
                    await AsyncStorage.setItem("ttsVolume", val.toString());
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
  container: { flex: 1, backgroundColor: "#fff0f5" },
  safeArea: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
  },
  topIconBar: {
    position: "absolute",
    top: 15,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 25,
    zIndex: 10,
  },
  smallIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 20, 147, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffb6c1",
  },
  keyboardView: { flex: 1, width: "100%" },
  content: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 25,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: { alignItems: "center" },
  mainTitle: {
    fontSize: 46,
    fontWeight: "bold",
    color: "#ff1493",
    textAlign: "center",
    textShadowColor: "#fff",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  glassPanel: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingVertical: 20,
    paddingHorizontal: 22,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#ff69b4",
    shadowColor: "#ff1493",
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  sectionLabel: {
    color: "#ff1493",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  inputSection: { width: "100%", marginBottom: 15 },
  inputWrapper: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: "#ff1493",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, padding: 8, color: "#333", fontSize: 16, height: 45 },
  examplesSection: { height: 45, width: "100%", marginBottom: 20 },
  card: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
    marginRight: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ffb6c1",
    backgroundColor: "#fff0f5",
    height: 35,
  },
  activeCard: { borderColor: "#ff1493", backgroundColor: "#ff1493" },
  cardTitle: { color: "#ff69b4", fontSize: 14, fontWeight: "600" },
  activeCardTitle: { color: "#fff", fontWeight: "bold" },
  durationSection: { width: "100%", marginBottom: 15 },
  durationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dButton: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dText: { color: "#ffb6c1", fontSize: 14, fontWeight: "bold" },
  activeDText: { color: "#ff1493" },
  durationSeparator: { color: "#ffb6c1", fontSize: 16, marginHorizontal: 5 },
  startTrigger: {
    backgroundColor: "#ff1493",
    paddingVertical: 15,
    width: "100%",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
  startTriggerText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  customAlertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  customAlertBox: {
    width: width * 0.8,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
  },
  alertTitle: {
    color: "#ff1493",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  alertMessage: {
    color: "#555",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 25,
  },
  alertButton: {
    backgroundColor: "#ff1493",
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 25,
  },
  alertButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    width: width,
    height: height * 0.8,
    backgroundColor: "#fff",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 25,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  modalTitle: { color: "#ff1493", fontSize: 26, fontWeight: "bold" },
  modalSubtitle: { color: "#777", fontSize: 14 },
  modalCloseCircle: {
    width: 40,
    height: 40,
    backgroundColor: "#fff0f5",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: "#fff0f5",
    borderRadius: 10,
    padding: 5,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
  },
  activeTab: { backgroundColor: "#ff1493" },
  tabText: {
    color: "#ff69b4",
    fontSize: 14,
    marginLeft: 8,
    fontWeight: "bold",
  },
  activeTabText: { color: "#fff" },
  cardWrapper: { marginBottom: 15 },
  adventureCard: {
    backgroundColor: "#fff0f5",
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 5,
    borderLeftColor: "#ff1493",
    flexDirection: "row",
    alignItems: "center",
  },
  advContent: { flex: 1 },
  advTheme: { color: "#ff1493", fontSize: 18, fontWeight: "bold" },
  advHistory: { color: "#777", fontSize: 12, marginTop: 5 },
  deleteBtnStatic: { padding: 10 },
  emptyContainer: { alignItems: "center", marginTop: 50 },
  settingRowContainer: {
    marginVertical: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  settingTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  slider: { width: "100%", height: 40 },
  settingLabel: { color: "#ff1493", fontSize: 18, fontWeight: "bold" },
  settingSubLabel: { color: "#777", fontSize: 12 },
  toggleBtn: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#eee",
  },
  toggleBtnActive: { backgroundColor: "#ff1493" },
  toggleText: { color: "#fff", fontWeight: "bold" },
});
