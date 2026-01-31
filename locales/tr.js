/**
 * Turkish Translations for Price Action Engine
 * @description All UI strings in Turkish language
 */

export const tr = {
    // Common shared labels
    common: {
        search: 'Ara...',
        save: '💾 Kaydet',
        cancel: 'İptal',
        clear: 'Temizle',
        delete: 'Sil',
        close: 'Kapat',
        loading: 'Yükleniyor...',
        error: 'Hata',
        success: 'Başarılı',
        confirm: 'Onayla',
        add: 'Ekle',
        remove: 'Kaldır',
        refresh: 'Yenile',
        fit: 'Sığdır',
        show: 'Göster',
        hide: 'Gizle',
        optional: 'Opsiyonel',
    },

    // Tab names
    tabs: {
        setups: 'Setups',
        scanner: 'Scanner',
        trades: 'Trades',
        chat: 'Chat',
        settings: 'Ayarlar',
    },

    // Header
    header: {
        title: '📊 Price Action Engine',
        subtitle: 'Karar Destek Sistemi',
        lastUpdate: 'Son güncelleme',
        selectPair: 'Pair seçin...',
        recentPairs: 'Son Kullanılanlar',
        allPairs: 'Tüm Pairler',
    },

    // Timeframe selector
    timeframe: {
        label: 'Zaman Dilimi',
        short: 'Kısa',
        medium: 'Orta',
        long: 'Uzun',
    },

    // Chat messages
    chat: {
        welcome: 'Merhaba! Price action ve trading hakkında sorularınızı yanıtlayabilirim.',
        placeholder: 'Soru sorun...',
        send: 'Gönder',
        thinking: 'Düşünüyor...',
        errorResponse: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
    },

    // Scanner
    scanner: {
        title: '📡 Market Sentinel',
        subtitle: 'Çoklu Pair Tarayıcı',
        powerOn: 'Tarama Aktif',
        powerOff: 'Tarama Durduruldu',
        addSymbol: 'Sembol ekle...',
        watchlist: 'İzleme Listesi',
        summary: '📊 Tarama Özeti',
        signals: {
            long: 'Long',
            short: 'Short',
            none: 'None',
        },
        scanning: 'Taranıyor...',
        noSignal: 'Sinyal Yok',
        remove: 'Kaldır',
        verifyExplain: 'AI Mentor: Analiz Et & Açıkla',
        wrongSignal: 'Yanlış Sinyal',
        correctSignal: 'Doğru Sinyal',
    },

    // Setups
    setups: {
        longSetups: 'LONG SETUPS',
        shortSetups: 'SHORT SETUPS',
        trend: 'Trend',
        uptrend: '📈 Uptrend',
        downtrend: '📉 Downtrend',
        ranging: '↔️ Ranging',
        confidence: 'Güvenilirlik',
        confidenceCalc: '📊 Güvenilirlik Hesaplama',
        confidenceDetail: 'Güvenilirlik Detayı',
        technique: 'Teknik',
        entry: 'Entry',
        stop: 'Stop',
        entryConditions: '🎯 Entry Koşulları',
        trendAlignment: 'Trend Uyumu',
        srStrength: 'S/R Gücü',
        pattern: 'Pattern',
        volume: 'Hacim',
        mtf: 'MTF',
        historical: 'Tarihsel',
        noSetups: 'Kurulum bulunamadı',
    },

    // Trading
    trading: {
        newTrade: '📝 Yeni İşlem',
        openTrade: 'İşlem Aç',
        closeTrade: 'İşlemi Kapat',
        pair: 'Pair',
        direction: 'Yön',
        long: 'LONG',
        short: 'SHORT',
        entryPrice: 'Entry Price',
        positionSize: 'Position Size ($)',
        stopLoss: 'Stop Loss',
        takeProfit: 'Take Profit',
        notes: 'Not',
        notesPlaceholder: 'OB long, HTF trend uyumu...',
        activeTrades: 'Aktif İşlemler',
        closedTrades: 'Kapalı İşlemler',
        pnl: 'P&L',
        noTrades: 'Henüz işlem yok',
    },

    // Drawing tools
    drawing: {
        horizontalLine: 'Yatay Çizgi',
        trendLine: 'Trend Çizgisi',
        clearAll: 'Tümünü Temizle',
        lineManager: 'Çizgi Yöneticisi',
        horizontalLines: 'Yatay Çizgiler',
        trendLines: 'Trend Çizgileri',
        clickToDrawHorizontal: '📏 Yatay çizgi için grafiğe tıklayın',
        selectFirstPoint: '📍 Birinci noktayı seçin...',
        selectSecondPoint: '📍 İkinci noktayı seçin...',
    },

    // Settings
    settings: {
        title: 'AI Agent Ayarları',
        aiMentorMode: 'AI Mentor Modu',
        active: '✅ Aktif ve Hazır',
        apiKeyMissing: '⚠️ API Anahtarı Eksik',
        disabled: '⛔ Devre Dışı',
        geminiApiKey: 'Gemini API Anahtarı',
        getApiKey: 'API anahtarı al (Google AI Studio)',
        apiKeySaved: 'API anahtarı kaydedildi!',
        feedbackHistory: '📊 Geri Bildirim Geçmişi',
        positive: '👍 Olumlu',
        negative: '👎 Olumsuz',
        aiFeatures: '🤖 AI Agent Özellikleri',
        featureList: [
            'Sinyal doğrulama ve güven skoru',
            'Türkçe piyasa analizi',
            'Öğrenme mekanizması (👍/👎)',
            'Bağlam farkındalıklı sohbet',
        ],
        language: 'Dil',
    },

    // Debug
    debug: {
        testStrategy: '🧪 Strateji Test',
        visualDebug: '🐞 Debug Modu',
        clearAiDrawings: '🤖 AI Çizimlerini Temizle',
    },

    // Backtest
    backtest: {
        title: 'Backtest Sonuçları',
        totalTrades: 'Toplam İşlem',
        winRate: 'Kazanma Oranı',
        netProfit: 'Net Kar',
        profitFactor: 'Profit Factor',
        maxDrawdown: 'Max Drawdown',
    },

    // Verification Modal
    verification: {
        title: 'AI Analiz Sonucu',
        verdict: 'Karar',
        confidence: 'Güven',
        reasoning: 'Gerekçe',
        mentor: 'Mentor Bilgisi',
        concept: 'Kavram',
        why: 'Neden',
        guidance: 'Yönlendirme',
    },

    // Alerts and Messages
    alerts: {
        selectSymbolFirst: 'Lütfen önce sembolü grafikte açın.',
        aiAnalysisFailed: 'AI Analizi başarısız oldu.',
        noDataAvailable: 'Veri bulunamadı',
        connectionError: 'Bağlantı hatası',
    },
};
