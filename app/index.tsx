import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  Clock,
  Settings,
  Skull,
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

// SLIDER PAKETİ
import Slider from "@react-native-community/slider";

import { Butcherman_400Regular } from "@expo-google-fonts/butcherman";
import { Eater_400Regular } from "@expo-google-fonts/eater";
import { PirataOne_400Regular } from "@expo-google-fonts/pirata-one";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { Audio } from "expo-av";
import { useFonts } from "expo-font";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";

const { width, height } = Dimensions.get("window");

SplashScreen.preventAutoHideAsync();

const exampleThemes = [
  // --- GOTİK & KLASİK KORKU ---
  {
    id: 1,
    title: "Kanlı Balo",
    prompt: "Venedik masquerade balosunda maskelerin ardındaki vahşi cinayet.",
  },
  {
    id: 2,
    title: "Kuzgunun Vasiyeti",
    prompt:
      "Vefat eden eksantrik bir akrabanın malikanesinde, canlanan tablolar ve kilitli sırlar arasında hayatta kal.",
  },
  {
    id: 3,
    title: "Gotik Şato",
    prompt:
      "Transilvanya'da fırtınalı bir gecede, vampir lordunun uyanışından önce dehlizlerden kurtul.",
  },
  {
    id: 4,
    title: "Victoria Akıl Hastanesi",
    prompt:
      "19. yüzyıldan kalma, duvarları çığlıklarla dolu bir tımarhanede kendi hafızanı ve çıkışı ara.",
  },
  {
    id: 5,
    title: "Kızıl Veba Şehri",
    prompt:
      "Ölümün kol gezdiği lanetli bir Orta Çağ kasabasında, veba doktorlarından kaçış.",
  },

  // --- PSİKOLOJİK & ZİHİNSEL GERİLİM ---
  {
    id: 6,
    title: "Sonsuz Zaman Döngüsü",
    prompt:
      "Aynı cinayet gecesini tekrar tekrar yaşadığın, her ölümünde gölgelerin daha da karanlıklaştığı bir zaman döngüsü.",
  },
  {
    id: 7,
    title: "Aynalar Labirenti",
    prompt:
      "Eski bir panayırın aynalar labirentinde kendi yansımalarının seni avlamaya başlaması.",
  },
  {
    id: 8,
    title: "Uyku Felci",
    prompt:
      "Yatağında uyanıksın ama kıpırdayamıyorsun. Odanın köşesindeki gölge sana doğru yaklaşırken uyanmanın bir yolunu bul.",
  },
  {
    id: 9,
    title: "Zihin Kontrol Deneyi",
    prompt:
      "1960'ların gizli MK-Ultra laboratuvarında denek olarak uyandın. Gerçekle halüsinasyonu ayırt et.",
  },
  {
    id: 10,
    title: "Gölge İnsanlar",
    prompt:
      "Günlerdir uyumadın. Göz ucuyla gördüğün gölgelerin aslında seni izleyen varlıklar olduğunu fark ediyorsun.",
  },

  // --- BİLİMKURGU & UZAY (SCI-FI HORROR) ---
  {
    id: 11,
    title: "Derin Uzay Dehşeti",
    prompt:
      "İletişimi kopmuş karanlık bir uzay istasyonunda, mürettebatı ele geçiren zeki bir parazite karşı hayatta kal.",
  },
  {
    id: 12,
    title: "Kusursuz Yapay Zeka",
    prompt:
      "Ultra modern akıllı evinin yapay zekası, seni evin içinde hapsedip ölümcül testlere tabi tutuyor.",
  },
  {
    id: 13,
    title: "Yalnız Kozmonot",
    prompt:
      "Geminden koptun ve uzay boşluğunda sürükleniyorsun. Oksijenin biterken kaskının içinden yabancı fısıltılar geliyor.",
  },
  {
    id: 14,
    title: "Biyolojik Tesis",
    prompt:
      "Karantina altındaki yeraltı laboratuvarında, kontrolden çıkan mutasyona uğramış deneklerden gizlenerek kaç.",
  },
  {
    id: 15,
    title: "Sanal Gerçeklik Tuzağı",
    prompt:
      "Taktığın VR başlığını çıkaramıyorsun. Oyundaki ölüm artık gerçek hayattaki ölümün anlamına geliyor.",
  },

  // --- KAÇIŞ & BULMACA (ESCAPE ROOM / THRILLER) ---
  {
    id: 16,
    title: "Ölümcül Tuzak Odası",
    prompt:
      "Bileğinden zincirlenmiş halde, her tarafı ölümcül mekanizmalarla dolu bir mahzende uyandın. Süren azalıyor.",
  },
  {
    id: 17,
    title: "Yer Altı Mezarları",
    prompt:
      "Paris yer altı mezarlarının (Catacombs) haritasız karanlığında çıkışı ararken peşindeki tarikatla yüzleş.",
  },
  {
    id: 18,
    title: "Asansör Paradoksu",
    prompt:
      "Yanlış bir tuşa bastın. Asansör kapıları her açıldığında cehennemin farklı bir katmanına iniyorsun.",
  },
  {
    id: 19,
    title: "Kuklacının Atölyesi",
    prompt:
      "Gözleri seni izleyen porselen bebeklerle dolu kilitli bir odada, iplerin senin elinde olmadığını fark et.",
  },
  {
    id: 20,
    title: "Karanlık İnternet",
    prompt:
      "Bilgisayarında açtığın yanlış bir link yüzünden evine girmeye çalışan maskeli katillere karşı evi savun.",
  },

  // --- MİSTİK, TARİKAT & DOĞAÜSTÜ ---
  {
    id: 21,
    title: "Gölge Ayini",
    prompt:
      "Kadim bir orman tarikatı tarafından kaçırıldın. Kan donduran bir ayin başlamadan mahzenlerden kaç.",
  },
  {
    id: 22,
    title: "Oda 1408",
    prompt:
      "Tarih boyunca içine giren kimsenin sağ çıkmadığı lanetli bir otel odasında sabahı etmeye çalış.",
  },
  {
    id: 23,
    title: "Fener Bekçisi",
    prompt:
      "Sisler içindeki ıssız bir deniz fenerinde, dalgaların arasından yükselen devasa, kozmik bir dehşetle yüzleş.",
  },
  {
    id: 24,
    title: "Cadı Mahkemesi",
    prompt:
      "1692 Salem'inde haksız yere suçlanıp hücreye atıldın. Gerçek cadıyı bulup ruhunu şeytandan kurtar.",
  },
  {
    id: 25,
    title: "Şeytan Çıkarma",
    prompt:
      "Terke edilmiş bir kilisede, içine iblis girmiş bir varlıkla aynı odaya kilitlendin. İnancını koru.",
  },

  // --- HAYATTA KALMA & İZOLASYON (SURVIVAL) ---
  {
    id: 26,
    title: "Antarktika Araştırma",
    prompt:
      "Binlerce yıllık buzun altından çıkarılan şeyin sadece bir ceset olmadığını fark ettiğinde telsizler bozuluyor.",
  },
  {
    id: 27,
    title: "Radyo Kulesi",
    prompt:
      "Ormanın ortasındaki yangın gözetleme kulesinde, telsizden yardım çığlıkları duyarken ağaçların sana doğru yürüdüğünü gör.",
  },
  {
    id: 28,
    title: "Yalnız Dağ Evi",
    prompt:
      "Şiddetli bir kar fırtınasında mahsur kaldığın ahşap dağ evinde, dışarıda uluyan aç bir Wendigo'ya karşı diren.",
  },
  {
    id: 29,
    title: "Issız Çöl Moteli",
    prompt:
      "Hiçliğin ortasındaki bir otoyol kenarı motelinde, gece çöktüğünde avlanan insan dışı varlıklara yem olma.",
  },
  {
    id: 30,
    title: "Derin Deniz Denizaltısı",
    prompt:
      "Okyanusun en derin noktasında basınç altında çatırdarken, dışarıdan gövdeye vuran devasa pençelerden sağ kurtul.",
  },

  // --- GİZEM & PARANORMAL ---
  {
    id: 31,
    title: "Morg Nöbeti",
    prompt:
      "Hastane morgunda gece bekçisiyken, 3 numaralı soğutucu çekmeceden gelen tırmalama sesleriyle başa çık.",
  },
  {
    id: 32,
    title: "Kayıp Kaset",
    prompt:
      "İzleyenleri yavaş yavaş delirten lanetli bir VHS kasetin sırrını çözerken, televizyondaki varlık odaya sızıyor.",
  },
  {
    id: 33,
    title: "Hayalet Gemi",
    prompt:
      "Okyanusta sürüklenen ve içinde tek bir mürettebat bile bulunmayan lüks bir yolcu gemisine ayak bas.",
  },
  {
    id: 34,
    title: "Kabus Aynası",
    prompt:
      "Eski bir malikanede bulduğun devasa bir aynadaki yansımanın, seninle aynı hareketleri yapmadığını fark et.",
  },
  {
    id: 35,
    title: "Lanetli Müzik Kutusu",
    prompt:
      "Çalmaya başladığında etraftaki eşyaları havaya kaldıran ve geçmişin acımasız ruhlarını çağıran kutuyu yok et.",
  },

  // --- FOLKLOR & ŞEHİR EFSANELERİ ---
  {
    id: 36,
    title: "Gece Treni",
    prompt:
      "Hiçbir istasyonda durmayan, pencerelerinden dışarısı görünmeyen ve yolcuları şeytani varlıklara dönüşen bir tren.",
  },
  {
    id: 37,
    title: "Sessiz Kütüphane",
    prompt:
      "Okunan her kelimenin canavarları çağırdığı, sonsuz koridorlara sahip kadim bir yeraltı kütüphanesinden sessizce kaç.",
  },
  {
    id: 38,
    title: "Kanlı Hasat",
    prompt:
      "Göz alabildiğine uzanan mısır tarlalarında, dolunay vakti canlanan ve kan arayan korkuluklardan kaçış.",
  },
  {
    id: 39,
    title: "Yeraltı Metrosu",
    prompt:
      "Son seferde kapıların kilitlendiği ve ışıkların söndüğü bir metro istasyonunda, tünellerden gelen hırıltılarla yüzleş.",
  },
  {
    id: 40,
    title: "Unutulmuş Maden",
    prompt:
      "Yüz yıl önce göçük altında kalmış bir altın madeninde, karanlıkta gözleri parlayan madenci ruhlarıyla yüzleş.",
  },

  // --- KIYAMET SONRASI & DİĞER KABUSLAR ---
  {
    id: 41,
    title: "Radyoaktif Çorak Topraklar",
    prompt:
      "Nükleer bir felaketten sonra, radyasyonun delirttiği kana susamış yaratıkların arasından temiz bölgeye ulaş.",
  },
  {
    id: 42,
    title: "Arafın Kapısı",
    prompt:
      "Ölüm ile yaşam arasındaki ince çizgide, anılarını hatırlamaya çalışırken ruhunu isteyen azrailden kaç.",
  },
  {
    id: 43,
    title: "Cehennem Çukuru",
    prompt:
      "Sıradan bir bodrum katında aniden açılan boyutlar arası bir yırtıktan gelen zebani ordusunu mühürle.",
  },
  {
    id: 44,
    title: "Ölüler Şehri",
    prompt:
      "Sadece ruhların görebildiği, araf ile cehennem arasında sıkışmış gri bir şehirde iblislerden gizlen.",
  },
  {
    id: 45,
    title: "Lanetli Batık Şehir",
    prompt:
      "Okyanusun dibinde keşfedilen antik bir şehirde, oksijenin tükenirken derinliklerin sakladığı canavarlardan kaçış.",
  },
  {
    id: 46,
    title: "Karanlık Sirk",
    prompt:
      "Gece yarısı aniden kasabaya gelen bir sirkte, ruhunu şeytana satmış ucube palyaçolardan kurtul.",
  },
  {
    id: 47,
    title: "Antik Mısır Mezarı",
    prompt:
      "Firavunun lanetinin uyandığı, ölümcül tuzaklar ve zehirli gazlarla dolu yeraltı labirentinden çıkış yolu bul.",
  },
  {
    id: 48,
    title: "Sisli Bataklık",
    prompt:
      "İçine girenleri yutan ve yansımalarıyla avlayan, fener ışıklarının sadece ölümü çağırdığı bir bataklık.",
  },
  {
    id: 49,
    title: "Siyah Giyen Adamlar",
    prompt:
      "Gerçeği gördüğün için peşine düşen, yüzleri olmayan ve duvarlardan geçebilen takım elbiseli gölge adamlardan kaç.",
  },
  {
    id: 50,
    title: "Kayıp Orman Kampı",
    prompt:
      "Gözlerden uzak bir ormanda kamp yaparken, ağaçların arasından senin sesini taklit eden o aç kötülük uyanıyor.",
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

  // --- AYARLAR STATE ---
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.2);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [ttsVolume, setTtsVolume] = useState(1.0);
  const [isGameSfxEnabled, setIsGameSfxEnabled] = useState(true);
  const [gameSfxVolume, setGameSfxVolume] = useState(0.6);
  const [isSfxEnabled, setIsSfxEnabled] = useState(true);
  const [sfxVolume, setSfxVolume] = useState(1.0);

  const bgmSound = useRef<Audio.Sound | null>(null);

  const [fontsLoaded] = useFonts({
    Eater: Eater_400Regular,
    Butcher: Butcherman_400Regular,
    Pirata: PirataOne_400Regular,
  });

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
          if (Platform.OS === "android") {
            storedId =
              Application.androidId ||
              `android_${Math.random().toString(36).substring(2, 9)}`;
          } else {
            const iosId = await Application.getIosIdForVendorAsync();
            storedId =
              iosId || `ios_${Math.random().toString(36).substring(2, 9)}`;
          }
          if (storedId)
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
        if ((await getBool("sfxEnabled")) !== null)
          setIsSfxEnabled((await getBool("sfxEnabled")) === "true");
        if ((await getBool("ttsEnabled")) !== null)
          setIsTtsEnabled((await getBool("ttsEnabled")) === "true");
        if ((await getBool("gameSfxEnabled")) !== null)
          setIsGameSfxEnabled((await getBool("gameSfxEnabled")) === "true");

        const mVol = await getFloat("musicVolume");
        if (mVol !== null) setMusicVolume(mVol);
        const tVol = await getFloat("ttsVolume");
        if (tVol !== null) setTtsVolume(tVol);
        const gVol = await getFloat("gameSfxVolume");
        if (gVol !== null) setGameSfxVolume(gVol);
        const sVol = await getFloat("sfxVolume");
        if (sVol !== null) setSfxVolume(sVol);
      } catch (e) {
        console.error(e);
      }
    };
    initializeApp();
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const startAmbient = async () => {
        try {
          if (!bgmSound.current) {
            const { sound } = await Audio.Sound.createAsync(
              require("../assets/sounds/bg_ambient.mp3"),
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
          }
        } catch (e) {
          console.log("Ambient sound error:", e);
        }
      };
      startAmbient();
      return () => {
        isActive = false;
        if (bgmSound.current) bgmSound.current.pauseAsync();
      };
    }, [isMusicEnabled, musicVolume]),
  );

  useEffect(() => {
    if (bgmSound.current) {
      if (isMusicEnabled) {
        bgmSound.current.playAsync();
        bgmSound.current.setVolumeAsync(musicVolume);
      } else {
        bgmSound.current.pauseAsync();
      }
    }
  }, [isMusicEnabled, musicVolume]);

  const playClickSound = async () => {
    if (!isSfxEnabled) return;
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/sounds/mouse_click.mp3"),
      );
      await sound.setVolumeAsync(sfxVolume);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) sound.unloadAsync();
      });
    } catch (error) {}
  };

  const startGame = async () => {
    playClickSound();
    if (!theme.trim()) {
      setIsAlertVisible(true);
      return;
    }
    let currentId =
      userId || (await SecureStore.getItemAsync("user_unique_id"));
    router.push({
      pathname: "/game",
      params: {
        theme: theme.trim(),
        duration,
        userId: currentId,
        initialMusic: isMusicEnabled ? "true" : "false",
        initialSfx: isSfxEnabled ? "true" : "false",
        initialTts: isTtsEnabled ? "true" : "false",
        initialGameSfx: isGameSfxEnabled ? "true" : "false",
        musicVolume: musicVolume.toString(),
        ttsVolume: ttsVolume.toString(),
        gameSfxVolume: gameSfxVolume.toString(),
        sfxVolume: sfxVolume.toString(),
      },
    });
  };

  const openHistory = async () => {
    playClickSound();
    let currentId =
      userId || (await SecureStore.getItemAsync("user_unique_id"));
    if (!currentId) return;
    setIsHistoryLoading(true);
    setIsHistoryVisible(true);
    try {
      const response = await fetch(
        `https://fatal-choice-backend.vercel.app/api/get-adventures?userId=${currentId}`,
      );
      const data = await response.json();
      // ÇÖZÜM BURADA: Gelen veri gerçekten bir dizi (Array) mi diye kontrol ediyoruz
      setAdventures(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setAdventures([]); // Hata olursa da boş dizi yap ki çökmesin
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const deleteAdventure = async (id: string) => {
    playClickSound();
    try {
      const response = await fetch(
        `https://fatal-choice-backend.vercel.app/api/delete-adventure?id=${id}`,
        { method: "DELETE" },
      );
      if (response.ok)
        setAdventures((prev) => prev.filter((adv) => adv.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdventureClick = (adv: any) => {
    playClickSound();
    setIsHistoryVisible(false);
    router.push({
      pathname: "/game",
      params: {
        theme: adv.theme,
        duration: "medium",
        adventureId: adv.id,
        resumedHistory: JSON.stringify(adv.history),
        userId,
        initialMusic: isMusicEnabled ? "true" : "false",
        initialSfx: isSfxEnabled ? "true" : "false",
        initialTts: isTtsEnabled ? "true" : "false",
        initialGameSfx: isGameSfxEnabled ? "true" : "false",
        musicVolume: musicVolume.toString(),
        ttsVolume: ttsVolume.toString(),
        gameSfxVolume: gameSfxVolume.toString(),
        sfxVolume: sfxVolume.toString(),
      },
    });
  };

  const filteredAdventures = adventures.filter((adv) =>
    activeTab === "completed" ? adv.is_completed : !adv.is_completed,
  );

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: "#000" }}>
      <ImageBackground
        source={require("../assets/images/bg_3.png")}
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
                <Settings
                  size={20}
                  color="rgba(255,255,255,0.6)"
                  strokeWidth={1.5}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openHistory}
                style={styles.smallIconBtn}
              >
                <BookOpen
                  size={20}
                  color="rgba(255,255,255,0.6)"
                  strokeWidth={1.5}
                />
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.keyboardView}
            >
              <View style={styles.content}>
                <View style={styles.header}>
                  <Text style={styles.mainEaterTitle}>ÖLÜMCÜL SEÇİM</Text>
                </View>

                <View style={styles.glassPanel}>
                  <View style={styles.inputSection}>
                    <Text style={styles.sectionLabel}>
                      HİKAYE TEMANI BELİRLE
                    </Text>
                    <View style={styles.inputWrapper}>
                      <Skull
                        size={16}
                        color="#ff0000"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        placeholder="Kendi kabusunu yaz..."
                        placeholderTextColor="#444"
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
                    <Text
                      style={styles.startTriggerText}
                      adjustsFontSizeToFit
                      numberOfLines={1}
                    >
                      KABUSU BAŞLAT
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </SafeAreaView>

        {/* CUSTOM ALERT */}
        <Modal visible={isAlertVisible} animationType="fade" transparent={true}>
          <View style={styles.customAlertOverlay}>
            <View style={styles.customAlertBox}>
              <View style={styles.alertIconContainer}>
                <AlertTriangle color="#ff0000" size={32} />
              </View>
              <Text style={styles.alertTitle}>BOŞLUKTAN KAÇAMAZSIN</Text>
              <Text style={styles.alertMessage}>
                Karanlığa adım atmadan önce bir hikaye teması fısıldamalısın.
                Yazgı isimsiz başlayamaz...
              </Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => {
                  playClickSound();
                  setIsAlertVisible(false);
                }}
              >
                <Text style={styles.alertButtonText}>ANLIYORUM</Text>
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
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>ESKİ YAZGILAR</Text>
                  <Text style={styles.modalSubtitle}>
                    Karanlıkta bıraktığın izler
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    playClickSound();
                    setIsHistoryVisible(false);
                  }}
                  style={styles.modalCloseCircle}
                >
                  <X color="#fff" size={20} />
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
                    color={activeTab === "completed" ? "#ff0000" : "#444"}
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
                    color={activeTab === "pending" ? "#ff0000" : "#444"}
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
                  <ActivityIndicator size="large" color="#ff0000" />
                </View>
              ) : (
                <FlatList
                  data={filteredAdventures}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <View style={styles.cardWrapper}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleAdventureClick(item)}
                        style={[
                          styles.adventureCard,
                          {
                            borderLeftColor: item.is_completed
                              ? "#00ff00"
                              : "#ffaa00",
                          },
                        ]}
                      >
                        <View style={styles.advContent}>
                          <Text style={styles.advTheme} numberOfLines={1}>
                            {item.theme}
                          </Text>
                          <View style={styles.advDateRow}>
                            <Clock
                              size={10}
                              color="#444"
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
                          <View style={styles.advFinalContainer}>
                            <Text style={styles.advFinal} numberOfLines={2}>
                              "
                              {item.final_text || "Yazgı henüz tamamlanmadı..."}
                              "
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => deleteAdventure(item.id)}
                          style={styles.deleteBtnStatic}
                        >
                          <Trash2 size={18} color="#ff0000" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Skull size={40} color="#ff0000" />
                      <Text style={styles.emptyText}>Henüz bir ruh yok...</Text>
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
                  <Text style={styles.modalTitle}>AYARLAR</Text>
                  <Text style={styles.modalSubtitle}>
                    Gerçekliği şekillendir
                  </Text>
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
                    onPress={async () => {
                      playClickSound();
                      const val = !isGameSfxEnabled;
                      setIsGameSfxEnabled(val);
                      await AsyncStorage.setItem(
                        "gameSfxEnabled",
                        val.toString(),
                      );
                    }}
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
      </ImageBackground>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  safeArea: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  keyboardView: { flex: 1, width: "100%" },
  content: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 25,
    paddingTop: 70,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  header: { alignItems: "center" },
  mainEaterTitle: {
    fontFamily: "Eater",
    fontSize: 48,
    color: "#ff0000",
    textAlign: "center",
    letterSpacing: 2,
    textShadowColor: "rgba(255,0,0,0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  glassPanel: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: "#330000",
  },
  sectionLabel: {
    fontFamily: "Pirata",
    color: "#555",
    fontSize: 14,
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputSection: { width: "100%", marginBottom: 12 },
  inputWrapper: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 0, 0, 0.4)",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, padding: 8, color: "#fff", fontSize: 14, height: 40 },
  examplesSection: { height: 50, width: "100%", marginBottom: 15 },
  card: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    marginRight: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.3)",
    height: 40,
  },
  activeCard: {
    borderColor: "rgba(255, 0, 0, 0.6)",
    backgroundColor: "rgba(139, 0, 0, 0.15)",
  },
  cardTitle: {
    fontFamily: "Pirata",
    color: "rgba(255,255,255,0.4)",
    fontSize: 15,
  },
  activeCardTitle: { color: "#ff0000" },
  durationSection: { width: "100%", marginBottom: 10 },
  durationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  dText: {
    fontFamily: "Pirata",
    color: "rgba(255,255,255,0.3)",
    fontSize: 18,
    letterSpacing: 1,
  },
  activeDText: {
    color: "#ff0000",
    textShadowColor: "rgba(255,0,0,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  durationSeparator: {
    fontFamily: "Pirata",
    color: "rgba(255,255,255,0.2)",
    fontSize: 18,
    marginHorizontal: 5,
  },
  startTrigger: {
    paddingVertical: 10,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
  startTriggerText: {
    fontFamily: "Butcher",
    color: "#ff0000",
    fontSize: 50,
    letterSpacing: 1,
    textShadowColor: "rgba(255,0,0,0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    textAlign: "center",
    width: "100%",
  },
  customAlertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  customAlertBox: {
    width: width * 0.8,
    backgroundColor: "#0a0a0a",
    borderRadius: 20,
    padding: 25,
    borderWidth: 2,
    borderColor: "#330000",
    alignItems: "center",
    shadowColor: "#ff0000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  alertIconContainer: { marginBottom: 15, opacity: 0.8 },
  alertTitle: {
    fontFamily: "Eater",
    color: "#ff0000",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 15,
    letterSpacing: 1,
  },
  alertMessage: {
    fontFamily: "Pirata",
    color: "#888",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 25,
  },
  alertButton: {
    backgroundColor: "rgba(139, 0, 0, 0.2)",
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ff0000",
  },
  alertButtonText: {
    fontFamily: "Pirata",
    color: "#fff",
    fontSize: 18,
    letterSpacing: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.97)",
    justifyContent: "flex-end",
  },
  modalContent: {
    width: width,
    height: height * 0.82,
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
    marginBottom: 25,
  },
  modalTitle: {
    fontFamily: "Eater",
    color: "#ff0000",
    fontSize: 26,
    textShadowColor: "rgba(255,0,0,0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
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
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: "#000",
    borderRadius: 10,
    padding: 5,
    borderWidth: 1,
    borderColor: "#111",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  activeTab: { backgroundColor: "rgba(139,0,0,0.2)", borderRadius: 8 },
  tabText: { fontFamily: "Pirata", color: "#333", fontSize: 16, marginLeft: 8 },
  activeTabText: { color: "#ff0000" },
  cardWrapper: { marginBottom: 15 },
  adventureCard: {
    backgroundColor: "#050505",
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  advContent: { flex: 1, paddingRight: 10 },
  advTheme: { fontFamily: "Pirata", color: "#ddd", fontSize: 19 },
  advDateRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  advDate: { color: "#333", fontSize: 11 },
  advHistory: {
    color: "#600000",
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: 8,
  },
  advFinalContainer: {
    backgroundColor: "#000",
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: "#1a1a1a",
  },
  advFinal: { color: "#666", fontSize: 13, fontStyle: "italic" },
  deleteBtnStatic: {
    padding: 12,
    backgroundColor: "rgba(255,0,0,0.03)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#220000",
  },
  emptyContainer: { alignItems: "center", marginTop: 120, opacity: 0.4 },
  emptyText: {
    fontFamily: "Pirata",
    color: "#222",
    marginTop: 15,
    fontSize: 18,
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
