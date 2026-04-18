import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ChevronRight,
  Home,
  Lock,
  RefreshCw,
  Settings,
  Skull,
  Sparkles,
  Unlock,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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

import Slider from "@react-native-community/slider";

import { fetchTTS } from "../services/elevenlabs";
import { fetchStoryStep } from "../services/gemini";

import {
  AdEventType,
  InterstitialAd,
  TestIds,
} from "react-native-google-mobile-ads";

const { width, height } = Dimensions.get("window");

const interstitial = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL, {
  requestNonPersonalizedAdsOnly: true,
});

const AMBIENT_SOUNDS: { [key: string]: any } = {
  tension: require("../assets/sounds/tension.mp3"),
  whispers: require("../assets/sounds/whispers.mp3"),
  mystic: require("../assets/sounds/mystic.mp3"),
  action: require("../assets/sounds/action.mp3"),
  heartbeat: require("../assets/sounds/heartbeat.mp3"),
};

const SFX_SOUNDS: { [key: string]: any } = {
  leaves: require("../assets/sounds/leaves.mp3"),
  door: require("../assets/sounds/door.mp3"),
  scream_man: require("../assets/sounds/scream_man.mp3"),
  scream_woman: require("../assets/sounds/scream_woman.mp3"),
  footsteps: require("../assets/sounds/footsteps.mp3"),
  error: require("../assets/sounds/door.mp3"),
  success: require("../assets/sounds/leaves.mp3"),
};

export default function GameScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();

  const theme = params.theme || "Gizemli Bir Kabus";
  const duration = params.duration || "medium";
  const userId = params.userId as string;

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
  const [isGameSfxEnabled, setIsGameSfxEnabled] = useState(
    params.initialGameSfx === "true",
  );
  const [gameSfxVolume, setGameSfxVolume] = useState(
    params.gameSfxVolume ? parseFloat(params.gameSfxVolume as string) : 0.6,
  );
  const [isSfxEnabled, setIsSfxEnabled] = useState(
    params.initialSfx === "true",
  );
  const [sfxVolume, setSfxVolume] = useState(
    params.sfxVolume ? parseFloat(params.sfxVolume as string) : 1.0,
  );

  const [showAd, setShowAd] = useState(true);
  const showAdRef = useRef(true);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoadDone = useRef(false);
  const [isResuming, setIsResuming] = useState(!!params.resumedHistory);

  // --- MİNİ OYUN GENEL ---
  const [activeMiniGame, setActiveMiniGame] = useState<any>(null);
  const [isMiniGameModalVisible, setIsMiniGameModalVisible] = useState(false);

  // --- RIDDLE (1) ---
  const [riddleInput, setRiddleInput] = useState("");
  const [riddleAttempts, setRiddleAttempts] = useState(3);
  const [riddleError, setRiddleError] = useState<string | null>(null);

  // --- SIMON (2) ---
  const [simonSequence, setSimonSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [simonStep, setSimonStep] = useState(1);
  const [isWatching, setIsWatching] = useState(true);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const simonTimer = useRef(new Animated.Value(1)).current;

  // --- LOCKPICK (3) ---
  const [lockpickStep, setLockpickStep] = useState(1);
  const needleAnim = useRef(new Animated.Value(0)).current;
  const lockTimer = useRef(new Animated.Value(1)).current;
  const needleValue = useRef(0);

  useEffect(() => {
    const listener = needleAnim.addListener(({ value }) => {
      needleValue.current = value;
    });
    return () => {
      needleAnim.removeListener(listener);
    };
  }, []);

  const [adventureId, setAdventureId] = useState<string | null>(
    (params.adventureId as string) || null,
  );
  const [history, setHistory] = useState<string[]>([]);
  const [inventory, setInventory] = useState<string[]>([]);
  const [currentPart, setCurrentPart] = useState<any>(null);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentAmbientType, setCurrentAmbientType] = useState<string | null>(
    null,
  );

  const bgmSound = useRef<Audio.Sound | null>(null);
  const ttsSound = useRef<Audio.Sound | null>(null);
  const isMounted = useRef(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const requestCounter = useRef(0);

  useEffect(() => {
    showAdRef.current = showAd;
  }, [showAd]);

  const goHome = async () => {
    playClickSound();
    requestCounter.current += 1;
    await stopAllSounds();
    router.replace("/");
  };

  // REKLAM MANTIĞI
  useEffect(() => {
    let unsubL: any, unsubC: any, unsubE: any, fTimer: NodeJS.Timeout;
    if (showAd) {
      interstitial.load();
      unsubL = interstitial.addAdEventListener(AdEventType.LOADED, () => {
        if (isMounted.current) {
          clearTimeout(fTimer);
          interstitial.show();
        }
      });
      unsubC = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        if (isMounted.current) setShowAd(false);
      });
      unsubE = interstitial.addAdEventListener(AdEventType.ERROR, () => {
        if (isMounted.current) {
          clearTimeout(fTimer);
          setShowAd(false);
        }
      });
      fTimer = setTimeout(() => {
        if (isMounted.current) setShowAd(false);
      }, 5000);
      return () => {
        unsubL?.();
        unsubC?.();
        unsubE?.();
        clearTimeout(fTimer);
      };
    }
  }, [showAd]);

  // DAKTİLO
  useEffect(() => {
    if (!currentPart?.text) return;
    setIsTyping(true);
    setDisplayedText("");
    let idx = 0;
    const full = currentPart.text;
    const req = requestCounter.current;
    const interval = setInterval(() => {
      if (!isMounted.current || requestCounter.current !== req) {
        clearInterval(interval);
        return;
      }
      idx++;
      setDisplayedText(full.slice(0, idx));
      if (idx >= full.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [currentPart?.text]);

  const playClickSound = async () => {
    if (!isSfxEnabled) return;
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/sounds/mouse_click.mp3"),
      );
      await sound.setVolumeAsync(sfxVolume);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((s: any) => {
        if (s.didJustFinish) sound.unloadAsync();
      });
    } catch (e) {}
  };

  const playMiniGameSound = async (type: "error" | "success") => {
    if (!isGameSfxEnabled) return;
    try {
      const { sound } = await Audio.Sound.createAsync(SFX_SOUNDS[type]);
      await sound.setVolumeAsync(gameSfxVolume);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((s: any) => {
        if (s.didJustFinish) sound.unloadAsync();
      });
    } catch (e) {}
  };

  const stopAllSounds = async () => {
    try {
      if (bgmSound.current) {
        await bgmSound.current.stopAsync();
        await bgmSound.current.unloadAsync();
        bgmSound.current = null;
      }
      if (ttsSound.current) {
        await ttsSound.current.stopAsync();
        await ttsSound.current.unloadAsync();
        ttsSound.current = null;
      }
    } catch (e) {}
  };

  const updateAmbient = async (type: string) => {
    if (currentAmbientType === type || !AMBIENT_SOUNDS[type]) return;
    try {
      if (bgmSound.current) {
        await bgmSound.current.stopAsync();
        await bgmSound.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(AMBIENT_SOUNDS[type], {
        isLooping: true,
        volume: isMusicEnabled ? musicVolume : 0,
        shouldPlay: isMusicEnabled,
      });
      if (isMounted.current) {
        bgmSound.current = sound;
        setCurrentAmbientType(type);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (bgmSound.current) {
      if (isMusicEnabled) {
        bgmSound.current.playAsync();
        bgmSound.current.setVolumeAsync(musicVolume);
      } else bgmSound.current.pauseAsync();
    }
  }, [isMusicEnabled, musicVolume]);

  useEffect(() => {
    const updateTts = async () => {
      if (ttsSound.current) {
        if (!isTtsEnabled) await ttsSound.current.pauseAsync();
        else {
          await ttsSound.current.setVolumeAsync(ttsVolume);
          await ttsSound.current.playAsync();
        }
      }
    };
    updateTts();
  }, [isTtsEnabled, ttsVolume]);

  useEffect(() => {
    isMounted.current = true;
    const setup = async () => {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../assets/sounds/bg_ambient.mp3"),
          {
            isLooping: true,
            volume: isMusicEnabled ? musicVolume : 0,
            shouldPlay: isMusicEnabled,
          },
        );
        if (isMounted.current) bgmSound.current = sound;
      } catch (e) {}
    };
    setup();
    return () => {
      isMounted.current = false;
      stopAllSounds();
    };
  }, []);

  const resetAllAnimations = () => {
    simonTimer.stopAnimation();
    lockTimer.stopAnimation();
    needleAnim.stopAnimation();
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
      setActiveMiniGame(null);
      setIsMiniGameModalVisible(false);
      setRiddleError(null);
      resetAllAnimations();

      if (ttsSound.current) {
        try {
          await ttsSound.current.stopAsync();
          await ttsSound.current.unloadAsync();
          ttsSound.current = null;
        } catch (e) {}
      }

      let payload = choice;
      if (choice === "[RESUME]")
        payload =
          "[RESUME] SİSTEM MESAJI: Oyuncu geri döndü. Hikayeyi ilerletme, son atmosferi betimle ve seçenek sun.";

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

        if (data) {
          if (data.imageUrl) await Image.prefetch(data.imageUrl);
          if (data.adventureId) setAdventureId(data.adventureId);
          if (data.ambient) await updateAmbient(data.ambient);
          setInventory(data.inventory || []);

          if (data.miniGame) {
            setActiveMiniGame(data.miniGame);
            if (data.miniGame.type === "riddle") {
              setRiddleAttempts(3);
              setRiddleInput("");
            } else if (data.miniGame.type === "simon") {
              setSimonStep(1);
              initSimonSequence(1);
            } else if (data.miniGame.type === "lockpick") {
              initLockpick();
            }
          }

          let audioUris: any[] = [];
          if (isTtsEnabled && data.parts) {
            audioUris = await Promise.all(
              data.parts.map((p: any) =>
                fetchTTS(p.text, p.voiceType || "narrator"),
              ),
            );
          }

          while (showAdRef.current && isMounted.current)
            await new Promise((r) => setTimeout(r, 500));
          setCurrentPart(data);
          setIsLoading(false);
          if (choice && choice !== "[RESUME]")
            setHistory((prev) => [...prev, choice]);

          if (data.parts) {
            for (let i = 0; i < data.parts.length; i++) {
              if (!isMounted.current || requestCounter.current !== myReq) break;
              const p = data.parts[i];
              if (isGameSfxEnabled && p.sfx && SFX_SOUNDS[p.sfx]) {
                Audio.Sound.createAsync(SFX_SOUNDS[p.sfx], {
                  shouldPlay: true,
                  volume: gameSfxVolume,
                }).then(({ sound }) => {
                  sound.setOnPlaybackStatusUpdate((s) => {
                    if (s.didJustFinish) sound.unloadAsync();
                  });
                });
              }
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
    [
      theme,
      duration,
      userId,
      isMusicEnabled,
      isTtsEnabled,
      isGameSfxEnabled,
      musicVolume,
      ttsVolume,
      gameSfxVolume,
      inventory,
    ],
  );

  // --- 1. RIDDLE MANTIĞI ---
  const handleRiddleSubmit = () => {
    if (!riddleInput.trim() || !activeMiniGame) return;
    playClickSound();
    if (
      riddleInput.toLowerCase().trim() ===
      activeMiniGame.answer.toLowerCase().trim()
    ) {
      playMiniGameSound("success");
      setActiveMiniGame(null);
      setIsMiniGameModalVisible(false);
      loadNextStep(
        "[SİSTEM: Oyuncu şifreyi BAŞARIYLA çözdü. Hikayeyi zafere veya kurtuluşa yönelik ilerlet.]",
        history,
        adventureId,
      );
    } else {
      playMiniGameSound("error");
      const att = riddleAttempts - 1;
      setRiddleAttempts(att);
      setRiddleInput("");
      if (att <= 0) {
        setActiveMiniGame(null);
        setIsMiniGameModalVisible(false);
        loadNextStep(
          "[SİSTEM: Oyuncu şifreyi çözemedi, hakları bitti. Bu seçeneği iptal et, karakteri cezalandır ve yeni seçenekler sun.]",
          history,
          adventureId,
        );
      } else {
        setRiddleError("Fısıltın yankısız kaldı... Yanlış kelime.");
      }
    }
  };

  // --- 2. SIMON MANTIĞI ---
  const initSimonSequence = (step: number) => {
    setIsWatching(true);
    setUserSequence([]);
    const len = step === 1 ? 3 : step === 2 ? 5 : 7;
    const newSeq = Array.from({ length: len }, () =>
      Math.floor(Math.random() * 16),
    );
    setSimonSequence(newSeq);
  };

  useEffect(() => {
    if (
      activeMiniGame?.type === "simon" &&
      isWatching &&
      simonSequence.length > 0 &&
      isMiniGameModalVisible
    ) {
      let i = 0;
      const interval = setInterval(() => {
        setHighlightedIndex(simonSequence[i]);
        setTimeout(() => setHighlightedIndex(null), 500);
        i++;
        if (i >= simonSequence.length) {
          clearInterval(interval);
          setTimeout(() => {
            setIsWatching(false);
            startSimonTimer();
          }, 600);
        }
      }, 900);
      return () => clearInterval(interval);
    }
  }, [isWatching, simonSequence, isMiniGameModalVisible]);

  const startSimonTimer = () => {
    simonTimer.setValue(1);
    Animated.timing(simonTimer, {
      toValue: 0,
      duration: 10000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && isMounted.current)
        handleSimonFailure("Zaman tükendi. Karanlık seni yuttu.");
    });
  };

  const handleSimonPress = (idx: number) => {
    if (isWatching) return;
    playClickSound();
    const currentPos = userSequence.length;
    if (idx === simonSequence[currentPos]) {
      const newU = [...userSequence, idx];
      setUserSequence(newU);
      if (newU.length === simonSequence.length) {
        simonTimer.stopAnimation();
        if (simonStep < 3) {
          setSimonStep((s) => s + 1);
          setTimeout(() => initSimonSequence(simonStep + 1), 1000);
        } else {
          playMiniGameSound("success");
          setActiveMiniGame(null);
          setIsMiniGameModalVisible(false);
          loadNextStep(
            "[SİSTEM: Oyuncu ritüeli BAŞARIYLA tamamladı. Hikayeyi ilerlet.]",
            history,
            adventureId,
          );
        }
      }
    } else {
      handleSimonFailure("Rünleri yanlış sırayla okudun. Ritüel çöktü.");
    }
  };

  const handleSimonFailure = (msg: string) => {
    simonTimer.stopAnimation();
    playMiniGameSound("error");
    setActiveMiniGame(null);
    setIsMiniGameModalVisible(false);
    loadNextStep(
      `[SİSTEM: Oyuncu ritüelde BAŞARISIZ oldu. Sebep: ${msg}]`,
      history,
      adventureId,
    );
  };

  // --- 3. LOCKPICK MANTIĞI ---
  const startNeedle = (step: number) => {
    needleAnim.stopAnimation();
    needleAnim.setValue(0);
    const duration = step === 1 ? 1200 : step === 2 ? 950 : 750;
    Animated.loop(
      Animated.sequence([
        Animated.timing(needleAnim, {
          toValue: 100,
          duration,
          useNativeDriver: false,
        }),
        Animated.timing(needleAnim, {
          toValue: 0,
          duration,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  };

  const initLockpick = () => {
    setLockpickStep(1);
    startNeedle(1);
    lockTimer.setValue(1);
    Animated.timing(lockTimer, {
      toValue: 0,
      duration: 15000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && isMounted.current) {
        handleLockpickFail("Zaman tükendi. Peşindeki tehlike seni yakaladı!");
      }
    });
  };

  const handleLockpickPress = () => {
    const val = needleValue.current;
    let isHit = false;

    // GÜVENLİ ALANLAR
    if (lockpickStep === 1 && val >= 40 && val <= 60) isHit = true;
    if (lockpickStep === 2 && val >= 44 && val <= 56) isHit = true;
    if (lockpickStep === 3 && val >= 47 && val <= 53) isHit = true;

    if (isHit) {
      if (lockpickStep < 3) {
        playMiniGameSound("success");
        const nextStep = lockpickStep + 1;
        setLockpickStep(nextStep);
        startNeedle(nextStep);
      } else {
        playMiniGameSound("success");
        needleAnim.stopAnimation();
        lockTimer.stopAnimation();
        setActiveMiniGame(null);
        setIsMiniGameModalVisible(false);
        loadNextStep(
          "[SİSTEM: Oyuncu zorlu kilidi BAŞARIYLA kırdı ve tehlikeden kurtuldu.]",
          history,
          adventureId,
        );
      }
    } else {
      playMiniGameSound("error");
    }
  };

  const handleLockpickFail = (msg: string) => {
    needleAnim.stopAnimation();
    lockTimer.stopAnimation();
    playMiniGameSound("error");
    setActiveMiniGame(null);
    setIsMiniGameModalVisible(false);
    loadNextStep(
      `[SİSTEM: Oyuncu kilidi kırmakta BAŞARISIZ oldu. Sebep: ${msg}]`,
      history,
      adventureId,
    );
  };

  useEffect(() => {
    if (!showAd && !isInitialLoadDone.current) {
      isInitialLoadDone.current = true;
      const h = params.resumedHistory
        ? JSON.parse(params.resumedHistory as string)
        : [];
      setHistory(h);
      loadNextStep(
        isResuming ? "[RESUME]" : null,
        h,
        (params.adventureId as string) || null,
      );
    }
  }, [showAd]);

  const handleOptionSelect = (opt: string) => {
    if (currentPart?.isEnd || isLoading || isTyping) return;
    playClickSound();
    if ((history.length + 1) % 5 === 0) setShowAd(true);
    loadNextStep(opt, history, adventureId);
  };

  const restartGame = () => {
    playClickSound();
    setHistory([]);
    setAdventureId(null);
    setInventory([]);
    setCurrentAmbientType(null);
    setIsResuming(false);
    isInitialLoadDone.current = false;
    setShowAd(true);
  };

  const toggleMusic = async () => {
    playClickSound();
    const val = !isMusicEnabled;
    setIsMusicEnabled(val);
    await AsyncStorage.setItem("musicEnabled", val.toString());
  };
  const toggleSfx = async () => {
    playClickSound();
    const val = !isSfxEnabled;
    setIsSfxEnabled(val);
    await AsyncStorage.setItem("sfxEnabled", val.toString());
  };
  const toggleTts = async () => {
    playClickSound();
    const val = !isTtsEnabled;
    setIsTtsEnabled(val);
    await AsyncStorage.setItem("ttsEnabled", val.toString());
  };
  const toggleGameSfx = async () => {
    playClickSound();
    const val = !isGameSfxEnabled;
    setIsGameSfxEnabled(val);
    await AsyncStorage.setItem("gameSfxEnabled", val.toString());
  };

  return (
    <View style={styles.mainWrapper}>
      <StatusBar style="light" />
      {(isLoading || showAd) && (
        <View style={styles.transitionContainer}>
          <ImageBackground
            source={require("../assets/images/gecis.png")}
            style={styles.transitionImage}
            resizeMode="cover"
          >
            <View style={styles.transitionOverlayLayer}>
              <ActivityIndicator size="large" color="#ff0000" />
              <Text style={styles.loadingText}>KADERİN YAZILIYOR...</Text>
            </View>
          </ImageBackground>
        </View>
      )}

      {currentPart?.isEnd ? (
        <View style={styles.fullScreenEnd}>
          <Image
            source={
              currentPart?.endType === "good"
                ? require("../assets/images/victory.png")
                : require("../assets/images/defeat.png")
            }
            style={{ width: width, height: height, position: "absolute" }}
            resizeMode="cover"
          />
          <View
            style={[
              styles.endOverlay,
              {
                backgroundColor:
                  currentPart?.endType === "good"
                    ? "rgba(0,0,0,0.3)"
                    : "rgba(0,0,0,0.65)",
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
                  ? "IŞIK SENİ KORUDU"
                  : "KADERİNDEN KAÇAMADIN"}
              </Text>
              <Text
                style={[
                  styles.endDescriptionText,
                  currentPart?.endType === "good"
                    ? { color: "#fff" }
                    : { color: "#eee" },
                ]}
              >
                {displayedText}
              </Text>
              <View style={styles.endButtonRow}>
                <TouchableOpacity style={styles.gothicButton} onPress={goHome}>
                  <View
                    style={[
                      styles.gothicButtonInner,
                      currentPart?.endType === "good"
                        ? styles.goodButtonInner
                        : styles.badButtonInner,
                    ]}
                  >
                    <Home
                      color={
                        currentPart?.endType === "good" ? "#FFD700" : "#ff0000"
                      }
                      size={16}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[
                        styles.gothicButtonText,
                        currentPart?.endType === "good"
                          ? styles.goodButtonText
                          : styles.badButtonText,
                      ]}
                    >
                      ANA SAYFA
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.gothicButton}
                  onPress={restartGame}
                >
                  <View
                    style={[
                      styles.gothicButtonInner,
                      currentPart?.endType === "good"
                        ? styles.goodButtonInner
                        : styles.badButtonInner,
                    ]}
                  >
                    <RefreshCw
                      color={
                        currentPart?.endType === "good" ? "#FFD700" : "#ff0000"
                      }
                      size={16}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[
                        styles.gothicButtonText,
                        currentPart?.endType === "good"
                          ? styles.goodButtonText
                          : styles.badButtonText,
                      ]}
                    >
                      TEKRAR DENE
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      ) : (
        <ImageBackground
          source={require("../assets/images/game5.png")}
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
                <Home color="#fff" size={18} />
              </TouchableOpacity>

              <View style={styles.badge}>
                <Text
                  style={styles.badgeText}
                >{`BÖLÜM ${history.length + 1}`}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsSettingsVisible(true)}
                style={styles.iconCircle}
              >
                <Settings color="#fff" size={18} />
              </TouchableOpacity>
            </View>

            <View style={styles.imageContainer}>
              <Image
                source={{
                  uri:
                    currentPart?.imageUrl || "https://via.placeholder.com/512",
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
                {currentPart?.options?.map((opt: string, index: number) => {
                  const isMiniGameTrigger = activeMiniGame && index === 0;

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionButton,
                        (isTyping || isLoading) && { opacity: 0.5 },
                        isMiniGameTrigger && styles.miniGameTriggerButton,
                      ]}
                      onPress={() => {
                        if (isMiniGameTrigger) {
                          playClickSound();
                          setIsMiniGameModalVisible(true);
                        } else {
                          handleOptionSelect(opt);
                        }
                      }}
                      disabled={isLoading || isTyping}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          isMiniGameTrigger && {
                            color: "#ff0000",
                            fontWeight: "bold",
                          },
                        ]}
                      >
                        {isLoading ? "..." : opt}
                      </Text>
                      {isMiniGameTrigger ? (
                        activeMiniGame.type === "lockpick" ? (
                          <Unlock color="#ff0000" size={16} />
                        ) : activeMiniGame.type === "simon" ? (
                          <Sparkles color="#ff0000" size={16} />
                        ) : (
                          <Lock color="#ff0000" size={16} />
                        )
                      ) : (
                        <ChevronRight
                          color={isTyping ? "#444" : "#ff0000"}
                          size={16}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}

                {!isTyping &&
                  activeMiniGame &&
                  (!currentPart?.options ||
                    currentPart.options.length === 0) && (
                    <TouchableOpacity
                      style={[
                        styles.optionButton,
                        styles.miniGameTriggerButton,
                      ]}
                      onPress={() => {
                        playClickSound();
                        setIsMiniGameModalVisible(true);
                      }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: "#ff0000", fontWeight: "bold" },
                        ]}
                      >
                        {activeMiniGame.type === "riddle"
                          ? "Gizemi Çözmek İçin Yaklaş"
                          : activeMiniGame.type === "simon"
                            ? "Ritüele Başla"
                            : "Kilidi Kırmaya Çalış"}
                      </Text>
                      {activeMiniGame.type === "lockpick" ? (
                        <Unlock color="#ff0000" size={16} />
                      ) : (
                        <Lock color="#ff0000" size={16} />
                      )}
                    </TouchableOpacity>
                  )}

                <View style={styles.bottomSafePadding} />
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
        <View style={styles.miniGameModalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} />

          <View style={styles.miniGameBox}>
            <TouchableOpacity
              style={styles.miniGameCloseBtn}
              onPress={() => {
                playClickSound();
                setIsMiniGameModalVisible(false);
                resetAllAnimations();
              }}
            >
              <X color="#fff" size={20} />
            </TouchableOpacity>

            {activeMiniGame?.type === "riddle" ? (
              <View style={{ width: "100%", alignItems: "center" }}>
                <View style={styles.riddleHeader}>
                  <Skull color="#ff0000" size={24} />
                  <Text style={styles.riddleTitle}>KADİM FISILTI</Text>
                  <Skull color="#ff0000" size={24} />
                </View>
                <Text style={styles.riddleQuestion}>
                  {activeMiniGame?.question}
                </Text>
                <View style={styles.riddleInputRow}>
                  <TextInput
                    style={styles.riddleInput}
                    placeholder="Cevabı yaz..."
                    placeholderTextColor="#555"
                    value={riddleInput}
                    onChangeText={(t) => {
                      setRiddleInput(t);
                      setRiddleError(null);
                    }}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.riddleSubmitBtn}
                    onPress={handleRiddleSubmit}
                  >
                    <ChevronRight color="#fff" size={24} />
                  </TouchableOpacity>
                </View>
                {riddleError && (
                  <Text style={styles.riddleErrorText}>{riddleError}</Text>
                )}
                <Text style={styles.riddleAttempts}>
                  Kalan Hak:{" "}
                  <Text style={{ color: "#ff0000", fontWeight: "bold" }}>
                    {riddleAttempts}
                  </Text>
                </Text>
              </View>
            ) : activeMiniGame?.type === "simon" ? (
              <View style={{ width: "100%", alignItems: "center" }}>
                <View style={styles.riddleHeader}>
                  <Sparkles color="#ff0000" size={24} />
                  <Text style={styles.riddleTitle}>RİTÜEL: {simonStep}/3</Text>
                  <Sparkles color="#ff0000" size={24} />
                </View>
                <View style={styles.timerContainer}>
                  <Animated.View
                    style={[
                      styles.timerBar,
                      {
                        width: simonTimer.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.simonStatus}>
                  {isWatching ? "Karanlığı izle..." : "Sırayı tekrarla!"}
                </Text>
                <View style={styles.simonGrid}>
                  {Array.from({ length: 16 }).map((_, i) => (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.8}
                      onPress={() => handleSimonPress(i)}
                      disabled={isWatching}
                      style={[
                        styles.simonRune,
                        highlightedIndex === i && styles.simonRuneActive,
                        !isWatching &&
                          userSequence.includes(i) &&
                          simonSequence[userSequence.indexOf(i)] === i &&
                          styles.simonRuneCorrect,
                      ]}
                    >
                      <Skull
                        size={18}
                        color={highlightedIndex === i ? "#fff" : "#333"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : activeMiniGame?.type === "lockpick" ? (
              <View
                style={{
                  width: "100%",
                  alignItems: "center",
                  paddingBottom: 10,
                }}
              >
                <View style={styles.riddleHeader}>
                  <Unlock color="#ff0000" size={24} />
                  <Text style={styles.riddleTitle}>
                    KİLİDİ KIR: {lockpickStep}/3
                  </Text>
                  <Unlock color="#ff0000" size={24} />
                </View>
                <View style={styles.timerContainer}>
                  <Animated.View
                    style={[
                      styles.timerBar,
                      {
                        width: lockTimer.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.simonStatus}>
                  İbreyi yeşil alanda durdur!
                </Text>

                <View style={styles.lockpickTrack}>
                  <View
                    style={[
                      styles.lockpickSweetSpot,
                      lockpickStep === 1
                        ? { left: "40%", width: "20%" }
                        : lockpickStep === 2
                          ? { left: "44%", width: "12%" }
                          : { left: "47%", width: "6%" },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.lockpickNeedle,
                      {
                        left: needleAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ["0%", "96%"],
                        }),
                      },
                    ]}
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.5}
                  style={styles.lockpickActionBtn}
                  onPressIn={handleLockpickPress}
                >
                  <Text style={styles.lockpickActionText}>MÜDAHALE ET</Text>
                </TouchableOpacity>
              </View>
            ) : null}
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
                <Text style={styles.modalTitle}>AYARLAR</Text>
                <Text style={styles.modalSubtitle}>Gerçekliği şekillendir</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  playClickSound();
                  setIsSettingsVisible(false);
                }}
                style={styles.modalCloseCircle}
              >
                <X color="#fff" size={20} />
              </TouchableOpacity>
            </View>
            <View style={styles.settingRowContainer}>
              <View style={styles.settingTopRow}>
                <View>
                  <Text style={styles.settingLabel}>KABUSUN SESİ</Text>
                  <Text style={styles.settingSubLabel}>
                    Arka plan ambiyans müziği
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={toggleMusic}
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
                minimumTrackTintColor="#ff0000"
                maximumTrackTintColor="#333"
                thumbTintColor={isMusicEnabled ? "#ff0000" : "#444"}
                onValueChange={async (val) => {
                  setMusicVolume(val);
                  await AsyncStorage.setItem("musicVolume", val.toString());
                }}
              />
            </View>
            <View style={styles.settingRowContainer}>
              <View style={styles.settingTopRow}>
                <View>
                  <Text style={styles.settingLabel}>HİKAYE FISILTISI</Text>
                  <Text style={styles.settingSubLabel}>
                    Karakter ve anlatıcı metin sesleri
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={toggleTts}
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
                minimumTrackTintColor="#ff0000"
                maximumTrackTintColor="#333"
                thumbTintColor={isTtsEnabled ? "#ff0000" : "#444"}
                onValueChange={async (val) => {
                  setTtsVolume(val);
                  await AsyncStorage.setItem("ttsVolume", val.toString());
                }}
              />
            </View>
            <View style={styles.settingRowContainer}>
              <View style={styles.settingTopRow}>
                <View>
                  <Text style={styles.settingLabel}>ANLIK KABUSLAR</Text>
                  <Text style={styles.settingSubLabel}>
                    Kapı, ayak sesi, çığlık vb. oyun efektleri
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={toggleGameSfx}
                  style={[
                    styles.toggleBtn,
                    isGameSfxEnabled && styles.toggleBtnActive,
                  ]}
                >
                  <Text style={styles.toggleText}>
                    {isGameSfxEnabled ? "AÇIK" : "KAPALI"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                step={0.1}
                value={gameSfxVolume}
                disabled={!isGameSfxEnabled}
                minimumTrackTintColor="#ff0000"
                maximumTrackTintColor="#333"
                thumbTintColor={isGameSfxEnabled ? "#ff0000" : "#444"}
                onValueChange={async (val) => {
                  setGameSfxVolume(val);
                  await AsyncStorage.setItem("gameSfxVolume", val.toString());
                }}
              />
            </View>
            <View style={styles.settingRowContainer}>
              <View style={styles.settingTopRow}>
                <View>
                  <Text style={styles.settingLabel}>YAZGI TIKLARTILARI</Text>
                  <Text style={styles.settingSubLabel}>
                    Buton tıklama ses efektleri
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={toggleSfx}
                  style={[
                    styles.toggleBtn,
                    isSfxEnabled && styles.toggleBtnActive,
                  ]}
                >
                  <Text style={styles.toggleText}>
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
                minimumTrackTintColor="#ff0000"
                maximumTrackTintColor="#333"
                thumbTintColor={isSfxEnabled ? "#ff0000" : "#444"}
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
  mainWrapper: { flex: 1, backgroundColor: "#000" },
  bgImage: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  transitionContainer: { ...StyleSheet.absoluteFillObject, zIndex: 999 },
  transitionImage: { flex: 1 },
  transitionOverlayLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  safeArea: { flex: 1 },
  loadingText: {
    color: "#ff0000",
    marginTop: 20,
    letterSpacing: 4,
    fontSize: 12,
    fontWeight: "900",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  iconCircle: {
    width: 40,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  badge: {
    backgroundColor: "rgba(255,0,0,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,0,0,0.3)",
  },
  badgeText: {
    color: "#ff0000",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  imageContainer: {
    flex: 1,
    width: width * 0.9,
    alignSelf: "center",
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 10,
  },
  aiImage: { width: "100%", height: "100%" },
  imageBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  bottomSection: { width: "100%" },
  storyContainer: { height: 120, paddingHorizontal: 25 },
  storyText: {
    color: "#e0e0e0",
    fontSize: 16,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 24,
  },
  optionsPanel: { paddingHorizontal: 20, paddingBottom: 20 },
  optionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(20,20,20,0.9)",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  miniGameTriggerButton: {
    borderColor: "#ff0000",
    backgroundColor: "rgba(50,0,0,0.5)",
  },
  optionText: { color: "#eee", fontSize: 14, flex: 1 },
  bottomSafePadding: { height: 10 },
  fullScreenEnd: { flex: 1, backgroundColor: "#000" },
  endOverlay: { ...StyleSheet.absoluteFillObject },
  endSafeArea: { flex: 1 },
  endContentBottom: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 25,
    paddingBottom: 50,
  },
  endTitle: {
    fontSize: 32,
    textAlign: "center",
    marginBottom: 15,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  endTitleBad: {
    color: "#ff0000",
    textShadowColor: "rgba(255,0,0,1)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  endTitleGood: {
    color: "#FFD700",
    textShadowColor: "rgba(255,215,0,0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  endDescriptionText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 35,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 8,
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
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 12,
  },
  gothicButtonInner: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 9,
    borderWidth: 1.5,
  },
  goodButtonInner: {
    backgroundColor: "rgba(253, 245, 230, 0.15)",
    borderColor: "#D4AF37",
  },
  badButtonInner: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderColor: "#ff0000",
  },
  gothicButtonText: { fontWeight: "900", fontSize: 13, letterSpacing: 1.5 },
  goodButtonText: {
    color: "#FFD700",
    textShadowColor: "rgba(255,215,0,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  badButtonText: {
    color: "#ff0000",
    textShadowColor: "rgba(255,0,0,1)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },

  miniGameModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  miniGameBox: {
    width: width * 0.9,
    backgroundColor: "#050505",
    padding: 25,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#550000",
    alignItems: "center",
    shadowColor: "#ff0000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  miniGameCloseBtn: {
    position: "absolute",
    top: 15,
    right: 15,
    width: 32,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  riddleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  riddleTitle: {
    fontFamily: "Eater",
    color: "#ff0000",
    fontSize: 24,
    marginHorizontal: 15,
    letterSpacing: 2,
    textShadowColor: "rgba(255,0,0,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  riddleQuestion: {
    fontFamily: "Pirata",
    color: "#ddd",
    fontSize: 19,
    textAlign: "center",
    marginBottom: 25,
    fontStyle: "italic",
    lineHeight: 28,
  },
  riddleInputRow: {
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  riddleInput: {
    flex: 1,
    backgroundColor: "#111",
    color: "#fff",
    fontSize: 18,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#444",
    textAlign: "center",
    marginRight: 15,
  },
  riddleSubmitBtn: {
    backgroundColor: "#330000",
    width: 55,
    height: 55,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#ff0000",
  },
  riddleErrorText: {
    fontFamily: "Pirata",
    color: "#ff4444",
    fontSize: 18,
    marginBottom: 15,
    textAlign: "center",
    textShadowColor: "rgba(255,0,0,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  riddleAttempts: { fontFamily: "Pirata", color: "#888", fontSize: 18 },

  timerContainer: {
    width: "100%",
    height: 8,
    backgroundColor: "#1a1a1a",
    borderRadius: 4,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#333",
  },
  timerBar: { height: "100%", backgroundColor: "#ff0000" },
  simonStatus: {
    fontFamily: "Pirata",
    color: "#aaa",
    fontSize: 20,
    marginBottom: 20,
  },
  simonGrid: {
    width: width * 0.8,
    height: width * 0.8,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  simonRune: {
    width: "22%",
    height: "22%",
    margin: "1.5%",
    backgroundColor: "#0a0a0a",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#222",
  },
  simonRuneActive: {
    backgroundColor: "#8b0000",
    borderColor: "#ff0000",
    shadowColor: "#ff0000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 10,
  },
  simonRuneCorrect: { backgroundColor: "#330000", borderColor: "#660000" },

  // LOCKPICK STYLES
  lockpickTrack: {
    width: "100%",
    height: 40,
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#333",
    overflow: "hidden",
    position: "relative",
    marginBottom: 30,
    marginTop: 10,
  },
  lockpickSweetSpot: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 255, 0, 0.3)",
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: "#00ff00",
  },
  lockpickNeedle: {
    position: "absolute",
    top: -2,
    bottom: -2,
    width: 8,
    backgroundColor: "#ff0000",
    borderRadius: 4,
    shadowColor: "#ff0000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  lockpickActionBtn: {
    backgroundColor: "rgba(139, 0, 0, 0.3)",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#ff0000",
    width: "100%",
    alignItems: "center",
  },
  lockpickActionText: {
    fontFamily: "Pirata",
    color: "#fff",
    fontSize: 22,
    letterSpacing: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "flex-end",
  },
  modalContent: {
    width: width,
    backgroundColor: "#020202",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 25,
    borderWidth: 1.5,
    borderColor: "#1a1a1a",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: { fontFamily: "Eater", color: "#ff0000", fontSize: 26 },
  modalSubtitle: { fontFamily: "Pirata", color: "#444", fontSize: 16 },
  modalCloseCircle: {
    width: 44,
    height: 44,
    backgroundColor: "#0a0a0a",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  settingRowContainer: {
    marginVertical: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  settingTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  slider: { width: "100%", height: 40 },
  settingLabel: {
    fontFamily: "Pirata",
    color: "#eee",
    fontSize: 18,
    letterSpacing: 1,
  },
  settingSubLabel: { color: "#555", fontSize: 11, marginTop: 4 },
  toggleBtn: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    minWidth: 85,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: "rgba(139, 0, 0, 0.15)",
    borderColor: "#ff0000",
  },
  toggleText: { color: "#fff", fontFamily: "Pirata", fontSize: 16 },
});
