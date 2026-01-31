/**
 * English Translations for Price Action Engine
 * @description All UI strings in English language
 */

export const en = {
    // Common shared labels
    common: {
        search: 'Search...',
        save: '💾 Save',
        cancel: 'Cancel',
        clear: 'Clear',
        delete: 'Delete',
        close: 'Close',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        confirm: 'Confirm',
        add: 'Add',
        remove: 'Remove',
        refresh: 'Refresh',
        fit: 'Fit',
        show: 'Show',
        hide: 'Hide',
        optional: 'Optional',
    },

    // Tab names
    tabs: {
        setups: 'Setups',
        scanner: 'Scanner',
        trades: 'Trades',
        chat: 'Chat',
        settings: 'Settings',
    },

    // Header
    header: {
        title: '📊 Price Action Engine',
        subtitle: 'Decision Support System',
        lastUpdate: 'Last update',
        selectPair: 'Select pair...',
        recentPairs: 'Recent',
        allPairs: 'All Pairs',
    },

    // Timeframe selector
    timeframe: {
        label: 'Timeframe',
        short: 'Short',
        medium: 'Medium',
        long: 'Long',
    },

    // Chat messages
    chat: {
        welcome: 'Hello! I can answer your questions about price action and trading.',
        placeholder: 'Ask a question...',
        send: 'Send',
        thinking: 'Thinking...',
        errorResponse: 'Sorry, an error occurred. Please try again.',
    },

    // Scanner
    scanner: {
        title: '📡 Market Sentinel',
        subtitle: 'Multi-Pair Scanner',
        powerOn: 'Scanning Active',
        powerOff: 'Scanning Stopped',
        addSymbol: 'Add symbol...',
        watchlist: 'Watchlist',
        summary: '📊 Scan Summary',
        signals: {
            long: 'Long',
            short: 'Short',
            none: 'None',
        },
        scanning: 'Scanning...',
        noSignal: 'No Signal',
        remove: 'Remove',
        verifyExplain: 'AI Mentor: Analyze & Explain',
        wrongSignal: 'Wrong Signal',
        correctSignal: 'Correct Signal',
    },

    // Setups
    setups: {
        longSetups: 'LONG SETUPS',
        shortSetups: 'SHORT SETUPS',
        trend: 'Trend',
        uptrend: '📈 Uptrend',
        downtrend: '📉 Downtrend',
        ranging: '↔️ Ranging',
        confidence: 'Confidence',
        confidenceCalc: '📊 Confidence Calculation',
        confidenceDetail: 'Confidence Breakdown',
        technique: 'Technique',
        entry: 'Entry',
        stop: 'Stop',
        entryConditions: '🎯 Entry Conditions',
        trendAlignment: 'Trend Alignment',
        srStrength: 'S/R Strength',
        pattern: 'Pattern',
        volume: 'Volume',
        mtf: 'MTF',
        historical: 'Historical',
        noSetups: 'No setups found',
    },

    // Trading
    trading: {
        newTrade: '📝 New Trade',
        openTrade: 'Open Trade',
        closeTrade: 'Close Trade',
        pair: 'Pair',
        direction: 'Direction',
        long: 'LONG',
        short: 'SHORT',
        entryPrice: 'Entry Price',
        positionSize: 'Position Size ($)',
        stopLoss: 'Stop Loss',
        takeProfit: 'Take Profit',
        notes: 'Notes',
        notesPlaceholder: 'OB long, HTF trend alignment...',
        activeTrades: 'Active Trades',
        closedTrades: 'Closed Trades',
        pnl: 'P&L',
        noTrades: 'No trades yet',
    },

    // Drawing tools
    drawing: {
        horizontalLine: 'Horizontal Line',
        trendLine: 'Trend Line',
        clearAll: 'Clear All',
        lineManager: 'Line Manager',
        horizontalLines: 'Horizontal Lines',
        trendLines: 'Trend Lines',
        clickToDrawHorizontal: '📏 Click on chart to draw horizontal line',
        selectFirstPoint: '📍 Select first point...',
        selectSecondPoint: '📍 Select second point...',
    },

    // Settings
    settings: {
        title: 'AI Agent Settings',
        aiMentorMode: 'AI Mentor Mode',
        active: '✅ Active and Ready',
        apiKeyMissing: '⚠️ API Key Missing',
        disabled: '⛔ Disabled',
        geminiApiKey: 'Gemini API Key',
        getApiKey: 'Get API key (Google AI Studio)',
        apiKeySaved: 'API key saved!',
        feedbackHistory: '📊 Feedback History',
        positive: '👍 Positive',
        negative: '👎 Negative',
        aiFeatures: '🤖 AI Agent Features',
        featureList: [
            'Signal verification and confidence score',
            'Market analysis',
            'Learning mechanism (👍/👎)',
            'Context-aware chat',
        ],
        language: 'Language',
    },

    // Debug
    debug: {
        testStrategy: '🧪 Test Strategy',
        visualDebug: '🐞 Debug Mode',
        clearAiDrawings: '🤖 Clear AI Drawings',
    },

    // Backtest
    backtest: {
        title: 'Backtest Results',
        totalTrades: 'Total Trades',
        winRate: 'Win Rate',
        netProfit: 'Net Profit',
        profitFactor: 'Profit Factor',
        maxDrawdown: 'Max Drawdown',
    },

    // Verification Modal
    verification: {
        title: 'AI Analysis Result',
        verdict: 'Verdict',
        confidence: 'Confidence',
        reasoning: 'Reasoning',
        mentor: 'Mentor Info',
        concept: 'Concept',
        why: 'Why',
        guidance: 'Guidance',
    },

    // Alerts and Messages
    alerts: {
        selectSymbolFirst: 'Please open the symbol on the chart first.',
        aiAnalysisFailed: 'AI Analysis failed.',
        noDataAvailable: 'No data available',
        connectionError: 'Connection error',
    },
};
