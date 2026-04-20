import Slider from "@react-native-community/slider";
import { Audio } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Heart,
  HeartCrack,
  Home,
  Settings,
  X
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

  const bgmSound = useRef<Audio.Sound | null>(null);
  const ttsSound = useRef<Audio.Sound | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const requestCounter = useRef(0);
  const isMounted = useRef(true);

  const adventureIdRef = useRef<string | null>(
    (params.adventureId as string) || null,
  );
  const historyRef = useRef<string[]>(
    params.resumedHistory ? JSON.parse(params.resumedHistory as string) : [],
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

    loadNextStep(params.resumedHistory ? "[RESUME]" : null);

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
    historyRef.current = [];
    adventureIdRef.current = null;
    loadNextStep(null);
  };

  const loadNextStep = async (choice: string | null) => {
    requestCounter.current += 1;
    const myReq = requestCounter.current;
    setIsLoading(true);
    setDisplayedText("");

    if (ttsSound.current) {
      await ttsSound.current.unloadAsync();
      ttsSound.current = null;
    }

    let payload = choice === "[RESUME]" ? "[RESUME] SİSTEM MESAJI" : choice;

    try {
      const data = await fetchStoryStep(
        theme,
        payload,
        historyRef.current,
        [],
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
        setCurrentPart(data);
        if (choice && choice !== "[RESUME]") historyRef.current.push(choice);

        let audioUris: any[] = [];
        if (data.parts && isTtsEnabled) {
          for (const p of data.parts) {
            try {
              const uri = await fetchTTS(p.text, p.voiceType);
              audioUris.push(uri);
              await new Promise((r) => setTimeout(r, 500)); // İstekler arası bekleme
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
        }, 30);

        if (data.parts && isTtsEnabled) {
          for (let i = 0; i < data.parts.length; i++) {
            if (!isMounted.current || requestCounter.current !== myReq) break;
            if (audioUris[i]) {
              try {
                const { sound, status }: any = await Audio.Sound.createAsync(
                  { uri: audioUris[i] },
                  { shouldPlay: true, volume: ttsVolume },
                );
                ttsSound.current = sound;
                await new Promise((r) =>
                  setTimeout(r, status.durationMillis || 1500),
                );
                await sound.unloadAsync();
              } catch (e) {}
            }
          }
        }
      }
    } catch (e) {
      setIsLoading(false);
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
                      fill="#f6adf4"
                      style={{ marginBottom: 10 }}
                    />
                  ) : (
                    <HeartCrack
                      color="#ff4444"
                      size={56}
                      style={{ marginBottom: 10 }}
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
                      style={styles.gothicButton}
                      onPress={goHome}
                    >
                      <Text style={styles.gothicButtonText}>ANA SAYFA</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.gothicButton}
                      onPress={restartGame}
                    >
                      <Text style={styles.gothicButtonText}>TEKRAR DENE</Text>
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
          <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={goHome} style={styles.iconCircle}>
                <Home color="#f6adf4" size={20} />
              </TouchableOpacity>
              <View style={styles.badge}>
                <Text
                  style={styles.badgeText}
                >{`BÖLÜM ${historyRef.current.length + 1}`}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsSettingsVisible(true)}
                style={styles.iconCircle}
              >
                <Settings color="#f6adf4" size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.imageContainer}>
              <Image
                source={{ uri: currentPart?.imageUrl }}
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
                      (isTyping || isLoading) && { opacity: 0.5 },
                    ]}
                    onPress={() => loadNextStep(opt)}
                    disabled={isLoading || isTyping}
                  >
                    <Text style={styles.optionText}>
                      {isLoading ? "..." : opt}
                    </Text>
                    <Heart color="#f6adf4" size={14} />
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitleDark}>AYARLAR</Text>
              <TouchableOpacity onPress={() => setIsSettingsVisible(false)}>
                <X color="#ff1493" size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.settingRowContainer}>
              <Text style={styles.settingLabel}>Aşk Melodisi</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                value={musicVolume}
                onValueChange={setMusicVolume}
                minimumTrackTintColor="#ff1493"
              />
            </View>
            <View style={styles.settingRowContainer}>
              <Text style={styles.settingLabel}>Karakter Sesleri</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                value={ttsVolume}
                onValueChange={setTtsVolume}
                minimumTrackTintColor="#ff1493"
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
    backgroundColor: "rgba(26, 11, 18, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  safeArea: { flex: 1 },
  loadingText: {
    color: "#f6adf4",
    marginTop: 20,
    fontSize: 16,
    fontStyle: "italic",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(30, 0, 10, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f6adf4",
  },
  badge: {
    backgroundColor: "rgba(246, 173, 244, 0.1)",
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(246, 173, 244, 0.3)",
  },
  badgeText: { color: "#f6adf4", fontSize: 12, fontWeight: "bold" },
  imageContainer: {
    width: width * 0.9,
    height: height * 0.42,
    alignSelf: "center",
    borderRadius: 20,
    overflow: "hidden",
    marginVertical: 10,
    elevation: 10,
  },
  aiImage: { width: "100%", height: "100%" },
  imageBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 20,
  },
  bottomSectionPanel: {
    flex: 1,
    width: "100%",
    backgroundColor: "transparent",
  },
  storyContainer: { height: 110, paddingHorizontal: 25, marginBottom: 5 },
  storyText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    fontStyle: "italic",
    textShadowColor: "#000",
    textShadowRadius: 6,
  },
  optionsPanel: { paddingHorizontal: 20, paddingBottom: 25 },
  optionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(246, 173, 244, 0.15)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(246, 173, 244, 0.4)",
  },
  optionText: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
    fontWeight: "bold",
    textShadowColor: "#000",
    textShadowRadius: 4,
  },
  fullScreenEnd: { flex: 1 },
  endSafeArea: { flex: 1 },
  endCenteredWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  endContentCenteredPanel: {
    width: "100%",
    backgroundColor: "rgba(20, 5, 10, 0.9)",
    borderRadius: 25,
    padding: 30,
    borderWidth: 2,
    alignItems: "center",
  },
  endPanelGood: { borderColor: "#f6adf4" },
  endPanelBad: { borderColor: "#ff4444" },
  endTitle: {
    fontSize: 32,
    textAlign: "center",
    marginBottom: 15,
    fontWeight: "bold",
    textShadowColor: "#000",
    textShadowRadius: 5,
    color: "#fff",
  },
  endTitleBad: { color: "#ff4444" },
  endTitleGood: { color: "#f6adf4" },
  endDescriptionText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    color: "#fff",
    marginBottom: 30,
  },
  endButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  gothicButton: {
    flex: 1,
    height: 48,
    marginHorizontal: 5,
    borderRadius: 15,
    backgroundColor: "rgba(246, 173, 244, 0.2)",
    borderWidth: 1.5,
    borderColor: "#f6adf4",
    justifyContent: "center",
    alignItems: "center",
  },
  gothicButtonText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: "#1a0b12",
    borderRadius: 25,
    padding: 25,
    borderWidth: 2,
    borderColor: "#f6adf4",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitleDark: { color: "#f6adf4", fontSize: 22, fontWeight: "bold" },
  settingRowContainer: { marginBottom: 20 },
  settingLabel: { color: "#fff", marginBottom: 10, fontWeight: "600" },
  slider: { width: "100%", height: 40 },
});
