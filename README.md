# Price Action Decision Support Engine

## Proje Özeti

Bu proje, kripto para (BTC/USDT, ETH/USDT) için **spot trading** odaklı bir **Price Action analiz ve karar destek sistemi**dir. Program kullanıcıya işlem önerisi vermez, sadece mevcut piyasa durumunu analiz eder ve potansiyel setup'ları güvenilirlik skorlarıyla birlikte sunar. **Nihai karar tamamen kullanıcıya aittir.**

---

## Programın Amacı

### Ana Hedef
Kullanıcının günlük **1-2 kaliteli işlem** yapmasına yardımcı olmak için:
- Gerçek zamanlı fiyat verilerini analiz etmek
- Price action kurallarına göre potansiyel setup'ları tespit etmek
- Risk/Reward hesaplamaları yapmak
- Entry, Stop Loss ve Take Profit seviyelerini belirlemek
- Kullanıcının eğitimini desteklemek (AI chatbot ile)

### Kullanıcı Profili
- **İşlem tipi:** Spot only (long pozisyonlar)
- **Frekans:** Günde max 1-2 işlem
- **Risk toleransı:** Düşük (%1 risk/işlem)
- **Zaman dilimi:** Tercih edilen 4H, desteklenen 15m/1H/4H/1D
- **Stil:** Konservatif, üst üste kayıplardan kaçınan

---

## Beklenen Özellikler (Kullanıcı İhtiyaçları)

### 1. Multi-Timeframe Analiz
- ✅ **Tamamlandı:** 15m, 1H, 4H, 1D timeframe desteği
- ✅ **Tamamlandı:** Timeframe seçim butonu
- ✅ **Tamamlandı:** Hiyerarşik analiz (Daily context → 4H execution)

### 2. Price Action Analizi
- ✅ **Tamamlandı (Temel):**
  - Swing high/low detection
  - Support/Resistance zone mapping
  - Trend detection (uptrend/downtrend/ranging)
  - Context validation (Daily → 4H)
  
- ⏳ **Eksik (İleri Seviye):**
  - Liquidity sweep detection (gelişmiş algoritma)
  - Order block identification (impulse move bazlı)
  - Fair Value Gap (FVG) detection
  - Equal highs/lows finder
  - Break of Structure (BOS) markers
  - Candlestick pattern recognition (pin bar, engulfing, doji, hammer, etc.)

### 3. Setup Generation
- ✅ **Tamamlandı:**
  - Support Zone Bounce
  - Trend Following
  - En iyi 3 setup gösterimi
  - Güvenilirlik skorlaması (%0-100)
  - Entry zone, Stop loss, Multiple targets
  
- ⏳ **Eksik:**
  - Confluence scoring (minimum 3/5 faktör)
  - Pattern-based setups
  - Volume confirmation
  - Fibonacci integration
  - Round number proximity check

### 4. Risk Yönetimi
- ✅ **Tamamlandı:**
  - Position size calculator
  - Risk % slider (0.5% - 5%)
  - Max loss hesabı
  - Potential gains (her TP için)
  
- ⏳ **Eksik:**
  - Multiple position sizing strategies
  - Trailing stop suggestions
  - Partial profit taking calculator
  - Max daily loss limiti

### 5. Görselleştirme
- ✅ **Tamamlandı:**
  - Candlestick grafik (Line chart ile simüle edilmiş)
  - Entry zone (renkli alan)
  - Stop loss çizgisi
  - TP seviyeleri
  - Setup'lar arası geçiş (renk kodlaması)
  
- ⏳ **Eksik:**
  - Gerçek candlestick mumları (OHLC gösterimi)
  - Volume bar'ları
  - S/R seviyeleri işaretleme
  - Swing high/low markers
  - Pattern annotations

### 6. AI Chatbot
- ✅ **Tamamlandı:**
  - 15+ price action terimi (support, resistance, pin bar, engulfing, R:R, etc.)
  - Kural tabanlı yanıtlar
  - Setup-agnostic genel bilgiler
  
- ⏳ **Eksik:**
  - 100+ kapsamlı terim sözlüğü
  - Setup-specific açıklamalar ("Setup #1 neden güvenilir?")
  - Liquidity concepts (sweeps, equal highs/lows, order blocks)
  - Advanced patterns (FVG, BOS, ChoCh)
  - Trading psychology (FOMO, revenge trading, overtrading)
  - Risk management derinlemesine
  - Trend structure detayları

### 7. Trade Tracker
- ❌ **Henüz Başlanmadı:**
  - Manuel işlem girişi (entry, size, setup seçimi)
  - Canlı P&L hesabı (current price bazlı)
  - Stop/TP seviyelerini grafikte gösterme
  - İşlem geçmişi (son 10-20 işlem)
  - Win rate, avg R:R, total P&L istatistikleri
  - CSV export (kullanıcı istemiyor ama eklenebilir)

### 8. Backtest Engine
- ❌ **Henüz Başlanmadı:**
  - Geçmiş veri tarama (benzer setup arama)
  - Win rate hesaplama (her setup tipi için)
  - Average R:R tracking
  - Occurrence frequency
  - Confidence scoring için kullanma

### 9. Data & API
- ✅ **Tamamlandı:**
  - Binance API entegrasyonu
  - OHLCV veri çekme
  - Otomatik yenileme (timeframe bazlı)
  - BTC/USDT ve ETH/USDT desteği
  
- ⏳ **İyileştirilebilir:**
  - Daha fazla coin pair (kullanıcı gerekirse)
  - WebSocket real-time updates (şu an REST API)
  - Hata yönetimi iyileştirmeleri

---

## Şimdiye Kadar Yapılanlar (Tamamlanan)

### ✅ PHASE 1: Temel Altyapı (TAMAMLANDI)
1. **React + Vite projesı kurulumu**
2. **Streamlit yerine standalone React app** (kullanıcı feedback sonrası)
3. **Tailwind CSS styling**
4. **Responsive layout** (grafik + sidebar)

### ✅ PHASE 2: Data Integration (TAMAMLANDI)
1. **Binance API bağlantısı**
2. **Multi-timeframe veri çekme** (15m, 1H, 4H, 1D)
3. **Otomatik yenileme logic** (timeframe-aware intervals)
4. **Symbol switching** (BTC/USDT, ETH/USDT)

### ✅ PHASE 3: Temel Price Action (TAMAMLANDI)
1. **Swing high/low detection algoritması**
2. **Support/Resistance zone mapping**
3. **Trend detection** (HH/HL = uptrend, LH/LL = downtrend)
4. **Spot-only logic** (downtrend'de "NO TRADE" uyarısı)

### ✅ PHASE 4: Setup Generation v1 (TAMAMLANDI)
1. **Support Zone Bounce setup**
2. **Trend Following setup**
3. **Confluence scoring** (temel seviye)
4. **Entry/Stop/TP calculation**
5. **Top 3 setup ranking**

### ✅ PHASE 5: UI Components (TAMAMLANDI)
1. **Grafik görselleştirme** (Recharts)
2. **Entry/Stop/TP çizgileri**
3. **Sidebar tabs** (Setups, Chat)
4. **Position calculator**
5. **Setup selection & details**

### ✅ PHASE 6: AI Chatbot v1 (TAMAMLANDI)
1. **Kural tabanlı yanıt sistemi**
2. **15+ terim açıklaması**
3. **Chat interface**

---

## Hangi Aşamadayız? (Şu Anki Durum)

### 📍 CURRENT STATUS: **PHASE 7 - Minimum Viable Product (MVP) Tamamlandı**

**Çalışan Özellikler:**
- ✅ Canlı veri çekme ve grafik gösterimi
- ✅ Temel price action analizi (swing, S/R, trend)
- ✅ 2 tür setup (Support Bounce, Trend Following)
- ✅ Position calculator
- ✅ Basit AI chatbot
- ✅ Multi-timeframe desteği

**Eksik Olan Kritik Özellikler:**
- ❌ İleri seviye price action (liquidity sweeps, order blocks, FVG)
- ❌ Candlestick pattern recognition
- ❌ Trade tracker
- ❌ Backtest engine
- ❌ Kapsamlı chatbot (100+ terim)

---

## Eklenecek Özellikler (Öncelik Sırasına Göre)

### 🔥 PHASE 8: İleri Seviye Price Action (SONRAKİ ADIM)
**Öncelik: Yüksek**

1. **Liquidity Sweep Detection**
   - Swing low/high'ları geçici kırma tespiti
   - Stop hunt pattern'ları
   - Reversal confirmation

2. **Order Block Identification**
   - Impulse move öncesi son consolidation
   - Bullish/bearish order block zones
   - Strength scoring

3. **Fair Value Gap (FVG)**
   - 3-candle imbalance detection
   - Bullish/bearish FVG zones
   - Fill probability

4. **Equal Highs/Lows Finder**
   - Multiple touches of same level
   - Liquidity pool identification
   - Breakout potential scoring

5. **Break of Structure (BOS)**
   - Trend change markers
   - Higher timeframe alignment
   - Confirmation signals

### 🔥 PHASE 9: Pattern Recognition (SONRAKİ ADIM)
**Öncelik: Yüksek**

1. **Candlestick Patterns** (20+ pattern)
   - Pin bar (bullish/bearish)
   - Engulfing (bullish/bearish)
   - Doji (dragonfly, gravestone, long-legged)
   - Hammer / Inverted Hammer
   - Shooting Star
   - Morning Star / Evening Star
   - Three White Soldiers / Three Black Crows
   - Inside Bar / Outside Bar
   - Harami

2. **Chart Patterns**
   - Double Top/Bottom
   - Head & Shoulders
   - Triangles (ascending, descending, symmetrical)
   - Flags & Pennants
   - Wedges

3. **Pattern Context Validation**
   - Volume confirmation
   - S/R alignment
   - Trend consistency check

### 🟡 PHASE 10: Chatbot Expansion (ORTA ÖNCELİK)
**Öncelik: Orta**

1. **100+ Kapsamlı Terim Sözlüğü**
   - Tüm price action kavramları
   - Technical analysis terimleri
   - Risk management detayları
   - Trading psychology

2. **Setup-Specific Açıklamalar**
   - "Setup #1/2/3 neden güvenilir?"
   - Real-time setup reasoning
   - Risk/Reward justification

3. **Liquidity Concepts**
   - Sweeps, pools, raids
   - Institutional behavior
   - Smart money concepts

4. **Advanced Concepts**
   - Wyckoff method
   - Supply/demand zones
   - Premium/discount pricing

### 🟡 PHASE 11: Trade Tracker (ORTA ÖNCELİK)
**Öncelik: Orta**

1. **Manuel Trade Entry**
   - Setup selection
   - Entry price & size input
   - Timestamp logging

2. **Live P&L Tracking**
   - Current price monitoring
   - Unrealized P&L
   - % gain/loss

3. **Position Management**
   - TP1/TP2/TP3 tracking
   - Partial close simulation
   - SL hit detection

4. **Trade History**
   - Last 10-20 trades
   - Win/loss markers
   - Closed P&L

5. **Statistics Dashboard**
   - Overall win rate
   - Average R:R achieved
   - Total P&L
   - Best/worst trades

### 🟢 PHASE 12: Backtest Engine (DÜŞÜK ÖNCELİK)
**Öncelik: Düşük** (İstatistiksel doğrulama için)

1. **Historical Setup Scanner**
   - Geçmiş veride benzer setup arama
   - Pattern matching
   - Context similarity scoring

2. **Performance Calculation**
   - Setup başına win rate
   - Average R:R achieved
   - Occurrence frequency
   - Best/worst outcomes

3. **Confidence Scoring**
   - Historical success → confidence %
   - Dynamic scoring
   - Setup reliability ranking

### 🟢 PHASE 13: UI/UX İyileştirmeleri (DÜŞÜK ÖNCELİK)
**Öncelik: Düşük** (Fonksiyon > Estetik)

1. **Gerçek Candlestick Görselleştirme**
   - OHLC mumları
   - Daha iyi zoom/pan
   - Indicator overlays (opsiyonel)

2. **Volume Bar Gösterimi**
   - Alt panelde hacim çubukları
   - Volume spike highlights

3. **S/R Level Annotations**
   - Seviye çizgileri
   - Touch count badges
   - Strength indicators

4. **Swing Point Markers**
   - High/low işaretleri
   - Label'lar

5. **Grafik İyileştirmeleri**
   - Daha smooth rendering
   - TradingView benzeri controls
   - Drawing tools (opsiyonel)

---

## Teknik Borçlar & İyileştirmeler

### Code Quality
- [ ] Component separation (monolithic App.jsx'i bölmek)
- [ ] Custom hooks (useMarketData, usePriceAction, etc.)
- [ ] Type safety (TypeScript migration - opsiyonel)
- [ ] Error boundaries
- [ ] Loading states improvement

### Performance
- [ ] Memoization optimization
- [ ] WebSocket yerine REST API (real-time için)
- [ ] Data caching strategy
- [ ] Lazy loading components

### Testing
- [ ] Unit tests (analiz fonksiyonları)
- [ ] Integration tests
- [ ] E2E tests (opsiyonel)

---

## Kurulum & Çalıştırma

### Gereksinimler
- Node.js v18+ 
- npm veya yarn

### Kurulum Adımları

```bash
# Proje klasörüne git
cd C:\Users\behlu\OneDrive\Masaüstü\Claude\price-action-engine

# Bağımlılıkları yükle
npm install

# Development server başlat
npm run dev
```

Tarayıcıda otomatik olarak `http://localhost:3000` açılacaktır.

### Build (Production)

```bash
npm run build
npm run preview
```

---

## Dosya Yapısı

```
price-action-engine/
├── App.jsx              # Ana component (tüm logic burada)
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

## Önemli Notlar

### Kullanıcı Tercihleri
- **Spot only:** Short pozisyonlar yok
- **Downtrend = No Trade:** Daily downtrend'de setup gösterme
- **Minimal frequency:** Günde max 1-2 işlem
- **Low risk:** %1 risk/işlem tercih ediliyor
- **No automation:** Program işlem yapmaz, sadece analiz sunar

### Tasarım Felsefesi
- **User Decision:** Nihai karar kullanıcıya ait
- **Quality > Quantity:** Az ama kaliteli setup
- **Education:** Chatbot ile öğrenme desteği
- **Transparency:** Risk/Reward açıkça gösterilir
- **No Signal Service:** Bu bir sinyal botu DEĞİL

### API Limitleri
- Binance API rate limits: 1200 req/min (IP bazlı)
- Şu anki kullanım: Düşük (sadece data fetch)
- Future consideration: WebSocket entegrasyonu

---

## Sonuç

**Proje durumu:** MVP tamamlandı, temel fonksiyonlar çalışıyor.

**Sonraki adım:** PHASE 8 & 9 - İleri seviye price action ve pattern recognition.

**Tahmini süre (PHASE 8-9):** 3-4 saat kodlama + test

**Uzun vadeli vizyon:** Tam özellikli, eğitim odaklı price action karar destek sistemi.

---

Son güncelleme: 17 Ocak 2025
Versiyon: 1.0.0 (MVP)
Geliştirici: Claude (Anthropic) + Kullanıcı işbirliği
