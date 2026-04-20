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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  const [history, setHistory] = useState<string[]>([]);
  const [inventory, setInventory] = useState<string[]>([]);
  const [currentPart, setCurrentPart] = useState<any>(null);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // AYARLAR
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

  // VERİTABANI DUPLİKE SORUNUNU ÇÖZEN HAFIZA (useRef)
  const adventureIdRef = useRef<string | null>(
    (params.adventureId as string) || null,
  );

  useEffect(() => {
    isMounted.current = true;
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
      // DİKKAT: adventureIdRef.current gönderilerek eski ID'nin unutulması engellendi
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
        // Yeni ID gelirse hafızaya kazı
        if (data.adventureId) adventureIdRef.current = data.adventureId;

        setInventory(data.inventory || []);
        setCurrentPart(data);

        if (choice && choice !== "[RESUME]")
          setHistory((prev) => [...prev, choice]);

        let audioUris: any[] = [];
        if (data.parts) {
          audioUris = await Promise.all(
            data.parts.map((p: any) =>
              fetchTTS(p.text, p.voiceType || "narrator_soft"),
            ),
          );
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
      loadNextStep(
        "[SİSTEM: Oyuncu engeli tatlı bir şekilde aştı, hikayeyi romantik ilerlet.]",
        history,
      );
    } else {
      setRiddleError("Bu cevap kalbini çalmaya yetmedi... Tekrar düşün.");
    }
  };

  return (
    <View style={styles.mainWrapper}>
      <StatusBar style="light" />
      {isLoading && (
        <View style={styles.transitionContainer}>
          <View style={styles.transitionOverlayLayer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>AŞK YAZILIYOR...</Text>
          </View>
        </View>
      )}

      {currentPart?.isEnd ? (
        <View style={styles.fullScreenEnd}>
          <ImageBackground
            source={require("../assets/images/image_0.png")}
            style={{ flex: 1 }}
            resizeMode="cover"
          >
            <SafeAreaView style={styles.endSafeArea}>
              <View style={{ alignItems: "center", paddingTop: 20 }}>
                <View
                  style={[
                    styles.badge,
                    currentPart?.endType === "bad" && {
                      backgroundColor: "#440000",
                      borderColor: "#ff0000",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      currentPart?.endType === "bad" && { color: "#ff4444" },
                    ]}
                  >
                    FİNAL
                  </Text>
                </View>
              </View>

              <View style={styles.endContentBottomPanel}>
                {currentPart?.endType === "good" ? (
                  <Heart
                    color="#FFD700"
                    size={48}
                    style={{ alignSelf: "center", marginBottom: 15 }}
                    fill="#FFD700"
                  />
                ) : (
                  <HeartCrack
                    color="#ff4444"
                    size={48}
                    style={{ alignSelf: "center", marginBottom: 15 }}
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
                    ? "MUTLU SON"
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
                            ? "#FFD700"
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
                            ? "#FFD700"
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
                        YENİDEN DENE
                      </Text>
                    </View>
                  </TouchableOpacity>
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
                <Home color="#FFD700" size={20} />
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
                <Settings color="#FFD700" size={20} />
              </TouchableOpacity>
            </View>

            {/* GÖRSEL BOYUTU ÇOK DAHA BÜYÜTÜLDÜ (Ekranın %45'i) */}
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
              {/* METİN ALANI 5 SATIRA SABİTLENDİ */}
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

              {/* BUTONLAR KÜÇÜLTÜLDÜ VE DAHA ZARİF YAPILDI */}
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
                          color={isTyping ? "#888" : "#FFD700"}
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

      {/* MİNİ OYUN MODALI */}
      <Modal
        visible={isMiniGameModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { height: "auto", paddingBottom: 40 }]}
          >
            <TouchableOpacity
              style={styles.miniGameCloseBtn}
              onPress={() => {
                playClickSound();
                setIsMiniGameModalVisible(false);
              }}
            >
              <X color="#ff1493" size={20} />
            </TouchableOpacity>

            <View style={{ width: "100%", alignItems: "center" }}>
              <Heart color="#ff1493" size={32} style={{ marginBottom: 10 }} />
              <Text style={styles.modalTitleDark}>AŞK FISILTISI</Text>
              <Text
                style={[
                  styles.modalSubtitleDark,
                  { marginBottom: 20, textAlign: "center" },
                ]}
              >
                {activeMiniGame?.question ||
                  "Onun kalbini çalacak doğru kelimeyi bul."}
              </Text>
              <View style={styles.riddleInputRow}>
                <TextInput
                  style={styles.riddleInput}
                  placeholder="Cevabın..."
                  placeholderTextColor="#ffb6c1"
                  value={riddleInput}
                  onChangeText={setRiddleInput}
                />
                <TouchableOpacity
                  style={styles.riddleSubmitBtn}
                  onPress={handleRiddleSubmit}
                >
                  <Heart color="#fff" size={20} />
                </TouchableOpacity>
              </View>
              {riddleError && (
                <Text style={styles.riddleErrorText}>{riddleError}</Text>
              )}
            </View>
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
    backgroundColor: "#1a0b12",
    justifyContent: "center",
    alignItems: "center",
  },
  safeArea: { flex: 1 },
  loadingText: {
    color: "#FFD700",
    marginTop: 20,
    letterSpacing: 2,
    fontSize: 14,
    fontWeight: "900",
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
    borderColor: "#FFD700",
  },
  badge: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  badgeText: {
    color: "#FFD700",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
  },

  // GÖRSEL BOYUTU EKRANIN %45'İNE ÇIKARILDI (Daha Önce 0.35 idi)
  imageContainer: {
    width: width * 0.88,
    height: height * 0.45,
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
    backgroundColor: "rgba(20, 5, 10, 0.65)",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 15,
    borderWidth: 1.5,
    borderColor: "#FFD700",
    borderBottomWidth: 0,
  },

  // METİN KUTUSU 5 SATIR (110px) OLARAK SABİTLENDİ
  storyContainer: { height: 110, paddingHorizontal: 20, marginBottom: 5 },
  storyText: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    fontStyle: "italic",
    fontWeight: "500",
    textShadowColor: "#000",
    textShadowRadius: 4,
  },

  // BUTONLAR İNCELTİLDİ VE DAHA KİBAR HALE GELDİ
  optionsPanel: { paddingHorizontal: 15, paddingBottom: 15 },
  optionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.12)",
    padding: 10,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  miniGameTriggerButton: {
    backgroundColor: "rgba(255, 20, 147, 0.3)",
    borderColor: "#ff1493",
  },
  optionText: { color: "#FFD700", fontSize: 13, flex: 1, fontWeight: "bold" },

  fullScreenEnd: { flex: 1, backgroundColor: "#1a0b12" },
  endSafeArea: { flex: 1 },
  endContentBottomPanel: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 25,
    paddingBottom: 50,
    backgroundColor: "rgba(20, 5, 10, 0.7)",
    borderRadius: 25,
    margin: 15,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  endTitle: {
    fontSize: 32,
    textAlign: "center",
    marginBottom: 15,
    fontWeight: "bold",
  },
  endTitleBad: { color: "#ff4444" },
  endTitleGood: { color: "#FFD700" },
  endDescriptionText: {
    fontSize: 16,
    lineHeight: 26,
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
    height: 50,
    marginHorizontal: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 20, 147, 0.15)",
    borderWidth: 1.5,
    borderColor: "#ff1493",
    justifyContent: "center",
    alignItems: "center",
  },
  gothicButtonInner: { flexDirection: "row", alignItems: "center" },
  gothicButtonText: { color: "#fff", fontWeight: "bold", fontSize: 13 },

  miniGameCloseBtn: { position: "absolute", top: 15, right: 15, zIndex: 10 },
  riddleInputRow: { flexDirection: "row", width: "100%", alignItems: "center" },
  riddleInput: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFD700",
    marginRight: 10,
    color: "#fff",
  },
  riddleSubmitBtn: {
    backgroundColor: "#ff1493",
    padding: 12,
    borderRadius: 10,
  },
  riddleErrorText: { color: "#ff4444", marginTop: 15, fontWeight: "bold" },

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
    borderColor: "#FFD700",
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitleDark: {
    color: "#FFD700",
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
  settingLabel: { color: "#FFD700", fontSize: 18, fontWeight: "bold" },
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
