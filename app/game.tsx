import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import { Audio } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Heart, Home, RefreshCw, Settings, X } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchTTS } from "../services/elevenlabs";
import { fetchStoryStep } from "../services/gemini";

const { width, height } = Dimensions.get("window");

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const theme = params.theme || "Romantik Bir Akşam";
  const duration = params.duration || "medium";
  const userId = params.userId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [adventureId, setAdventureId] = useState<string | null>(
    (params.adventureId as string) || null,
  );
  const [history, setHistory] = useState<string[]>([]);
  const [inventory, setInventory] = useState<string[]>([]);
  const [currentPart, setCurrentPart] = useState<any>(null);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(
    params.initialMusic === "true",
  );
  const [musicVolume, setMusicVolume] = useState(
    params.musicVolume ? parseFloat(params.musicVolume as string) : 0.2,
  );
  const [isTtsEnabled, setIsTtsEnabled] = useState(
    params.initialTts === "true",
  );
  const [ttsVolume, setTtsVolume] = useState(
    params.ttsVolume ? parseFloat(params.ttsVolume as string) : 1.0,
  );

  const bgmSound = useRef<Audio.Sound | null>(null);
  const ttsSound = useRef<Audio.Sound | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const requestCounter = useRef(0);
  const isMounted = useRef(true);

  // Arka plan müziği (happy.mp3)
  useEffect(() => {
    isMounted.current = true;
    const startMusic = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../assets/voices/happy.mp3"), // BURASI GÜNCELLENDİ
          {
            isLooping: true,
            volume: isMusicEnabled ? musicVolume : 0,
            shouldPlay: isMusicEnabled,
          },
        );
        if (isMounted.current) bgmSound.current = sound;
      } catch (e) {
        console.log("BGM Error", e);
      }
    };
    startMusic();

    const h = params.resumedHistory
      ? JSON.parse(params.resumedHistory as string)
      : [];
    setHistory(h);
    loadNextStep(
      params.resumedHistory ? "[RESUME]" : null,
      h,
      (params.adventureId as string) || null,
    );

    return () => {
      isMounted.current = false;
      bgmSound.current?.unloadAsync();
      ttsSound.current?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    if (bgmSound.current) {
      if (isMusicEnabled) {
        bgmSound.current.playAsync();
        bgmSound.current.setVolumeAsync(musicVolume);
      } else bgmSound.current.pauseAsync();
    }
  }, [isMusicEnabled, musicVolume]);

  const playClickSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/voices/click.mp3"),
      );
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((s: any) => {
        if (s.didJustFinish) sound.unloadAsync();
      });
    } catch (e) {}
  };

  const goHome = async () => {
    playClickSound();
    await bgmSound.current?.unloadAsync();
    await ttsSound.current?.unloadAsync();
    router.replace("/");
  };

  const restartGame = () => {
    playClickSound();
    setHistory([]);
    setAdventureId(null);
    setInventory([]);
    loadNextStep(null, [], null);
  };

  const loadNextStep = useCallback(
    async (
      choice: string | null,
      currentHistory: string[],
      currentId: string | null,
    ) => {
      requestCounter.current += 1;
      const myReq = requestCounter.current;
      setIsLoading(true);
      setDisplayedText("");

      if (ttsSound.current) {
        await ttsSound.current.unloadAsync();
        ttsSound.current = null;
      }

      let payload = choice;
      if (choice === "[RESUME]")
        payload = "[RESUME] SİSTEM MESAJI: Oyuncu geri döndü.";

      try {
        const data = await fetchStoryStep(
          theme,
          payload,
          currentHistory,
          inventory,
          duration,
          currentId,
          userId,
        );
        if (requestCounter.current !== myReq || !isMounted.current) return;

        if (data.error) {
          setDisplayedText(data.error);
          setIsLoading(false);
          return;
        }

        if (data) {
          if (data.adventureId) setAdventureId(data.adventureId);
          setInventory(data.inventory || []);
          setCurrentPart(data);
          setIsLoading(false);

          if (choice && choice !== "[RESUME]")
            setHistory((prev) => [...prev, choice]);

          // TTS (Seslendirme) İŞLEMİ
          let audioUris: any[] = [];
          if (isTtsEnabled && data.parts) {
            audioUris = await Promise.all(
              data.parts.map((p: any) =>
                fetchTTS(p.text, p.voiceType || "narrator"),
              ),
            );
          }

          setIsTyping(true);
          let idx = 0;
          const full = data.text || "";
          const interval = setInterval(() => {
            if (!isMounted.current || requestCounter.current !== myReq) {
              clearInterval(interval);
              return;
            }
            idx++;
            setDisplayedText(full.slice(0, idx));
            if (idx >= full.length) {
              clearInterval(interval);
              setIsTyping(false);
            }
          }, 35);

          // Sesleri Sırayla Çal
          if (data.parts) {
            for (let i = 0; i < data.parts.length; i++) {
              if (!isMounted.current || requestCounter.current !== myReq) break;
              if (audioUris[i]) {
                const { sound, status }: any = await Audio.Sound.createAsync(
                  { uri: audioUris[i] },
                  { shouldPlay: isTtsEnabled, volume: ttsVolume },
                );
                ttsSound.current = sound;
                await new Promise((r) =>
                  setTimeout(r, status.durationMillis || 2000),
                );
                await sound.unloadAsync();
                ttsSound.current = null;
              }
            }
          }
        }
      } catch (e) {
        setIsLoading(false);
      }
    },
    [theme, duration, userId, inventory, isTtsEnabled, ttsVolume],
  );

  const handleOptionSelect = (opt: string) => {
    playClickSound();
    if (currentPart?.isEnd || isLoading || isTyping) return;
    loadNextStep(opt, history, adventureId);
  };

  return (
    <View style={styles.mainWrapper}>
      <StatusBar style="light" />
      {isLoading && (
        <View style={styles.transitionContainer}>
          <View style={styles.transitionOverlayLayer}>
            <ActivityIndicator size="large" color="#ff1493" />
            <Text style={styles.loadingText}>AŞK YAZILIYOR...</Text>
          </View>
        </View>
      )}

      {currentPart?.isEnd ? (
        <View style={styles.fullScreenEnd}>
          <ImageBackground
            source={{
              uri:
                currentPart?.endType === "good"
                  ? "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1080&auto=format&fit=crop"
                  : "https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?q=80&w=1080&auto=format&fit=crop",
            }}
            style={{ flex: 1 }}
            resizeMode="cover"
          >
            <View
              style={[
                styles.endOverlay,
                {
                  backgroundColor:
                    currentPart?.endType === "good"
                      ? "rgba(255,20,147,0.3)"
                      : "rgba(0,0,0,0.7)",
                },
              ]}
            />
            <SafeAreaView style={styles.endSafeArea}>
              <View style={{ alignItems: "center", paddingTop: 20 }}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>FİNAL</Text>
                </View>
              </View>
              <View style={styles.endContentBottom}>
                <Text
                  style={[
                    styles.endTitle,
                    currentPart?.endType === "good"
                      ? styles.endTitleGood
                      : styles.endTitleBad,
                  ]}
                >
                  {currentPart?.endType === "good"
                    ? "MUTLU SON"
                    : "KALP KIRIKLIĞI"}
                </Text>
                <Text style={styles.endDescriptionText}>{displayedText}</Text>
                <View style={styles.endButtonRow}>
                  <TouchableOpacity
                    style={styles.gothicButton}
                    onPress={goHome}
                  >
                    <View style={styles.gothicButtonInner}>
                      <Home color="#fff" size={16} style={{ marginRight: 8 }} />
                      <Text style={styles.gothicButtonText}>ANA SAYFA</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.gothicButton}
                    onPress={restartGame}
                  >
                    <View style={styles.gothicButtonInner}>
                      <RefreshCw
                        color="#fff"
                        size={16}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.gothicButtonText}>YENİDEN DENE</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          </ImageBackground>
        </View>
      ) : (
        <ImageBackground
          source={{
            uri: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1080&auto=format&fit=crop",
          }}
          style={styles.bgImage}
          resizeMode="cover"
        >
          <View style={styles.overlay} />
          <SafeAreaView
            style={styles.safeArea}
            edges={["top", "left", "right"]}
          >
            <View style={styles.topBar}>
              <TouchableOpacity onPress={goHome} style={styles.iconCircle}>
                <Home color="#ff1493" size={20} />
              </TouchableOpacity>
              <View style={styles.badge}>
                <Text
                  style={styles.badgeText}
                >{`BÖLÜM ${history.length + 1}`}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  playClickSound();
                  setIsSettingsVisible(true);
                }}
                style={styles.iconCircle}
              >
                <Settings color="#ff1493" size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.imageContainer}>
              <Image
                source={{
                  uri:
                    currentPart?.imageUrl ||
                    "https://images.unsplash.com/photo-1474552226712-ac0f0961a954?q=80&w=1080&auto=format&fit=crop",
                }}
                resizeMode="cover"
                style={styles.aiImage}
              />
              <View style={styles.imageBorder} />
            </View>

            <View style={styles.bottomSection}>
              <View style={styles.storyContainer}>
                <ScrollView
                  ref={scrollViewRef}
                  onContentSizeChange={() =>
                    isTyping &&
                    scrollViewRef.current?.scrollToEnd({ animated: true })
                  }
                >
                  <Text style={styles.storyText}>{displayedText}</Text>
                </ScrollView>
              </View>

              <View style={styles.optionsPanel}>
                {currentPart?.options?.map((opt: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.optionButton,
                      (isTyping || isLoading) && { opacity: 0.6 },
                    ]}
                    onPress={() => handleOptionSelect(opt)}
                    disabled={isLoading || isTyping}
                  >
                    <Text style={styles.optionText}>
                      {isLoading ? "..." : opt}
                    </Text>
                    <Heart color={isTyping ? "#aaa" : "#ff1493"} size={16} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </SafeAreaView>
        </ImageBackground>
      )}

      {/* AYARLAR MODALI */}
      <Modal
        visible={isSettingsVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.settingsModalOverlay}>
          <View style={styles.settingsModalContent}>
            <View style={styles.settingsModalHeader}>
              <Text style={styles.settingsModalTitle}>AYARLAR</Text>
              <TouchableOpacity
                onPress={() => {
                  playClickSound();
                  setIsSettingsVisible(false);
                }}
              >
                <X color="#ff1493" size={24} />
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
                    await AsyncStorage.setItem("musicEnabled", val.toString());
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
                  <Text style={styles.settingLabel}>Hikaye Seslendirmesi</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#fff0f5" },
  bgImage: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,240,245,0.7)",
  },
  transitionContainer: { ...StyleSheet.absoluteFillObject, zIndex: 999 },
  transitionOverlayLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  safeArea: { flex: 1 },
  loadingText: {
    color: "#ff1493",
    marginTop: 20,
    letterSpacing: 3,
    fontSize: 14,
    fontWeight: "bold",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  iconCircle: {
    width: 42,
    height: 42,
    backgroundColor: "#fff",
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#ff1493",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  badge: {
    backgroundColor: "#ff1493",
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  imageContainer: {
    flex: 1,
    width: width * 0.9,
    alignSelf: "center",
    borderRadius: 20,
    overflow: "hidden",
    marginVertical: 15,
  },
  aiImage: { width: "100%", height: "100%" },
  imageBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderColor: "#ff69b4",
    borderRadius: 20,
  },
  bottomSection: {
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
  },
  storyContainer: { height: 130, paddingHorizontal: 25 },
  storyText: {
    color: "#333",
    fontSize: 17,
    textAlign: "justify",
    fontStyle: "italic",
    lineHeight: 26,
    fontWeight: "500",
  },
  optionsPanel: { paddingHorizontal: 20, paddingBottom: 20, marginTop: 10 },
  optionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff0f5",
    padding: 16,
    borderRadius: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ffb6c1",
  },
  optionText: { color: "#d21f3c", fontSize: 15, flex: 1, fontWeight: "bold" },
  fullScreenEnd: { flex: 1, backgroundColor: "#fff0f5" },
  endOverlay: { ...StyleSheet.absoluteFillObject },
  endSafeArea: { flex: 1 },
  endContentBottom: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 25,
    paddingBottom: 50,
  },
  endTitle: {
    fontSize: 36,
    textAlign: "center",
    marginBottom: 15,
    fontWeight: "bold",
  },
  endTitleBad: { color: "#ff4444" },
  endTitleGood: { color: "#ff1493" },
  endDescriptionText: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 35,
    color: "#fff",
    fontWeight: "600",
  },
  endButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  gothicButton: {
    flex: 1,
    height: 55,
    marginHorizontal: 8,
    borderRadius: 25,
    backgroundColor: "#ff1493",
    justifyContent: "center",
    alignItems: "center",
  },
  gothicButtonInner: { flexDirection: "row", alignItems: "center" },
  gothicButtonText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  settingsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  settingsModalContent: {
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingBottom: 40,
  },
  settingsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  settingsModalTitle: { fontSize: 24, fontWeight: "bold", color: "#ff1493" },
  settingRowContainer: { marginBottom: 20 },
  settingTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  settingLabel: { fontSize: 18, fontWeight: "bold", color: "#333" },
  settingSubLabel: { fontSize: 12, color: "#777" },
  toggleBtn: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#eee",
  },
  toggleBtnActive: { backgroundColor: "#ff1493" },
  toggleText: { color: "#fff", fontWeight: "bold" },
  slider: { width: "100%", height: 40 },
});
