# Price Action Decision Support Engine

## Proje Özeti

Bu proje, kripto paralar için **perpetual trading** odaklı bir **Price Action analiz ve karar destek sistemi**dir. Program kullanıcıya işlem önerisi vermez, sadece mevcut piyasa durumunu analiz eder ve potansiyel **Long ve Short setup'ları** güvenilirlik skorlarıyla birlikte sunar. **Nihai karar tamamen kullanıcıya aittir.**

---

## 🎯 Programın Amacı

### Ana Hedef
Kullanıcının günlük **1-2 kaliteli işlem** yapmasına yardımcı olmak için:
- Gerçek zamanlı fiyat verilerini analiz etmek
- **5 farklı price action tekniği** ile potansiyel setup'ları tespit etmek
- Risk/Reward hesaplamaları yapmak
- Entry, Stop Loss ve Take Profit seviyelerini belirlemek
- **Mentor-style görsellerle** kullanıcının eğitimini desteklemek

### Kullanıcı Profili
- **İşlem tipi:** Perpetual (Long + Short pozisyonlar)
- **Frekans:** Günde max 1-2 işlem
- **Risk toleransı:** Düşük (%1 risk/işlem)
- **Zaman dilimi:** Tercih edilen 4H, desteklenen 15m/1H/4H/1D
- **Stil:** Konservatif, üst üste kayıplardan kaçınan

---

## ✅ Tamamlanan Özellikler

### 1. Çoklu Price Action Teknik Algılama
| Teknik | Açıklama | Durum |
|--------|----------|-------|
| **Order Block** | Güçlü impuls öncesi son ters mum | ✅ |
| **Fair Value Gap (FVG)** | 3 mum arası fiyat boşluğu | ✅ |
| **Range Trading** | Konsolidasyon bölgesi tespiti | ✅ |
| **Break of Structure (BOS)** | Trend yapısı kırılımı | ✅ |
| **Liquidity Sweep** | Stop avı tespiti | ✅ |

### 2. Signal Engine V3 (Institutional Grade)
| Özellik | Açıklama | Durum |
|---------|----------|-------|
| **Swing Detection** | 5-Candle Fractal algoritması | ✅ |
| **BOS Detection** | Body close > Swing High/Low | ✅ |
| **MSS Detection** | İlk trende karşı yapı kırılımı | ✅ |
| **Order Blocks** | BOS öncesi son ters mum + FVG | ✅ |
| **Breaker Blocks** | Kırılan OB → Direnç/Destek | ✅ |
| **Mitigation Blocks** | Failure swing sonrası zone | ✅ |

### 3. Universal Visual Protocol (Mentor-Style)
| Özellik | Long | Short | Durum |
|---------|------|-------|-------|
| **Click-to-Zoom** | ✅ | ✅ | ✅ |
| **Entry Zone** | 🟢 Green | 🔴 Red | ✅ |
| **Entry/Stop Labels** | ✅ | ✅ | ✅ |
| **🔍 Interactive Icons** | ✅ | ✅ | ✅ |
| **Mentor Labels** | "Wait for Price..." | "SHORT Entry Zone" | ✅ |

### 4. Condition Tracker
- ✅ Setup koşullarını gerçek zamanlı takip
- ✅ ✅⏳❌ status ikonları
- ✅ Koşul tıklandığında grafikte gösterme
- ✅ visualMeta ile zone/line/arrow rendering

### 5. Long & Short Setup Sistemi
- ✅ **Perpetual Mod:** Hem long hem short setup'lar her zaman analiz edilir
- ✅ **Gruplandırılmış Panel:** LONG (yeşil) ve SHORT (kırmızı) ayrı bölümler
- ✅ **Teknik Etiketi:** Her setup'ın altında hangi teknikle tespit edildiği
- ✅ **En İyi 3 Setup:** Her yön için en yüksek güvenilirlikli 3 setup

### 6. Grafik Görselleştirme
- ✅ **Gerçek Candlestick:** Lightweight-Charts ile profesyonel mum grafikleri
- ✅ **Reference Zone'lar:** Setup seçildiğinde ilgili bölge grafikte gösterilir
  - 📦 Order Block (mavi/yeşil kutu)
  - 📐 FVG (turuncu kutu)
  - 📊 Range (mor kutu)
- ✅ **Etiketli Zone'lar:** Her zone'un sol üstünde etiketi görünür
- ✅ **Entry/Stop/TP Çizgileri:** Seviyeleri net gösteren yatay çizgiler
- ✅ **Çizim Araçları:** Yatay ve diagonal çizgi çizme, sürükle-bırak

### 7. Trade Tracker
- ✅ Manuel işlem girişi (Long/Short)
- ✅ Entry, Stop Loss, Take Profit
- ✅ Position size ve notlar
- ✅ İşlem kapatma ve P&L hesabı

### 8. Backtest Engine (Strateji Simülatörü) 🧪
- ✅ **Historical Testing:** Geçmiş veriler üzerinde stratejiyi test etme.
- ✅ **Look-Ahead Bias Prevention:** Geleceği görmeden (sliced data) gerçekçi simülasyon.
- ✅ **Performance Metrics:** Win Rate, Net Profit, Max Drawdown, Profit Factor raporu.
- ✅ **Trade Log:** Her bir işlemin detaylı giriş/çıkış ve P&L kaydı.

### 9. Market Sentinel (Scanner Engine) 📡
- ✅ **Multi-Pair Monitoring:** Watchlist'teki tüm coinleri arka planda tarar.
- ✅ **Anlık Sinyal:** Long/Short saptandığında anında bildirim.
- ✅ **Power Toggle:** Taramayı tek tıkla başlatıp durdurma.
- ✅ **Akıllı Filtre:** Sadece yüksek güvenilirlikli setup'ları öne çıkarır.

### 10. Güvenilirlik Skoru Sistemi
**Toplam 100 puan üzerinden hesaplanır:**

| Faktör | Max Puan | Açıklama |
|--------|----------|----------|
| Trend Uyumu | 25 | Setup yönü + trend uyumu |
| S/R Gücü | 20 | Seviye dokunuş sayısı |
| Pattern Kalitesi | 20 | Teknik güvenilirliği |
| Hacim Doğrulaması | 15 | Ortalama hacim karşılaştırması |
| MTF Confluence | 10 | Çoklu TF uyumu |
| Tarihsel Başarı | 10 | Benzer pattern win rate |

### 11. AI Chatbot
- ✅ 30+ price action terimi
- ✅ Güvenilirlik hesaplama açıklamaları
- ✅ Trade stratejisi soruları

### 12. Diğer Özellikler
- ✅ Position Calculator
- ✅ Multi-Timeframe (15m/1H/4H/1D)
- ✅ 200+ USDT pair desteği
- [x] Arama özellikli dropdown

### 13. Hybrid Educational AI Agent (Senior Visual Technical Analyst) 🤖
- ✅ **Visual Analyst**: AI not only explains but **draws** technical levels (OB/FVG/Lines) on the chart.
- ✅ **Dual-Verification**: Algoritma (V3) ve Yapay Zeka (Gemini 2.5/3 Flash) sinyali aynı anda analiz eder.
- ✅ **Educational Modal**:
  - **Karar**: CONFIRM / REJECT / CAUTION.
  - **Eğitsel Görüş**: "Neden bu işlem alınmalı/alınmamalı?" sorusuna Türkçe, teknik ve eğitici yanıt verir.
  - **Trade Plan**: Önerilen Entry, Stop ve TP seviyelerini sunar.
- ✅ **Master Toggle**: Ayarlar sekmesinden AI tamamen açılıp kapatılabilir.
- ✅ **Watchlist Entegrasyonu**: Her sinyalin yanında 🔍 ikonu ile tek tıkla analiz başlatılır.

---

## 🧠 System Capabilities & Skills (Yetenek ve Beceriler)

Bu bölüm, sistemin sahip olduğu tüm **aktif yetenekleri** ve **fonksiyonel becerileri** teknik detaylarıyla listeler. Her yeni özellik eklendiğinde bu liste güncellenir.

### 🧬 Core Intelligence (Çekirdek Zeka)
1.  **Algorithmic Pattern Recognition (V3):**
    *   *Skill:* 5-mum fraktal analizi ile Swing High/Low tespiti.
    *   *Skill:* Market Structure Shift (MSS) ve Break of Structure (BOS) algılama.
    *   *Capability:* Order Block (OB) ve Fair Value Gap (FVG) bölgelerini milimetrik hesaplama.

2.  **Visual Technical Analyst (AI Bridge):**
    *   *Skill:* **Görsel İşaretleme:** AI, sadece metin üretmez; grafiğe OB kutuları ve Fiyat Seviyeleri çizer.
    *   *Skill:* **Dual-Verification:** Algoritmanın bulduğu setup'ı kendi "gözüyle" kontrol eder (Hybrid Check).
    *   *Capability:* Gemini 2.5 Flash modelini kullanarak saniyeler içinde bütünleşik analiz sunar.

3.  **Risk Management Engine:**
    *   *Skill:* Dynamic Position Sizing (Portföy ve Risk %'sine göre lot hesabı).
    *   *Skill:* Risk/Reward (R:R) optimizasyonu.
    *   *Capability:* Short pozisyonlar için ters hesaplama yeteneği.

4.  **Simulation & Validation (Backtesting):**
    *   *Skill:* Time-Travel Simulation (Geçmiş veriyi adım adım oynatarak test etme).
    *   *Skill:* Teyitli işlem simülasyonu (Sadece koşullar oluşunca giriş).

### 🖥️ User Interface Capabilities
1.  **Interactive Charting:**
    *   *Skill:* Sürükle-bırak destekli Trend Çizgileri ve Yatay Işınlar.
    *   *Skill:* Click-to-Zoom (Sinyale tıklandığında odaklanma).
    *   *Capability:* Neon Zone Rendering (Görsel olarak zenginleştirilmiş bölgeler).

2.  **Market Surveillance (Sentinel):**
    *   *Skill:* Çoklu parite izleme (Watchlist Scanner).
    *   *Skill:* Arka planda sessiz tarama ve görsel bildirim.

3.  **Education Mode (Mentor):**
    *   *Skill:* "Neden?" sorusuna yanıt verme.
    *   *Skill:* Karmaşık konseptleri (Liquidity Sweep vb.) Türkçe anlatma.

---

## 🛠️ Teknolojiler

| Teknoloji | Kullanım |
|-----------|----------|
| **React** | UI Framework |
| **Vite** | Build Tool |
| **Tailwind CSS** | Styling |
| **Lightweight-Charts** | Profesyonel grafik |
| **Binance API** | Canlı veri |
| **Lucide Icons** | İkonlar |
- **Gemini 2.5/3 Flash** | Visual Technical Analyst |

---

## 📦 Kurulum & Çalıştırma

### Gereksinimler
- Node.js v18+
- npm veya yarn

### Kurulum Adımları

```bash
# Proje klasörüne git
cd price-action-engine

# Bağımlılıkları yükle
npm install

# Development server başlat
npm run dev
```

Tarayıcıda `http://localhost:3000` veya `http://localhost:5173` açılacaktır.

### Build (Production)

```bash
npm run build
npm run preview
```

---

## 📁 Dosya Yapısı

```
price-action-engine/
├── App.jsx                  # Ana component (3400+ satır)
├── signalEngineV3.js        # V3 analiz motoru
├── conditionTracker.js      # Koşul takip sistemi
├── visualAnnotations.js     # Grafik görselleştirme
├── main.jsx                 # React entry point
├── index.html               # HTML template
├── index.css                # Global styles + neon tema
├── package.json             # Dependencies
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind CSS config
├── tailwind.config.js       # Tailwind CSS config
├── postcss.config.js        # PostCSS config
├── agentEngine.js           # Hybrid AI Analysis & Mentor Logic
└── README.md                # Bu dosya
```

---

## 🎨 UI Yapısı

```
┌─────────────────────────────────────────────────────────────────┐
│  [Coin Dropdown] [15m] [1H] [4H] [1D]   [Aralık] [Çizim]        │
├───────────────────────────────────────────┬─────────────────────┤
│                                           │ [Setups] [Trades]   │
│                                           ├─────────────────────┤
│                                           │ � LONG SETUPS      │
│          CANDLESTICK GRAFİK               │ ├─ Order Block 75%  │
│                                           │ │  🎯 Entry Koşulları│
│     [🎯 Entry Zone] ← Neon Zone           │ │  ⏳ Zone touch 🔍  │
│                                           │ │  ⏳ Rejection  🔍  │
│     ───────── Entry High ─────            │ ├─ FVG Fill 68%     │
│     ───────── Entry Low ──────            │ └─ Range Alt 62%    │
│     - - - - - Stop Loss - - -             │ ─────────────────── │
│                                           │ 🔴 SHORT SETUPS     │
│                                           │ ├─ FVG Short 80%    │
│                                           │ │  🎯 Entry Koşulları│
│                                           │ │  ⏳ Retracement 🔍 │
│                                           │ └─ OB Short 72%     │
└───────────────────────────────────────────┴─────────────────────┘
```

---

## 📋 Gelecekte Eklenebilecek Özellikler

### Yüksek Öncelik
- [ ] Animasyonlar (PULSING/GLOW efektleri)
- [ ] Real-time alerts (koşul sağlandığında bildirim)

### Orta Öncelik
- [ ] WebSocket real-time updates
- [ ] Mobile responsive iyileştirme

### Düşük Öncelik
- [ ] Dark/Light tema seçeneği
- [ ] Export/Share özelliği

---

## ⚠️ Önemli Notlar

### Kullanım Felsefesi
- **User Decision:** Nihai karar kullanıcıya ait
- **Quality > Quantity:** Az ama kaliteli setup
- **Education:** Mentor-style grafikler ile öğrenme
- **Transparency:** Risk/Reward ve güvenilirlik açıkça gösterilir
- **No Signal Service:** Bu bir sinyal botu DEĞİL

### API Limitleri
- Binance API rate limits: 1200 req/min (IP bazlı)
- Şu anki kullanım: Düşük (sadece data fetch)

---

## 📊 Versiyon Geçmişi

| Versiyon | Tarih | Değişiklikler |
|----------|-------|---------------|
| 1.0.0 | 17 Ocak 2025 | MVP - Temel analiz |
| 2.0.0 | 18 Ocak 2025 | Multi-teknik algılama, Long/Short, Zone visualization |
| 3.0.0 | 20 Ocak 2025 | Signal Engine V3, Condition Tracker, Trade Tracker, Universal Visual Protocol |
| 4.0.0 | 20 Ocak 2025 | Universal Visual Protocol, Scanner Engine |
| 5.0.0 | 20 Ocak 2026 | **Visual Technical Analyst (AI)**, **Backtest Engine**, **Market Sentinel** |

---

Son güncelleme: 20 Ocak 2026
Versiyon: 5.0.0
