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
- Kullanıcının eğitimini desteklemek (AI chatbot ile)

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
| **Order Block** | Güçlü impuls öncesi son ters mum | ✅ Tamamlandı |
| **Fair Value Gap (FVG)** | 3 mum arası fiyat boşluğu | ✅ Tamamlandı |
| **Range Trading** | Konsolidasyon bölgesi tespiti | ✅ Tamamlandı |
| **Break of Structure (BOS)** | Trend yapısı kırılımı | ✅ Tamamlandı |
| **Liquidity Sweep** | Stop avı tespiti | ✅ Tamamlandı |
| **Chart Patterns** | Double Top/Bottom, H&S, Triangle | ✅ Tamamlandı |

### 1b. Chart Pattern Toggle
- ✅ Kullanıcı klasik chart pattern'leri açıp kapatabilir
- ✅ Toggle kapalıyken sadece price action teknikler gösterilir

### 2. Long & Short Setup Sistemi
- ✅ **Perpetual Mod:** Hem long hem short setup'lar her zaman analiz edilir
- ✅ **Gruplandırılmış Panel:** LONG (yeşil) ve SHORT (kırmızı) ayrı bölümler
- ✅ **Teknik Etiketi:** Her setup'ın altında hangi teknikle tespit edildiği
- ✅ **En İyi 3 Setup:** Her yön için en yüksek güvenilirlikli 3 setup

### 3. Grafik Görselleştirme
- ✅ **Gerçek Candlestick:** Lightweight-Charts ile profesyonel mum grafikleri
- ✅ **Reference Zone'lar:** Setup seçildiğinde ilgili bölge grafikte gösterilir
  - 📦 Order Block (mavi/yeşil kutu)
  - 📐 FVG (turuncu kutu)
  - 📊 Range (mor kutu)
- ✅ **Etiketli Zone'lar:** Her zone'un sol üstünde etiketi görünür
- ✅ **Entry/Stop/TP Çizgileri:** Seviyeleri net gösteren yatay çizgiler
- ✅ **Çizim Araçları:** Yatay ve diagonal çizgi çizme

### 4. Güvenilirlik Skoru Sistemi
**Toplam 100 puan üzerinden hesaplanır:**

| Faktör | Max Puan | Açıklama |
|--------|----------|----------|
| Trend Uyumu | 25 | Setup yönü + trend uyumu |
| S/R Gücü | 20 | Seviye dokunuş sayısı |
| Pattern Kalitesi | 20 | Teknik güvenilirliği |
| Hacim Doğrulaması | 15 | Ortalama hacim karşılaştırması |
| MTF Confluence | 10 | Çoklu TF uyumu |
| Tarihsel Başarı | 10 | Benzer pattern win rate |

### 5. No-Setup Açıklaması
Setup bulunamadığında neden açıklanır:
- "Bullish Order Block bulunamadı"
- "Piyasa güçlü downtrend içinde"
- "Bullish FVG mevcut değil"
- vb.

### 6. AI Chatbot (30+ Terim)

**Güvenilirlik Terimleri:**
- Güvenilirlik hesaplama
- Trend uyumu
- S/R gücü
- Pattern kalitesi
- Hacim doğrulaması
- MTF confluence
- Tarihsel başarı

**Teknik Terimler:**
- Order Block
- Fair Value Gap (FVG)
- Range Trading
- Break of Structure (BOS)
- Liquidity Sweep
- Support/Resistance
- Pin Bar, Engulfing
- R:R Ratio
- Stop Loss

### 7. Position Calculator
- ✅ Yatırım tutarı girişi
- ✅ Risk % slider (0.5% - 5%)
- ✅ Pozisyon büyüklüğü hesabı
- ✅ Max kayıp gösterimi
- ✅ Her TP için potansiyel kar

### 8. Multi-Timeframe Desteği
- ✅ 15 dakika
- ✅ 1 saat
- ✅ 4 saat
- ✅ 1 gün

### 9. Dinamik Coin Seçimi
- ✅ 200+ USDT pair desteği
- ✅ Hacim bazlı filtreleme
- ✅ Arama özellikli dropdown
- ✅ Son kullanılan coinler

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
├── App.jsx              # Ana component
│   ├── TrendLinePrimitive     # Diagonal çizgi primitifi
│   ├── RectanglePrimitive     # Zone kutu primitifi (etiketli)
│   ├── findOrderBlocks()      # OB algılama
│   ├── findFVG()              # FVG algılama
│   ├── findRanges()           # Range algılama
│   ├── findBOS()              # BOS algılama
│   ├── findLiquiditySweeps()  # Sweep algılama
│   ├── calculateConfidence()  # Güvenilirlik hesaplama
│   ├── generateSetups()       # Setup üretimi
│   └── getChatResponse()      # Chat yanıtları
├── main.jsx             # React entry point
├── index.html           # HTML template
├── index.css            # Global styles
├── package.json         # Dependencies
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS config
├── postcss.config.js    # PostCSS config
└── README.md            # Bu dosya
```

---

## 🎨 UI Yapısı

```
┌─────────────────────────────────────────────────────────────────┐
│  [Coin Dropdown] [15m] [1H] [4H] [1D]   [Aralık] [Çizim]        │
├───────────────────────────────────────────┬─────────────────────┤
│                                           │ [Setups] [Chat]     │
│                                           ├─────────────────────┤
│                                           │ Trend: 📈 Uptrend   │
│                                           │ ─────────────────── │
│          CANDLESTICK GRAFİK               │ 📊 Güvenilirlik:    │
│                                           │ • Trend: 25%        │
│     [📐 FVG] ← Etiketli Zone              │ • S/R: 20%          │
│                                           │ ─────────────────── │
│     ───────── TP Levels ─────             │ 🟢 LONG SETUPS (3)  │
│     ═══════════ Entry ═══════             │ ├─ Liquidity Sweep  │
│     - - - - - Stop Loss - - -             │ ├─ FVG Fill Long    │
│                                           │ └─ Range Alt Long   │
│                                           │ ─────────────────── │
│                                           │ 🔴 SHORT SETUPS (1) │
│                                           │ └─ Range Üst Short  │
│                                           │ ─────────────────── │
│                                           │ 📱 CALCULATOR       │
└───────────────────────────────────────────┴─────────────────────┘
```

---

## 📋 Gelecekte Eklenebilecek Özellikler

### Orta Öncelik
- [ ] Trade Tracker (manuel işlem girişi + P&L takibi)
- [ ] Backtest Engine (geçmiş veride test)
- [ ] Alert/Bildirim sistemi
- [ ] Favoriler/Watchlist

### Düşük Öncelik
- [ ] WebSocket real-time updates
- [ ] Candlestick pattern recognition (20+ pattern)
- [ ] Dark/Light tema seçeneği
- [ ] Export/Share özelliği

---

## ⚠️ Önemli Notlar

### Kullanım Felsefesi
- **User Decision:** Nihai karar kullanıcıya ait
- **Quality > Quantity:** Az ama kaliteli setup
- **Education:** Chatbot ile öğrenme desteği
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

---

Son güncelleme: 18 Ocak 2025
Versiyon: 2.0.0
