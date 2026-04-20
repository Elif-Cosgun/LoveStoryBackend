import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import { Audio } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Heart,
  HeartCrack,
  Home,
  RefreshCw,
  Settings,
  Sparkles,
  X,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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
    params.musicVolume ? parseFloat(params.musicVolume as string) : 0.3,
  );
  const [isTtsEnabled, setIsTtsEnabled] = useState(
    params.initialTts === "true",
  );
  const [ttsVolume, setTtsVolume] = useState(
    params.ttsVolume ? parseFloat(params.ttsVolume as string) : 1.0,
  );
  const [isSfxEnabled, setIsSfxEnabled] = useState(
    params.initialSfx === "true",
  );
  const [sfxVolume, setSfxVolume] = useState(
    params.sfxVolume ? parseFloat(params.sfxVolume as string) : 1.0,
  );

  const [activeMiniGame, setActiveMiniGame] = useState<any>(null);
  const [isMiniGameModalVisible, setIsMiniGameModalVisible] = useState(false);
  const [riddleInput, setRiddleInput] = useState("");
  const [riddleError, setRiddleError] = useState<string | null>(null);

  const bgmSound = useRef<Audio.Sound | null>(null);
  const ttsSound = useRef<Audio.Sound | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const requestCounter = useRef(0);
  const isMounted = useRef(true);

  // KESİN ÇÖZÜM: ID HAFIZASI
  const adventureIdRef = useRef<string | null>(
    (params.adventureId as string) || null,
  );
  const hasStarted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    if (hasStarted.current) return;
    hasStarted.current = true;

    const startMusic = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../assets/voices/happy.mp3"),
          {
            isLooping: true,
            volume: isMusicEnabled ? musicVolume : 0,
            shouldPlay: isMusicEnabled,
          },
        );
        if (isMounted.current) bgmSound.current = sound;
      } catch (e) {}
    };
    startMusic();

    const h = params.resumedHistory
      ? JSON.parse(params.resumedHistory as string)
      : [];
    setHistory(h);
    loadNextStep(params.resumedHistory ? "[RESUME]" : null, h);

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

  useEffect(() => {
    if (ttsSound.current) {
      if (isTtsEnabled) {
        ttsSound.current.playAsync();
        ttsSound.current.setVolumeAsync(ttsVolume);
      } else ttsSound.current.pauseAsync();
    }
  }, [isTtsEnabled, ttsVolume]);

  const playClickSound = async () => {
    if (!isSfxEnabled) return;
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/voices/click.mp3"),
      );
      await sound.setVolumeAsync(sfxVolume);
      await sound.playAsync();
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
    adventureIdRef.current = null;
    setInventory([]);
    loadNextStep(null, []);
  };

  const loadNextStep = async (
    choice: string | null,
    currentHistory: string[],
  ) => {
    requestCounter.current += 1;
    const myReq = requestCounter.current;
    setIsLoading(true);
    setDisplayedText("");
    setActiveMiniGame(null);
    setIsMiniGameModalVisible(false);

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
        adventureIdRef.current,
        userId,
      );

      if (requestCounter.current !== myReq || !isMounted.current) return;
      if (data.error) {
        setDisplayedText(data.error);
        setIsLoading(false);
        return;
      }

      if (data) {
        if (data.adventureId) adventureIdRef.current = data.adventureId;

        setInventory(data.inventory || []);
        setCurrentPart(data);

        if (choice && choice !== "[RESUME]")
          setHistory((prev) => [...prev, choice]);

        let audioUris: any[] = [];
        if (data.parts && isTtsEnabled) {
          // ElevenLabs Spam Koruması: Promise.all yerine sırayla sesleri çekiyoruz
          for (const p of data.parts) {
            try {
              const uri = await fetchTTS(p.text, p.voiceType || "narrator");
              audioUris.push(uri);
            } catch (e) {
              audioUris.push(null);
            }
          }
        }

        setIsLoading(false);
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

        if (data.parts) {
          for (let i = 0; i < data.parts.length; i++) {
            if (!isMounted.current || requestCounter.current !== myReq) break;
            if (audioUris[i]) {
              try {
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
              } catch (e) {}
            }
          }
        }
      }
    } catch (e) {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = (opt: string) => {
    playClickSound();
    if (currentPart?.isEnd || isLoading || isTyping) return;
    loadNextStep(opt, history);
  };

  const handleRiddleSubmit = () => {
    playClickSound();
    if (!riddleInput.trim() || !activeMiniGame) return;
    if (
      riddleInput.toLowerCase().trim() ===
      activeMiniGame.answer.toLowerCase().trim()
    ) {
      setActiveMiniGame(null);
      setIsMiniGameModalVisible(false);
      loadNextStep("[SİSTEM: Oyuncu engeli aştı, hikayeyi ilerlet.]", history);
    } else {
      setRiddleError("Bu cevap kalbini çalmaya yetmedi...");
    }
  };

  return (
    <View style={styles.mainWrapper}>
      <StatusBar style="light" />
      {isLoading && (
        <View style={styles.transitionContainer}>
          <ImageBackground
            source={require("../assets/images/gecis_2.png")}
            style={{ flex: 1 }}
            resizeMode="cover"
          >
            <View style={styles.transitionOverlayLayer}>
              <ActivityIndicator size="large" color="#f6adf4" />
              <Text style={styles.loadingText}>
                Kaderin iplikleri dokunuyor...
              </Text>
            </View>
          </ImageBackground>
        </View>
      )}

      {currentPart?.isEnd ? (
        <View style={styles.fullScreenEnd}>
          <ImageBackground
            source={
              currentPart?.endType === "good"
                ? require("../assets/images/zafer.png")
                : require("../assets/images/yenilgi.png")
            }
            style={{ flex: 1 }}
            resizeMode="cover"
          >
            <SafeAreaView style={styles.endSafeArea}>
              <View style={styles.endCenteredWrapper}>
                <View
                  style={[
                    styles.endContentCenteredPanel,
                    currentPart?.endType === "good"
                      ? styles.endPanelGood
                      : styles.endPanelBad,
                  ]}
                >
                  {currentPart?.endType === "good" ? (
                    <Heart
                      color="#f6adf4"
                      size={56}
                      style={{ alignSelf: "center", marginBottom: 10 }}
                      fill="#f6adf4"
                    />
                  ) : (
                    <HeartCrack
                      color="#ff4444"
                      size={56}
                      style={{ alignSelf: "center", marginBottom: 10 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.endTitle,
                      currentPart?.endType === "good"
                        ? styles.endTitleGood
                        : styles.endTitleBad,
                    ]}
                  >
                    {currentPart?.endType === "good"
                      ? "AŞKI BULDUN!"
                      : "KALP KIRIKLIĞI"}
                  </Text>
                  <Text style={styles.endDescriptionText}>{displayedText}</Text>
                  <View style={styles.endButtonRow}>
                    <TouchableOpacity
                      style={[
                        styles.gothicButton,
                        currentPart?.endType === "bad" && {
                          backgroundColor: "rgba(0,0,0,0.8)",
                          borderColor: "#ff4444",
                        },
                      ]}
                      onPress={goHome}
                    >
                      <View style={styles.gothicButtonInner}>
                        <Home
                          color={
                            currentPart?.endType === "good"
                              ? "#f6adf4"
                              : "#ff4444"
                          }
                          size={16}
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={[
                            styles.gothicButtonText,
                            currentPart?.endType === "bad" && {
                              color: "#ff4444",
                            },
                          ]}
                        >
                          ANA SAYFA
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.gothicButton,
                        currentPart?.endType === "bad" && {
                          backgroundColor: "rgba(0,0,0,0.8)",
                          borderColor: "#ff4444",
                        },
                      ]}
                      onPress={restartGame}
                    >
                      <View style={styles.gothicButtonInner}>
                        <RefreshCw
                          color={
                            currentPart?.endType === "good"
                              ? "#f6adf4"
                              : "#ff4444"
                          }
                          size={16}
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={[
                            styles.gothicButtonText,
                            currentPart?.endType === "bad" && {
                              color: "#ff4444",
                            },
                          ]}
                        >
                          TEKRAR DENE
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </SafeAreaView>
          </ImageBackground>
        </View>
      ) : (
        <ImageBackground
          source={require("../assets/images/image_0.png")}
          style={styles.bgImage}
          resizeMode="cover"
        >
          <SafeAreaView
            style={styles.safeArea}
            edges={["top", "left", "right"]}
          >
            <View style={styles.topBar}>
              <TouchableOpacity onPress={goHome} style={styles.iconCircle}>
                <Home color="#f6adf4" size={20} />
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
                <Settings color="#f6adf4" size={20} />
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

            <View style={styles.bottomSectionPanel}>
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
                {currentPart?.options?.map((opt: string, index: number) => {
                  const isMiniGameTrigger = activeMiniGame && index === 0;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionButton,
                        (isTyping || isLoading) && { opacity: 0.6 },
                        isMiniGameTrigger && styles.miniGameTriggerButton,
                      ]}
                      onPress={() => {
                        if (isMiniGameTrigger) {
                          playClickSound();
                          setIsMiniGameModalVisible(true);
                        } else handleOptionSelect(opt);
                      }}
                      disabled={isLoading || isTyping}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          isMiniGameTrigger && { color: "#fff" },
                        ]}
                      >
                        {isLoading ? "..." : opt}
                      </Text>
                      {isMiniGameTrigger ? (
                        <Sparkles color="#fff" size={14} />
                      ) : (
                        <Heart
                          color={isTyping ? "#888" : "#f6adf4"}
                          size={14}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
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
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { height: "auto", paddingBottom: 40 }]}
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
                    await AsyncStorage.setItem("musicEnabled", val.toString());
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
                  <Text style={styles.settingLabel}>Hikaye Seslendirmesi</Text>
                  <Text style={styles.settingSubLabel}>Karakter okumaları</Text>
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
                  <Text style={styles.settingSubLabel}>Buton tıklama sesi</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#1a0b12" },
  bgImage: { flex: 1 },
  transitionContainer: { ...StyleSheet.absoluteFillObject, zIndex: 999 },
  transitionOverlayLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(26, 11, 18, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  safeArea: { flex: 1 },
  loadingText: {
    color: "#f6adf4",
    marginTop: 20,
    letterSpacing: 2,
    fontSize: 16,
    fontWeight: "600",
    fontStyle: "italic",
    textShadowColor: "#000",
    textShadowRadius: 4,
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(30, 0, 10, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#f6adf4",
  },
  badge: {
    backgroundColor: "rgba(246, 173, 244, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(246, 173, 244, 0.3)",
  },
  badgeText: {
    color: "#f6adf4",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
  },

  imageContainer: {
    width: width * 0.88,
    height: height * 0.38,
    alignSelf: "center",
    borderRadius: 20,
    overflow: "hidden",
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    flexShrink: 0,
  },
  aiImage: { width: "100%", height: "100%" },
  imageBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 20,
  },

  bottomSectionPanel: {
    flex: 1,
    width: "100%",
    backgroundColor: "transparent",
    paddingTop: 10,
  },
  storyContainer: { height: 110, paddingHorizontal: 20, marginBottom: 5 },
  storyText: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    fontStyle: "italic",
    fontWeight: "500",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 6,
  },

  optionsPanel: { paddingHorizontal: 15, paddingBottom: 30 },
  optionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(246, 173, 244, 0.12)",
    padding: 10,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(246, 173, 244, 0.3)",
  },
  miniGameTriggerButton: {
    backgroundColor: "rgba(255, 20, 147, 0.3)",
    borderColor: "#ff1493",
  },
  optionText: {
    color: "#fff",
    fontSize: 13,
    flex: 1,
    fontWeight: "bold",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },

  fullScreenEnd: { flex: 1, backgroundColor: "#1a0b12" },
  endSafeArea: { flex: 1 },
  endCenteredWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  endContentCenteredPanel: {
    width: "100%",
    backgroundColor: "rgba(20, 5, 10, 0.85)",
    borderRadius: 25,
    padding: 30,
    borderWidth: 2,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  endPanelGood: { borderColor: "#f6adf4" },
  endPanelBad: { borderColor: "#ff4444" },
  endTitle: {
    fontSize: 36,
    textAlign: "center",
    marginBottom: 15,
    fontWeight: "bold",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 6,
  },
  endTitleBad: { color: "#ff4444" },
  endTitleGood: { color: "#f6adf4" },
  endDescriptionText: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 35,
    color: "#fff",
    fontWeight: "600",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 6,
  },
  endButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  gothicButton: {
    flex: 1,
    height: 50,
    marginHorizontal: 8,
    borderRadius: 20,
    backgroundColor: "rgba(246, 173, 244, 0.15)",
    borderWidth: 1.5,
    borderColor: "#f6adf4",
    justifyContent: "center",
    alignItems: "center",
  },
  gothicButtonInner: { flexDirection: "row", alignItems: "center" },
  gothicButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
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
