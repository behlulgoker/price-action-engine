import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries } from 'lightweight-charts';
import { RefreshCw, TrendingUp, AlertCircle, Calculator, MessageSquare, BarChart3, Search, Clock, ChevronDown, Maximize2, Minus, Plus, Pencil, Slash, MoveHorizontal, Trash2, List, X, Power, Radar, XCircle, PlusCircle, Settings, ThumbsUp, ThumbsDown, Bot, Key } from 'lucide-react';

// V3 Signal Engine Imports (Institutional Grade)
import { analyzeV3, SignalMemory, findSwingPoints, findAllBOS, generateSwingDebugMarkers, generateBOSDebugMarkers } from './signalEngineV3.js';
import { ConditionTracker, CONDITION_STATUS, getStatusIcon, getStatusColor, ELEMENT_TYPE, NEON_COLORS } from './conditionTracker.js';
import { ZoneAnnotationPrimitive, NeonHighlightPrimitive, UniversalVisualRenderer, renderConditionVisuals, clearConditionVisuals, generateZoneLabel, autoZoomToEvent } from './visualAnnotations.js';
import { BacktestEngine, formatBacktestReport } from './backtestEngine.js';
import { ScannerEngine } from './scannerEngine.js';
import { AgentEngine } from './agentEngine.js';
import { useTranslation, LanguageSelector } from './i18n.jsx';


// Trend Line Primitive for lightweight-charts v5
class TrendLinePrimitive {
  constructor(p1, p2, options = {}) {
    this._p1 = p1;
    this._p2 = p2;
    this._options = {
      lineColor: options.lineColor || '#f59e0b',
      lineWidth: options.lineWidth || 2,
      lineStyle: options.lineStyle || 'solid',
      ...options
    };
    this._paneViews = [new TrendLinePaneView(this)];
  }

  updateAllViews() {
    this._paneViews.forEach(pv => pv.update());
  }

  paneViews() {
    return this._paneViews;
  }

  requestUpdate() {
    if (this._requestUpdate) this._requestUpdate();
  }

  attached({ chart, series, requestUpdate }) {
    this._chart = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }

  detached() {
    this._chart = undefined;
    this._series = undefined;
    this._requestUpdate = undefined;
  }

  chart() {
    return this._chart;
  }

  series() {
    return this._series;
  }

  getPoints() {
    return { p1: this._p1, p2: this._p2 };
  }

  // Update points for drag functionality
  updatePoints(p1, p2) {
    this._p1 = p1;
    this._p2 = p2;
    this.updateAllViews();
    this.requestUpdate();
  }

  getOptions() {
    return this._options;
  }
}

class TrendLinePaneView {
  constructor(source) {
    this._source = source;
    this._x1 = 0;
    this._y1 = 0;
    this._x2 = 0;
    this._y2 = 0;
  }

  update() {
    const chart = this._source.chart();
    const series = this._source.series();
    if (!chart || !series) return;

    const { p1, p2 } = this._source.getPoints();
    const timeScale = chart.timeScale();

    this._x1 = timeScale.timeToCoordinate(p1.time);
    this._y1 = series.priceToCoordinate(p1.price);
    this._x2 = timeScale.timeToCoordinate(p2.time);
    this._y2 = series.priceToCoordinate(p2.price);
  }

  renderer() {
    return {
      draw: (target) => {
        target.useBitmapCoordinateSpace(scope => {
          const ctx = scope.context;
          const { horizontalPixelRatio, verticalPixelRatio } = scope;

          if (this._x1 === null || this._y1 === null ||
            this._x2 === null || this._y2 === null) return;

          const x1 = this._x1 * horizontalPixelRatio;
          const y1 = this._y1 * verticalPixelRatio;
          const x2 = this._x2 * horizontalPixelRatio;
          const y2 = this._y2 * verticalPixelRatio;

          const options = this._source.getOptions();

          ctx.save();
          ctx.strokeStyle = options.lineColor;
          ctx.lineWidth = options.lineWidth * horizontalPixelRatio;

          if (options.lineStyle === 'dashed') {
            ctx.setLineDash([5 * horizontalPixelRatio, 5 * horizontalPixelRatio]);
          }

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.restore();
        });
      }
    };
  }
}

// Rectangle Primitive for reference zones (Order Blocks, FVGs, Ranges) with labels
class RectanglePrimitive {
  constructor(zone, options = {}) {
    this._zone = zone; // { high, low, startTime, endTime, color, type, label }
    this._options = {
      fillColor: options.fillColor || zone.color || 'rgba(59, 130, 246, 0.2)',
      borderColor: options.borderColor || 'rgba(59, 130, 246, 0.6)',
      borderWidth: options.borderWidth || 1,
      label: options.label || zone.label || this._getDefaultLabel(zone.type),
      labelColor: options.labelColor || '#ffffff',
      labelBgColor: options.labelBgColor || zone.color?.replace('0.2)', '0.9)') || 'rgba(59, 130, 246, 0.9)',
      ...options
    };
    this._paneViews = [new RectanglePaneView(this)];
  }

  _getDefaultLabel(type) {
    const labels = {
      'orderBlock': '📦 Order Block',
      'fvg': '📐 FVG',
      'range': '📊 Range',
      'bos': '🔀 BOS',
      'sweep': '⚡ Sweep'
    };
    return labels[type] || type || 'Zone';
  }

  updateAllViews() {
    this._paneViews.forEach(pv => pv.update());
  }

  paneViews() {
    return this._paneViews;
  }

  requestUpdate() {
    if (this._requestUpdate) this._requestUpdate();
  }

  attached({ chart, series, requestUpdate }) {
    this._chart = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }

  detached() {
    this._chart = undefined;
    this._series = undefined;
    this._requestUpdate = undefined;
  }

  chart() {
    return this._chart;
  }

  series() {
    return this._series;
  }

  getZone() {
    return this._zone;
  }

  getOptions() {
    return this._options;
  }
}

class RectanglePaneView {
  constructor(source) {
    this._source = source;
    this._x1 = 0;
    this._y1 = 0;
    this._x2 = 0;
    this._y2 = 0;
  }

  update() {
    const chart = this._source.chart();
    const series = this._source.series();
    if (!chart || !series) return;

    const zone = this._source.getZone();
    const timeScale = chart.timeScale();

    this._x1 = timeScale.timeToCoordinate(zone.startTime);
    this._y1 = series.priceToCoordinate(zone.high);
    this._x2 = timeScale.timeToCoordinate(zone.endTime);
    this._y2 = series.priceToCoordinate(zone.low);
  }

  renderer() {
    return {
      draw: (target) => {
        target.useBitmapCoordinateSpace(scope => {
          const ctx = scope.context;
          const { horizontalPixelRatio, verticalPixelRatio } = scope;

          if (this._x1 === null || this._y1 === null ||
            this._x2 === null || this._y2 === null) return;

          const x1 = Math.min(this._x1, this._x2) * horizontalPixelRatio;
          const y1 = Math.min(this._y1, this._y2) * verticalPixelRatio;
          const x2 = Math.max(this._x1, this._x2) * horizontalPixelRatio;
          const y2 = Math.max(this._y1, this._y2) * verticalPixelRatio;

          const width = x2 - x1;
          const height = y2 - y1;

          const options = this._source.getOptions();

          ctx.save();

          // Fill rectangle
          ctx.fillStyle = options.fillColor;
          ctx.fillRect(x1, y1, width, height);

          // Draw border
          ctx.strokeStyle = options.borderColor;
          ctx.lineWidth = options.borderWidth * horizontalPixelRatio;
          ctx.strokeRect(x1, y1, width, height);

          // Draw label
          if (options.label) {
            const fontSize = 11 * horizontalPixelRatio;
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;

            const labelText = options.label;
            const textMetrics = ctx.measureText(labelText);
            const textWidth = textMetrics.width;
            const textHeight = fontSize;
            const padding = 4 * horizontalPixelRatio;

            // Position label at top-left of rectangle
            const labelX = x1 + padding;
            const labelY = y1 + padding;

            // Draw label background
            ctx.fillStyle = options.labelBgColor;
            ctx.fillRect(
              labelX - padding / 2,
              labelY - padding / 2,
              textWidth + padding,
              textHeight + padding
            );

            // Draw label text
            ctx.fillStyle = options.labelColor;
            ctx.textBaseline = 'top';
            ctx.fillText(labelText, labelX, labelY);
          }

          ctx.restore();
        });
      }
    };
  }
}

const PriceActionEngine = () => {
  // i18n hook for translations
  const { t, language } = useTranslation();

  const [symbol, setSymbol] = useState(null);
  const [availableSymbols, setAvailableSymbols] = useState([]);
  const [recentSymbols, setRecentSymbols] = useState(() => {
    const saved = localStorage.getItem('recentSymbols');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [symbolsLoading, setSymbolsLoading] = useState(true);
  const dropdownRef = useRef(null);
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const [dataRange, setDataRange] = useState('medium'); // short, medium, long
  const [drawingMode, setDrawingMode] = useState(null); // null, 'horizontal', 'diagonal'
  const [drawnLines, setDrawnLines] = useState([]); // Horizontal price lines
  const [trendLines, setTrendLines] = useState([]); // Diagonal trend lines
  const [firstPoint, setFirstPoint] = useState(null); // For two-click diagonal drawing
  const trendLinePrimitivesRef = useRef([]); // Store primitive instances
  const zonePrimitivesRef = useRef([]); // Store reference zone primitives
  const priceLineRefs = useRef([]); // Store horizontal line instances for cleanup
  const userTrendLinePrimitivesRef = useRef([]); // Store user trend line primitives with IDs

  // Dragging state for interactive line editing
  const [isDragging, setIsDragging] = useState(false);
  const draggingLineRef = useRef(null); // { id, type, endpoint, startTime, startPrice, originalP1, originalP2 }
  const dragStartYRef = useRef(null);

  // Refs to store latest line values (prevents stale closures in drag handlers)
  const drawnLinesRef = useRef([]);
  const trendLinesRef = useRef([]);
  const [showLineManager, setShowLineManager] = useState(false); // Toggle line manager panel

  const [timeframe, setTimeframe] = useState('4h');
  const [activeTab, setActiveTab] = useState('setups');
  const [candleData, setCandleData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const [investment, setInvestment] = useState('10000');
  const [riskPercent, setRiskPercent] = useState(1);
  const [selectedSetup, setSelectedSetup] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showDebug, setShowDebug] = useState(false); // Visual Debug Mode

  // Trade Tracker State
  const [trades, setTrades] = useState(() => {
    const saved = localStorage.getItem('trades');
    return saved ? JSON.parse(saved) : [];
  });
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [newTrade, setNewTrade] = useState({
    pair: '',
    direction: 'long',
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    size: '',
    notes: ''
  });

  // V3 Signal Engine State
  const [showDebugLayer, setShowDebugLayer] = useState(false); // Toggle swing points debug
  const [v3Analysis, setV3Analysis] = useState(null); // V3 analysis results
  const [selectedCondition, setSelectedCondition] = useState(null); // For click-to-zoom
  const [conditionResults, setConditionResults] = useState([]); // Real-time condition status
  const highlightPrimitiveRef = useRef(null); // For neon highlight on click
  const signalMemoryRef = useRef(new SignalMemory()); // Persistent memory

  // Scanner State
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('scannerWatchlist');
    return saved ? JSON.parse(saved) : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'TRXUSDT', 'LINKUSDT', 'DOTUSDT'];
  });
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scannerResults, setScannerResults] = useState({});
  const [newSymbolInput, setNewSymbolInput] = useState('');
  const [showScannerDropdown, setShowScannerDropdown] = useState(false);
  const scannerEngineRef = useRef(null);
  const scannerInputRef = useRef(null);

  // AI Agent State
  const [geminiApiKey, setGeminiApiKey] = useState(() =>
    localStorage.getItem('geminiApiKey') || ''
  );
  const [aiEnabled, setAiEnabled] = useState(() => {
    const saved = localStorage.getItem('aiMasterEnabled');
    return saved ? JSON.parse(saved) : true;
  });
  const [verificationModal, setVerificationModal] = useState(null);
  const [aiVerifications, setAiVerifications] = useState({});
  const [userFeedback, setUserFeedback] = useState(() => {
    const saved = localStorage.getItem('aiFeedback');
    return saved ? JSON.parse(saved) : [];
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const agentEngineRef = useRef(null);

  // AI Visual Bridge State
  const [aiAnnotations, setAiAnnotations] = useState([]);
  const aiPrimitivesRef = useRef([]); // Store PriceLine references for cleanup

  // Initialize Agent Engine when API key changes
  useEffect(() => {
    if (geminiApiKey) {
      console.log('🔑 API Key detected, initializing AgentEngine...');
      agentEngineRef.current = new AgentEngine(geminiApiKey);
      console.log('🤖 AgentEngine Ready');
    } else {
      console.warn('⚠️ No API Key found, AgentEngine paused');
      agentEngineRef.current = null;
    }
  }, [geminiApiKey]);

  // Set initial chat welcome message based on language
  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([{ role: 'bot', text: t('chat.welcome') }]);
    }
  }, [language, t]);


  const evaluateComplexity = (msg) => {
    const technicalKeywords = [
      'liquidity', 'order block', 'fvg', 'backtest', 'strategy',
      'optimization', 'algorithm', 'quant', 'volatility', 'sweep'
    ];
    const m = msg.toLowerCase();
    let score = 0;

    // Length check
    if (m.length > 100) score += 3;
    if (m.length > 250) score += 5;

    // Keyword check
    const matches = technicalKeywords.filter(kw => m.includes(kw));
    score += matches.length * 2;

    // Structure check (questions, nested thoughts)
    if (m.includes('?') && m.length > 50) score += 1;

    return score;
  };

  const routeMessageToModel = async (msg) => {
    const complexityScore = evaluateComplexity(msg);

    // If AI Agent is available, use it for context-aware responses
    if (agentEngineRef.current) {
      try {
        const result = await agentEngineRef.current.chatWithContext(
          msg,
          scannerResults,
          chatMessages.slice(-5)
        );
        return {
          text: result.text,
          model: '🤖 Gemini AI Agent',
          visualMarkers: result.visualMarkers // Pass visual markers up
        };
      } catch (err) {
        console.error('AI Agent error:', err);
        // Fall back to rule-based responses
      }
    }

    // Fallback: Rule-based responses
    const useOpus = complexityScore >= 6;
    const modelName = useOpus ? 'Claude 4.5 Opus' : 'Gemini Pro';

    // Simulating API latency
    await new Promise(resolve => setTimeout(resolve, 500));

    const baseResponse = getChatResponse(msg);
    return {
      text: baseResponse + `\n\n[${geminiApiKey ? '⚠️ AI Hatası - ' : ''}Analiz: ${modelName} tarafından gerçekleştirildi]`,
      model: modelName
    };
  };

  const logFeedback = (symbol, signalType, isPositive) => {
    const feedback = {
      id: Date.now(),
      symbol,
      signalType,
      type: isPositive ? 'positive' : 'negative',
      timestamp: new Date().toISOString()
    };

    setUserFeedback(prev => {
      const updated = [...prev, feedback];
      localStorage.setItem('aiFeedback', JSON.stringify(updated));
      return updated;
    });

    if (agentEngineRef.current) {
      console.log('🤖 AI Feedback Logged:', feedback);
    }
  };

  const verifySignalWithAI = async (targetSymbol, result) => {
    if (!agentEngineRef.current || !aiEnabled) return;
    if (targetSymbol !== symbol) {
      alert('Lütfen önce sembolü grafikte açın.');
      setSymbol(targetSymbol);
      return;
    }

    setAiVerifications(prev => ({ ...prev, [targetSymbol]: { status: 'loading' } }));

    try {
      // Prepare visual structure data
      const swings = findSwingPoints(candleData);
      const visualMeta = {
        orderBlocks: findOrderBlocks(candleData),
        fvgs: findFVG(candleData),
        trend: detectTrend(candleData),
        swings
      };

      const analysis = await agentEngineRef.current.verifyHybridSetup(
        targetSymbol,
        result,
        candleData,
        visualMeta
      );

      setAiVerifications(prev => ({
        ...prev,
        [targetSymbol]: { status: 'complete', data: analysis }
      }));
      setVerificationModal({ symbol: targetSymbol, data: analysis });

      // AUTO-RENDER VISUALS IF CONFIRMED OR CAUTION
      if (analysis.visualMarkers && analysis.visualMarkers.length > 0) {
        renderVisualMarkers(analysis.visualMarkers);
      }

    } catch (err) {
      console.error('AI Verification Error:', err);
      setAiVerifications(prev => ({ ...prev, [targetSymbol]: { status: 'error' } }));
      alert('AI Analizi başarısız oldu.');
    }
  };

  const verifyConditionWithAI = async (condition, setup) => {
    if (!agentEngineRef.current || !aiEnabled) return;

    // Show loading state on condition (optimistic UI or local state)
    console.log('🤖 Verifying Condition:', condition.text);

    try {
      const analysis = await agentEngineRef.current.verifyHybridSetup(
        symbol,
        condition.text,
        setup,
        candleData
      );

      console.log('✅ Condition Verified:', analysis);

      if (analysis.visualMarkers && analysis.visualMarkers.length > 0) {
        renderVisualMarkers(analysis.visualMarkers);
      }

      // Update local state if needed (e.g., mark as verified)
      // For now, we rely on the visual markers appearing

    } catch (err) {
      console.error('AI Verify Failed:', err);
    }
  };

  const explainConditionWithAI = async (condition, setup) => {
    if (!agentEngineRef.current || !aiEnabled) return;

    setChatInput(`BU KOŞULU AÇIKLA: "${condition.text}" (Setup: ${setup.techniqueLabel})`);

    // Trigger chat directly
    const msg = `Lütfen şu koşulu detaylı açıkla, neden önemli?: "${condition.text}". Bu kurulum (${setup.techniqueLabel}) için neden kritik?`;

    // Simulate chat submission
    handleChatSubmit(null, msg);
  };

  const renderVisualMarkers = (markers) => {
    console.log('🎯 renderVisualMarkers called with:', markers);

    if (!candlestickSeriesRef.current) {
      console.error('❌ Cannot render - candlestickSeriesRef is null');
      return;
    }

    if (!markers || !Array.isArray(markers)) {
      console.warn('⚠️ No valid markers array provided');
      return;
    }

    // Clear existing AI primitives first to avoid clutter
    clearAiDrawings();

    // Filter and validate markers
    const validMarkers = markers.filter(m => {
      const hasPrice = typeof m.price === 'number' && !isNaN(m.price);
      const hasZone = typeof m.top === 'number' && typeof m.bottom === 'number' && !isNaN(m.top) && !isNaN(m.bottom);
      return hasPrice || hasZone;
    });

    console.log(`✅ ${validMarkers.length}/${markers.length} markers are valid`);

    if (validMarkers.length === 0) {
      console.warn('⚠️ No valid markers to render (need numeric price or top/bottom values)');
      console.log('📋 Raw markers received:', JSON.stringify(markers, null, 2));
      return;
    }

    validMarkers.forEach((marker, idx) => {
      const color = marker.color || '#ffff00';
      const linesToDraw = [];

      if (typeof marker.top === 'number' && typeof marker.bottom === 'number') {
        // Zone: Draw two lines for top and bottom
        linesToDraw.push({ price: marker.top, title: `${marker.label || 'ZONE'} (Top)` });
        linesToDraw.push({ price: marker.bottom, title: `${marker.label || 'ZONE'} (Bot)` });
      } else if (typeof marker.price === 'number') {
        // Single line
        linesToDraw.push({ price: marker.price, title: marker.label || 'LEVEL' });
      }

      linesToDraw.forEach(item => {
        console.log(`🖌️ Drawing line: ${item.title} @ ${item.price}`);
        try {
          const priceLine = candlestickSeriesRef.current.createPriceLine({
            price: item.price,
            color: color,
            lineWidth: 2,
            lineStyle: 2, // Dashed
            axisLabelVisible: true,
            title: '🤖 ' + item.title,
          });
          aiPrimitivesRef.current.push(priceLine);
        } catch (err) {
          console.error(`❌ Failed to draw line at ${item.price}:`, err);
        }
      });
    });

    console.log(`✅ Total ${aiPrimitivesRef.current.length} AI price lines drawn`);
    setAiAnnotations(markers);
  };

  const clearAiDrawings = () => {
    if (!candlestickSeriesRef.current) return;
    aiPrimitivesRef.current.forEach(p => candlestickSeriesRef.current.removePriceLine(p));
    aiPrimitivesRef.current = [];
    setAiAnnotations([]);
    console.log('🧹 AI Visuals Cleared');
  };

  const findSwingPoints = (data) => {
    const swings = { highs: [], lows: [] };
    const lookback = 3;

    for (let i = lookback; i < data.length - lookback; i++) {
      const current = data[i];
      let isSwingHigh = true;
      let isSwingLow = true;

      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j === i) continue;
        if (data[j].high > current.high) isSwingHigh = false;
        if (data[j].low < current.low) isSwingLow = false;
      }

      if (isSwingHigh) swings.highs.push({ index: i, price: current.high, time: current.time });
      if (isSwingLow) swings.lows.push({ index: i, price: current.low, time: current.time });
    }

    return swings;
  };

  const findSupportResistance = (data, swings) => {
    const levels = [];
    const tolerance = 0.01;
    const allPoints = [...swings.highs, ...swings.lows];

    allPoints.forEach(point => {
      const existingLevel = levels.find(level =>
        Math.abs(level.price - point.price) / point.price < tolerance
      );

      if (existingLevel) {
        existingLevel.touches++;
        existingLevel.strength = Math.min(existingLevel.strength + 15, 100);
      } else {
        levels.push({
          price: point.price,
          touches: 1,
          strength: 50,
          type: swings.highs.includes(point) ? 'resistance' : 'support'
        });
      }
    });

    return levels.filter(l => l.touches >= 1).sort((a, b) => b.strength - a.strength).slice(0, 8);
  };

  const detectTrend = (data) => {
    if (data.length < 20) return 'insufficient_data';

    const recentData = data.slice(-40);
    const swings = findSwingPoints(recentData);

    if (swings.highs.length < 2 || swings.lows.length < 2) {
      const priceChange = (recentData[recentData.length - 1].close - recentData[0].close) / recentData[0].close;
      if (priceChange > 0.02) return 'uptrend';
      if (priceChange < -0.02) return 'downtrend';
      return 'ranging';
    }

    const recentHighs = swings.highs.slice(-3);
    const recentLows = swings.lows.slice(-3);

    const higherHighs = recentHighs.length >= 2 && recentHighs[recentHighs.length - 1].price > recentHighs[0].price;
    const higherLows = recentLows.length >= 2 && recentLows[recentLows.length - 1].price > recentLows[0].price;
    const lowerHighs = recentHighs.length >= 2 && recentHighs[recentHighs.length - 1].price < recentHighs[0].price;
    const lowerLows = recentLows.length >= 2 && recentLows[recentLows.length - 1].price < recentLows[0].price;

    if (higherHighs || higherLows) return 'uptrend';
    if (lowerHighs || lowerLows) return 'downtrend';
    return 'ranging';
  };

  // ORDER BLOCK DETECTION
  // Bullish OB: Last bearish candle before a strong bullish move
  // Bearish OB: Last bullish candle before a strong bearish move
  const findOrderBlocks = (data) => {
    const orderBlocks = [];
    const minMovePercent = 0.015; // 1.5% move to qualify as impulsive

    for (let i = 3; i < data.length - 1; i++) {
      const current = data[i];
      const prev = data[i - 1];
      const next = data[i + 1];

      // Calculate move after this candle
      const futureData = data.slice(i + 1, Math.min(i + 6, data.length));
      if (futureData.length < 2) continue;

      const maxHigh = Math.max(...futureData.map(c => c.high));
      const minLow = Math.min(...futureData.map(c => c.low));

      // Bullish Order Block: Bearish candle followed by strong bullish move
      if (current.close < current.open) {
        const moveUp = (maxHigh - current.high) / current.high;
        if (moveUp > minMovePercent) {
          orderBlocks.push({
            type: 'bullish',
            high: current.high,
            low: current.low,
            time: current.time,
            endTime: futureData[futureData.length - 1].time,
            strength: Math.min(moveUp * 100 * 3, 100),
            mitigated: data.slice(i + 1).some(c => c.low < current.low)
          });
        }
      }

      // Bearish Order Block: Bullish candle followed by strong bearish move
      if (current.close > current.open) {
        const moveDown = (current.low - minLow) / current.low;
        if (moveDown > minMovePercent) {
          orderBlocks.push({
            type: 'bearish',
            high: current.high,
            low: current.low,
            time: current.time,
            endTime: futureData[futureData.length - 1].time,
            strength: Math.min(moveDown * 100 * 3, 100),
            mitigated: data.slice(i + 1).some(c => c.high > current.high)
          });
        }
      }
    }

    // Filter out mitigated OBs and return most recent
    return orderBlocks.filter(ob => !ob.mitigated).slice(-5);
  };

  // FAIR VALUE GAP DETECTION
  // Bullish FVG: Candle 1 high < Candle 3 low (gap up)
  // Bearish FVG: Candle 1 low > Candle 3 high (gap down)
  const findFVG = (data) => {
    const fvgs = [];

    for (let i = 2; i < data.length; i++) {
      const candle1 = data[i - 2];
      const candle2 = data[i - 1];
      const candle3 = data[i];

      // Bullish FVG
      if (candle1.high < candle3.low) {
        const gapSize = (candle3.low - candle1.high) / candle1.high;
        if (gapSize > 0.002) { // Min 0.2% gap
          const filled = data.slice(i + 1).some(c => c.low <= candle1.high);
          fvgs.push({
            type: 'bullish',
            high: candle3.low,
            low: candle1.high,
            time: candle1.time,
            endTime: candle3.time,
            gapPercent: gapSize * 100,
            filled
          });
        }
      }

      // Bearish FVG
      if (candle1.low > candle3.high) {
        const gapSize = (candle1.low - candle3.high) / candle3.high;
        if (gapSize > 0.002) {
          const filled = data.slice(i + 1).some(c => c.high >= candle1.low);
          fvgs.push({
            type: 'bearish',
            high: candle1.low,
            low: candle3.high,
            time: candle1.time,
            endTime: candle3.time,
            gapPercent: gapSize * 100,
            filled
          });
        }
      }
    }

    return fvgs.filter(fvg => !fvg.filled).slice(-5);
  };

  // RANGE/CONSOLIDATION DETECTION
  const findRanges = (data) => {
    const ranges = [];
    const minBars = 8; // Minimum bars for a valid range
    const maxRangePercent = 0.03; // Max 3% range to be considered consolidation

    for (let i = 0; i < data.length - minBars; i++) {
      const segment = data.slice(i, i + minBars);
      const highs = segment.map(c => c.high);
      const lows = segment.map(c => c.low);
      const rangeHigh = Math.max(...highs);
      const rangeLow = Math.min(...lows);
      const rangePercent = (rangeHigh - rangeLow) / rangeLow;

      if (rangePercent < maxRangePercent) {
        // Check if this range extends further
        let endIdx = i + minBars;
        while (endIdx < data.length) {
          const nextCandle = data[endIdx];
          if (nextCandle.high > rangeHigh * 1.01 || nextCandle.low < rangeLow * 0.99) break;
          endIdx++;
        }

        if (endIdx - i >= minBars) {
          ranges.push({
            high: rangeHigh,
            low: rangeLow,
            startTime: data[i].time,
            endTime: data[endIdx - 1].time,
            bars: endIdx - i,
            touchesHigh: segment.filter(c => c.high > rangeHigh * 0.998).length,
            touchesLow: segment.filter(c => c.low < rangeLow * 1.002).length
          });
          i = endIdx - 1; // Skip processed bars
        }
      }
    }

    return ranges.slice(-3);
  };

  // BREAK OF STRUCTURE DETECTION
  const findBOS = (data, swings) => {
    const bosLevels = [];

    // Check for bullish BOS (price breaks above swing high)
    for (let i = 1; i < swings.highs.length; i++) {
      const prevHigh = swings.highs[i - 1];
      const currentHigh = swings.highs[i];

      // Find candle that broke the structure
      const breakCandle = data.find((c, idx) =>
        idx > prevHigh.index && c.close > prevHigh.price
      );

      if (breakCandle && currentHigh.price > prevHigh.price) {
        bosLevels.push({
          type: 'bullish',
          level: prevHigh.price,
          time: breakCandle.time,
          swingTime: prevHigh.time
        });
      }
    }

    // Check for bearish BOS (price breaks below swing low)
    for (let i = 1; i < swings.lows.length; i++) {
      const prevLow = swings.lows[i - 1];
      const currentLow = swings.lows[i];

      const breakCandle = data.find((c, idx) =>
        idx > prevLow.index && c.close < prevLow.price
      );

      if (breakCandle && currentLow.price < prevLow.price) {
        bosLevels.push({
          type: 'bearish',
          level: prevLow.price,
          time: breakCandle.time,
          swingTime: prevLow.time
        });
      }
    }

    return bosLevels.slice(-5);
  };

  // LIQUIDITY SWEEP DETECTION
  const findLiquiditySweeps = (data, swings) => {
    const sweeps = [];

    // Find equal highs/lows (liquidity pools)
    const tolerance = 0.003;

    // Check for sweeps of equal highs
    for (let i = 0; i < swings.highs.length - 1; i++) {
      for (let j = i + 1; j < swings.highs.length; j++) {
        const diff = Math.abs(swings.highs[i].price - swings.highs[j].price) / swings.highs[i].price;
        if (diff < tolerance) {
          // Equal highs found - check if swept and rejected
          const targetHigh = Math.max(swings.highs[i].price, swings.highs[j].price);
          const afterIdx = Math.max(swings.highs[i].index, swings.highs[j].index);

          for (let k = afterIdx + 1; k < data.length; k++) {
            const candle = data[k];
            // Wick above equal highs but close below = bearish sweep
            if (candle.high > targetHigh * 1.001 && candle.close < targetHigh) {
              sweeps.push({
                type: 'bearish',
                sweepLevel: targetHigh,
                sweepTime: candle.time,
                direction: 'short'
              });
              break;
            }
          }
        }
      }
    }

    // Check for sweeps of equal lows
    for (let i = 0; i < swings.lows.length - 1; i++) {
      for (let j = i + 1; j < swings.lows.length; j++) {
        const diff = Math.abs(swings.lows[i].price - swings.lows[j].price) / swings.lows[i].price;
        if (diff < tolerance) {
          const targetLow = Math.min(swings.lows[i].price, swings.lows[j].price);
          const afterIdx = Math.max(swings.lows[i].index, swings.lows[j].index);

          for (let k = afterIdx + 1; k < data.length; k++) {
            const candle = data[k];
            // Wick below equal lows but close above = bullish sweep
            if (candle.low < targetLow * 0.999 && candle.close > targetLow) {
              sweeps.push({
                type: 'bullish',
                sweepLevel: targetLow,
                sweepTime: candle.time,
                direction: 'long'
              });
              break;
            }
          }
        }
      }
    }

    return sweeps.slice(-3);
  };

  // CONFIDENCE CALCULATION
  const calculateConfidence = (setup, trend, srLevels, data) => {
    const breakdown = {
      trendAlignment: { score: 0, maxScore: 25, reason: '' },
      srStrength: { score: 0, maxScore: 20, reason: '' },
      patternQuality: { score: 0, maxScore: 20, reason: '' },
      volumeConfirm: { score: 0, maxScore: 15, reason: '' },
      mtfConfluence: { score: 0, maxScore: 10, reason: '' },
      historicalRate: { score: 0, maxScore: 10, reason: '' }
    };

    // 1. Trend Alignment (25%)
    if (setup.direction === 'long') {
      if (trend === 'uptrend') {
        breakdown.trendAlignment = { score: 25, maxScore: 25, reason: 'Trend yönüyle uyumlu (uptrend)' };
      } else if (trend === 'ranging') {
        breakdown.trendAlignment = { score: 15, maxScore: 25, reason: 'Yatay piyasa - dikkatli ol' };
      } else {
        breakdown.trendAlignment = { score: 5, maxScore: 25, reason: 'Trend karşıtı işlem (riskli)' };
      }
    } else {
      if (trend === 'downtrend') {
        breakdown.trendAlignment = { score: 25, maxScore: 25, reason: 'Trend yönüyle uyumlu (downtrend)' };
      } else if (trend === 'ranging') {
        breakdown.trendAlignment = { score: 15, maxScore: 25, reason: 'Yatay piyasa - dikkatli ol' };
      } else {
        breakdown.trendAlignment = { score: 5, maxScore: 25, reason: 'Trend karşıtı işlem (riskli)' };
      }
    }

    // 2. S/R Strength (20%)
    const relevantLevel = srLevels.find(l =>
      Math.abs(l.price - setup.entry[0]) / setup.entry[0] < 0.02
    );
    if (relevantLevel) {
      const strength = Math.min(relevantLevel.touches * 5, 20);
      breakdown.srStrength = {
        score: strength,
        maxScore: 20,
        reason: `Seviye ${relevantLevel.touches}x test edilmiş`
      };
    } else {
      breakdown.srStrength = { score: 8, maxScore: 20, reason: 'Orta güçte seviye' };
    }

    // 3. Pattern Quality (20%)
    const patternScore = setup.technique === 'order_block' ? 18 :
      setup.technique === 'fvg' ? 16 :
        setup.technique === 'liquidity_sweep' ? 17 :
          setup.technique === 'range' ? 14 :
            setup.technique === 'bos' ? 15 : 12;
    breakdown.patternQuality = {
      score: patternScore,
      maxScore: 20,
      reason: `${setup.techniqueLabel} pattern kalitesi`
    };

    // 4. Volume (15%) - simplified
    const recentVolumes = data.slice(-20).map(c => c.volume);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const lastVolume = data[data.length - 1].volume;
    if (lastVolume > avgVolume * 1.5) {
      breakdown.volumeConfirm = { score: 15, maxScore: 15, reason: 'Hacim ortalamanın üstünde' };
    } else if (lastVolume > avgVolume) {
      breakdown.volumeConfirm = { score: 10, maxScore: 15, reason: 'Hacim normal' };
    } else {
      breakdown.volumeConfirm = { score: 5, maxScore: 15, reason: 'Düşük hacim - dikkat' };
    }

    // 5. MTF Confluence (10%) - simplified
    breakdown.mtfConfluence = { score: 7, maxScore: 10, reason: 'Tek timeframe analizi' };

    // 6. Historical Rate (10%)
    breakdown.historicalRate = { score: 7, maxScore: 10, reason: 'Benzer setuplar ~65% başarılı' };

    const totalScore = Object.values(breakdown).reduce((sum, item) => sum + item.score, 0);

    return { total: totalScore, breakdown };
  };

  const generateSetups = useMemo(() => {
    if (candleData.length < 50) return { longSetups: [], shortSetups: [], noLongReason: [], noShortReason: [] };

    const swings = findSwingPoints(candleData);
    const srLevels = findSupportResistance(candleData, swings);
    const trend = detectTrend(candleData);
    const currentPrice = candleData[candleData.length - 1].close;
    const lastCandle = candleData[candleData.length - 1];

    // Find all patterns
    const orderBlocks = findOrderBlocks(candleData);
    const fvgs = findFVG(candleData);
    const ranges = findRanges(candleData);
    const bosLevels = findBOS(candleData, swings);
    const sweeps = findLiquiditySweeps(candleData, swings);

    const longSetups = [];
    const shortSetups = [];
    const noLongReason = [];
    const noShortReason = [];

    let setupId = 1;

    // ============ LONG SETUPS ============

    // 1. Bullish Order Block Setup
    const bullishOBs = orderBlocks.filter(ob => ob.type === 'bullish');
    const nearbyBullishOB = bullishOBs.find(ob =>
      currentPrice > ob.low && currentPrice < ob.high * 1.02
    );

    if (nearbyBullishOB) {
      const baseSetup = {
        id: setupId++,
        name: 'Order Block Long',
        direction: 'long',
        technique: 'order_block',
        techniqueLabel: 'Order Block',
        color: '#10b981',
        entry: [nearbyBullishOB.low, nearbyBullishOB.high],
        stop: nearbyBullishOB.low * 0.99,
        targets: [
          { level: currentPrice * 1.02, rr: 2.0 },
          { level: currentPrice * 1.035, rr: 3.5 },
          { level: currentPrice * 1.05, rr: 5.0 }
        ],
        referenceZones: [{
          type: 'orderBlock',
          high: nearbyBullishOB.high,
          low: nearbyBullishOB.low,
          startTime: nearbyBullishOB.time,
          endTime: lastCandle.time,
          color: 'rgba(16, 185, 129, 0.2)'
        }],
        swingPoints: swings.lows.slice(-3).map(s => ({ ...s, type: 'low' })),
        reasons: [
          { type: 'positive', text: `Bullish OB güç: ${nearbyBullishOB.strength.toFixed(0)}%` },
          { type: 'positive', text: 'Fiyat OB zonuna yakın' }
        ],
        confirmations: [
          'Fiyat OB zone\'a geri dönmeli',
          'Zone içinde rejection candle (pin bar, engulfing) oluşmalı',
          'Volume artışı ile doğrulama',
          'HTF trend uyumu kontrolü'
        ]
      };
      const conf = calculateConfidence(baseSetup, trend, srLevels, candleData);
      baseSetup.confidence = conf.total;
      baseSetup.confidenceBreakdown = conf.breakdown;
      longSetups.push(baseSetup);
    }

    // 2. Bullish FVG Setup
    const bullishFVGs = fvgs.filter(f => f.type === 'bullish');
    const nearbyBullishFVG = bullishFVGs.find(f =>
      currentPrice >= f.low && currentPrice <= f.high * 1.01
    );

    if (nearbyBullishFVG) {
      const baseSetup = {
        id: setupId++,
        name: 'FVG Fill Long',
        direction: 'long',
        technique: 'fvg',
        techniqueLabel: 'Fair Value Gap',
        color: '#f59e0b',
        entry: [nearbyBullishFVG.low, nearbyBullishFVG.high],
        stop: nearbyBullishFVG.low * 0.985,
        targets: [
          { level: currentPrice * 1.015, rr: 1.5 },
          { level: currentPrice * 1.03, rr: 3.0 }
        ],
        referenceZones: [{
          type: 'fvg',
          high: nearbyBullishFVG.high,
          low: nearbyBullishFVG.low,
          startTime: nearbyBullishFVG.time,
          endTime: nearbyBullishFVG.endTime,
          color: 'rgba(245, 158, 11, 0.2)'
        }],
        swingPoints: [],
        reasons: [
          { type: 'positive', text: `Bullish FVG: ${nearbyBullishFVG.gapPercent.toFixed(2)}%` },
          { type: 'positive', text: 'Gap henüz doldurulmamış' }
        ],
        confirmations: [
          'Fiyat FVG\'nin %50-75 bölgesine ulaşmalı',
          'FVG içinde bullish rejection (pin bar, hammer)',
          'Volume spike ile doğrulama',
          'Önceki mumun body\'si FVG içinde kapanmalı'
        ]
      };
      const conf = calculateConfidence(baseSetup, trend, srLevels, candleData);
      baseSetup.confidence = conf.total;
      baseSetup.confidenceBreakdown = conf.breakdown;
      longSetups.push(baseSetup);
    }

    // 3. Range Bottom Long
    const activeRange = ranges.find(r =>
      currentPrice >= r.low * 0.99 && currentPrice <= r.high * 1.01
    );

    if (activeRange && currentPrice < (activeRange.low + activeRange.high) / 2) {
      const baseSetup = {
        id: setupId++,
        name: 'Range Alt Long',
        direction: 'long',
        technique: 'range',
        techniqueLabel: 'Range Trading',
        color: '#8b5cf6',
        entry: [activeRange.low, activeRange.low * 1.005],
        stop: activeRange.low * 0.985,
        targets: [
          { level: (activeRange.low + activeRange.high) / 2, rr: 1.5 },
          { level: activeRange.high, rr: 3.0 }
        ],
        referenceZones: [{
          type: 'range',
          high: activeRange.high,
          low: activeRange.low,
          startTime: activeRange.startTime,
          endTime: lastCandle.time,
          color: 'rgba(139, 92, 246, 0.15)'
        }],
        swingPoints: [],
        reasons: [
          { type: 'positive', text: `Range: ${activeRange.bars} bar sürüyor` },
          { type: 'positive', text: 'Fiyat range alt bandında' }
        ],
        confirmations: [
          'Range alt sınırına net dokunma',
          'Sınırda rejection candle (bullish engulfing, pin bar)',
          'Volume azalması sonrası ani artış',
          'RSI oversold bölgesinden çıkış'
        ]
      };
      const conf = calculateConfidence(baseSetup, trend, srLevels, candleData);
      baseSetup.confidence = conf.total;
      baseSetup.confidenceBreakdown = conf.breakdown;
      longSetups.push(baseSetup);
    }

    // 4. Bullish Liquidity Sweep
    const bullishSweep = sweeps.find(s => s.type === 'bullish');
    if (bullishSweep) {
      const baseSetup = {
        id: setupId++,
        name: 'Liquidity Sweep Long',
        direction: 'long',
        technique: 'liquidity_sweep',
        techniqueLabel: 'Likidite Avı',
        color: '#06b6d4',
        entry: [bullishSweep.sweepLevel * 0.998, bullishSweep.sweepLevel * 1.005],
        stop: bullishSweep.sweepLevel * 0.985,
        targets: [
          { level: currentPrice * 1.02, rr: 2.0 },
          { level: currentPrice * 1.04, rr: 4.0 }
        ],
        referenceZones: [],
        swingPoints: swings.lows.slice(-2).map(s => ({ ...s, type: 'low' })),
        reasons: [
          { type: 'positive', text: 'Equal lows sweep edildi' },
          { type: 'positive', text: 'Fiyat geri döndü - bull trap tamamlandı' }
        ],
        confirmations: [
          'Wick ile sweep gerçekleşmeli (body altında kapatma)',
          'Sweep sonrası strong bullish candle',
          'Sweep mumunun tavanı kırılmalı',
          'Volume spike ile reversal doğrulama'
        ]
      };
      const conf = calculateConfidence(baseSetup, trend, srLevels, candleData);
      baseSetup.confidence = conf.total;
      baseSetup.confidenceBreakdown = conf.breakdown;
      longSetups.push(baseSetup);
    }

    // 5. Bullish BOS Retest
    const bullishBOS = bosLevels.filter(b => b.type === 'bullish').slice(-1)[0];
    if (bullishBOS && currentPrice > bullishBOS.level && currentPrice < bullishBOS.level * 1.02) {
      const baseSetup = {
        id: setupId++,
        name: 'BOS Retest Long',
        direction: 'long',
        technique: 'bos',
        techniqueLabel: 'Break of Structure',
        color: '#22c55e',
        entry: [bullishBOS.level * 0.998, bullishBOS.level * 1.008],
        stop: bullishBOS.level * 0.985,
        targets: [
          { level: currentPrice * 1.025, rr: 2.5 },
          { level: currentPrice * 1.045, rr: 4.5 }
        ],
        referenceZones: [],
        swingPoints: swings.highs.slice(-2).map(s => ({ ...s, type: 'high' })),
        reasons: [
          { type: 'positive', text: 'Bullish BOS oluştu' },
          { type: 'positive', text: 'Fiyat kırılan seviyeyi retest ediyor' }
        ],
        confirmations: [
          'Kırılan seviyeye geri dönüş (retest)',
          'Retest sırasında bullish rejection',
          'Önceki direncininin desteğe dönüşmüş olmalı',
          'LTF\'de bullish structure oluşmalı'
        ]
      };
      const conf = calculateConfidence(baseSetup, trend, srLevels, candleData);
      baseSetup.confidence = conf.total;
      baseSetup.confidenceBreakdown = conf.breakdown;
      longSetups.push(baseSetup);
    }

    // ============ SHORT SETUPS ============

    // 1. Bearish Order Block Setup
    const bearishOBs = orderBlocks.filter(ob => ob.type === 'bearish');
    const nearbyBearishOB = bearishOBs.find(ob =>
      currentPrice < ob.high && currentPrice > ob.low * 0.98
    );

    if (nearbyBearishOB) {
      const baseSetup = {
        id: setupId++,
        name: 'Order Block Short',
        direction: 'short',
        technique: 'order_block',
        techniqueLabel: 'Order Block',
        color: '#ef4444',
        entry: [nearbyBearishOB.low, nearbyBearishOB.high],
        stop: nearbyBearishOB.high * 1.01,
        targets: [
          { level: currentPrice * 0.98, rr: 2.0 },
          { level: currentPrice * 0.965, rr: 3.5 },
          { level: currentPrice * 0.95, rr: 5.0 }
        ],
        referenceZones: [{
          type: 'orderBlock',
          high: nearbyBearishOB.high,
          low: nearbyBearishOB.low,
          startTime: nearbyBearishOB.time,
          endTime: lastCandle.time,
          color: 'rgba(239, 68, 68, 0.2)'
        }],
        swingPoints: swings.highs.slice(-3).map(s => ({ ...s, type: 'high' })),
        reasons: [
          { type: 'positive', text: `Bearish OB güç: ${nearbyBearishOB.strength.toFixed(0)}%` },
          { type: 'positive', text: 'Fiyat OB zonuna yakın' }
        ],
        confirmations: [
          'Fiyat OB zone\'a geri dönmeli',
          'Zone içinde bearish rejection (shooting star, bearish engulfing)',
          'Volume artışı ile doğrulama',
          'HTF trend uyumu kontrolü'
        ]
      };
      const conf = calculateConfidence(baseSetup, trend, srLevels, candleData);
      baseSetup.confidence = conf.total;
      baseSetup.confidenceBreakdown = conf.breakdown;
      shortSetups.push(baseSetup);
    }

    // 2. Bearish FVG Setup
    const bearishFVGs = fvgs.filter(f => f.type === 'bearish');
    const nearbyBearishFVG = bearishFVGs.find(f =>
      currentPrice <= f.high && currentPrice >= f.low * 0.99
    );

    if (nearbyBearishFVG) {
      const baseSetup = {
        id: setupId++,
        name: 'FVG Fill Short',
        direction: 'short',
        technique: 'fvg',
        techniqueLabel: 'Fair Value Gap',
        color: '#dc2626',
        entry: [nearbyBearishFVG.low, nearbyBearishFVG.high],
        stop: nearbyBearishFVG.high * 1.015,
        targets: [
          { level: currentPrice * 0.985, rr: 1.5 },
          { level: currentPrice * 0.97, rr: 3.0 }
        ],
        referenceZones: [{
          type: 'fvg',
          high: nearbyBearishFVG.high,
          low: nearbyBearishFVG.low,
          startTime: nearbyBearishFVG.time,
          endTime: nearbyBearishFVG.endTime,
          color: 'rgba(220, 38, 38, 0.2)'
        }],
        swingPoints: [],
        reasons: [
          { type: 'positive', text: `Bearish FVG: ${nearbyBearishFVG.gapPercent.toFixed(2)}%` },
          { type: 'positive', text: 'Gap henüz doldurulmamış' }
        ],
        confirmations: [
          'Fiyat FVG\'nin %50-75 bölgesine ulaşmalı',
          'FVG içinde bearish rejection (shooting star)',
          'Volume spike ile doğrulama',
          'Önceki mumun body\'si FVG içinde kapanmalı'
        ]
      };
      const conf = calculateConfidence(baseSetup, trend, srLevels, candleData);
      baseSetup.confidence = conf.total;
      baseSetup.confidenceBreakdown = conf.breakdown;
      shortSetups.push(baseSetup);
    }

    // 3. Range Top Short
    if (activeRange && currentPrice > (activeRange.low + activeRange.high) / 2) {
      const baseSetup = {
        id: setupId++,
        name: 'Range Üst Short',
        direction: 'short',
        technique: 'range',
        techniqueLabel: 'Range Trading',
        color: '#a855f7',
        entry: [activeRange.high * 0.995, activeRange.high],
        stop: activeRange.high * 1.015,
        targets: [
          { level: (activeRange.low + activeRange.high) / 2, rr: 1.5 },
          { level: activeRange.low, rr: 3.0 }
        ],
        referenceZones: [{
          type: 'range',
          high: activeRange.high,
          low: activeRange.low,
          startTime: activeRange.startTime,
          endTime: lastCandle.time,
          color: 'rgba(168, 85, 247, 0.15)'
        }],
        swingPoints: [],
        reasons: [
          { type: 'positive', text: `Range: ${activeRange.bars} bar sürüyor` },
          { type: 'positive', text: 'Fiyat range üst bandında' }
        ],
        confirmations: [
          'Range üst sınırına net dokunma',
          'Sınırda rejection candle (bearish engulfing, shooting star)',
          'Volume azalması sonrası ani artış',
          'RSI overbought bölgesinden çıkış'
        ]
      };
      const conf = calculateConfidence(baseSetup, trend, srLevels, candleData);
      baseSetup.confidence = conf.total;
      baseSetup.confidenceBreakdown = conf.breakdown;
      shortSetups.push(baseSetup);
    }

    // 4. Bearish Liquidity Sweep
    const bearishSweep = sweeps.find(s => s.type === 'bearish');
    if (bearishSweep) {
      const baseSetup = {
        id: setupId++,
        name: 'Liquidity Sweep Short',
        direction: 'short',
        technique: 'liquidity_sweep',
        techniqueLabel: 'Likidite Avı',
        color: '#f43f5e',
        entry: [bearishSweep.sweepLevel * 0.995, bearishSweep.sweepLevel * 1.002],
        stop: bearishSweep.sweepLevel * 1.015,
        targets: [
          { level: currentPrice * 0.98, rr: 2.0 },
          { level: currentPrice * 0.96, rr: 4.0 }
        ],
        referenceZones: [],
        swingPoints: swings.highs.slice(-2).map(s => ({ ...s, type: 'high' })),
        reasons: [
          { type: 'positive', text: 'Equal highs sweep edildi' },
          { type: 'positive', text: 'Fiyat geri döndü - bear trap tamamlandı' }
        ],
        confirmations: [
          'Wick ile sweep gerçekleşmeli (üstünde kapatma)',
          'Sweep sonrası strong bearish candle',
          'Sweep mumunun tabanı kırılmalı',
          'Volume spike ile reversal doğrulama'
        ]
      };
      const conf = calculateConfidence(baseSetup, trend, srLevels, candleData);
      baseSetup.confidence = conf.total;
      baseSetup.confidenceBreakdown = conf.breakdown;
      shortSetups.push(baseSetup);
    }

    // 5. Bearish BOS Retest
    const bearishBOS = bosLevels.filter(b => b.type === 'bearish').slice(-1)[0];
    if (bearishBOS && currentPrice < bearishBOS.level && currentPrice > bearishBOS.level * 0.98) {
      const baseSetup = {
        id: setupId++,
        name: 'BOS Retest Short',
        direction: 'short',
        technique: 'bos',
        techniqueLabel: 'Break of Structure',
        color: '#b91c1c',
        entry: [bearishBOS.level * 0.992, bearishBOS.level * 1.002],
        stop: bearishBOS.level * 1.015,
        targets: [
          { level: currentPrice * 0.975, rr: 2.5 },
          { level: currentPrice * 0.955, rr: 4.5 }
        ],
        referenceZones: [],
        swingPoints: swings.lows.slice(-2).map(s => ({ ...s, type: 'low' })),
        reasons: [
          { type: 'positive', text: 'Bearish BOS oluştu' },
          { type: 'positive', text: 'Fiyat kırılan seviyeyi retest ediyor' }
        ],
        confirmations: [
          'Kırılan seviyeye geri dönüş (retest)',
          'Retest sırasında bearish rejection',
          'Önceki desteğin dirence dönüşmüş olmalı',
          'LTF\'de bearish structure oluşmalı'
        ]
      };
      const conf = calculateConfidence(baseSetup, trend, srLevels, candleData);
      baseSetup.confidence = conf.total;
      baseSetup.confidenceBreakdown = conf.breakdown;
      shortSetups.push(baseSetup);
    }

    // ============ NO SETUP EXPLANATIONS ============

    // Why no long setups?
    if (longSetups.length === 0) {
      if (trend === 'downtrend') {
        noLongReason.push('Piyasa güçlü downtrend içinde');
        noLongReason.push('Trend karşıtı long pozisyon riskli');
      }
      if (bullishOBs.length === 0) {
        noLongReason.push('Bullish Order Block bulunamadı');
      }
      if (bullishFVGs.length === 0) {
        noLongReason.push('Bullish FVG mevcut değil');
      }
      if (!bullishSweep) {
        noLongReason.push('Likidite sweep olmamış (equal lows)');
      }
      if (!activeRange || currentPrice > (activeRange?.low + activeRange?.high) / 2) {
        noLongReason.push('Range alt bandı yakınında değil');
      }
      if (noLongReason.length === 0) {
        noLongReason.push('Teknik seviyeler giriş için uygun değil');
        noLongReason.push('Daha net price action bekle');
      }
    }

    // Why no short setups?
    if (shortSetups.length === 0) {
      if (trend === 'uptrend') {
        noShortReason.push('Piyasa güçlü uptrend içinde');
        noShortReason.push('Trend karşıtı short pozisyon riskli');
      }
      if (bearishOBs.length === 0) {
        noShortReason.push('Bearish Order Block bulunamadı');
      }
      if (bearishFVGs.length === 0) {
        noShortReason.push('Bearish FVG mevcut değil');
      }
      if (!bearishSweep) {
        noShortReason.push('Likidite sweep olmamış (equal highs)');
      }
      if (!activeRange || currentPrice < (activeRange?.low + activeRange?.high) / 2) {
        noShortReason.push('Range üst bandı yakınında değil');
      }
      if (noShortReason.length === 0) {
        noShortReason.push('Teknik seviyeler giriş için uygun değil');
        noShortReason.push('Daha net price action bekle');
      }
    }

    // Sort by confidence and limit
    const sortedLong = longSetups.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
    const sortedShort = shortSetups.sort((a, b) => b.confidence - a.confidence).slice(0, 3);

    return {
      longSetups: sortedLong,
      shortSetups: sortedShort,
      noLongReason,
      noShortReason,
      trend,
      currentPrice
    };
  }, [candleData]);

  // Derived values - MUST be defined before useEffects that use them
  const calculatePosition = (setup) => {
    if (!setup || !setup.entry || setup.entry.length === 0) return null;

    const inv = parseFloat(investment) || 0;
    const risk = (inv * riskPercent) / 100;
    const entryPrice = (setup.entry[0] + setup.entry[1]) / 2;

    // For short positions, risk is calculated differently
    const riskPerCoin = setup.direction === 'short'
      ? setup.stop - entryPrice
      : entryPrice - setup.stop;

    if (riskPerCoin <= 0) return null;

    const positionSize = risk / riskPerCoin;
    const totalInvestment = positionSize * entryPrice;

    return {
      positionSize: positionSize.toFixed(6),
      totalInvestment: totalInvestment.toFixed(2),
      maxLoss: risk.toFixed(2),
      potentialGains: setup.targets ? setup.targets.map(t => {
        const gain = setup.direction === 'short'
          ? positionSize * (entryPrice - t.level)
          : positionSize * (t.level - entryPrice);
        return gain.toFixed(2);
      }) : []
    };
  };

  // Get all setups combined for selection
  const allSetups = [
    ...(generateSetups.longSetups || []),
    ...(generateSetups.shortSetups || [])
  ];

  // currentSetup with safe null checks - finds from combined list
  const currentSetup = allSetups.length > 0
    ? (selectedSetup !== null
      ? allSetups.find(s => s.id === selectedSetup)
      : allSetups[0])
    : null;
  const positionCalc = currentSetup ? calculatePosition(currentSetup) : null;

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isTyping) return;

    const currentMessage = chatInput;
    const userMsg = { role: 'user', text: currentMessage };

    // UI Update
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    try {
      // 1. Check AI Agent
      if (agentEngineRef.current) {
        console.log('📡 Sending to Gemini v1 via AgentEngine...', currentMessage);

        const result = await agentEngineRef.current.chatWithContext(
          currentMessage,
          scannerResults,
          chatMessages.slice(-5),
          candleData // Pass candle data for accurate price context
        );

        console.log('🤖 AI Response received:', result);
        console.log('🎨 Visual Markers:', result.visualMarkers);
        setChatMessages(prev => [...prev, { role: 'bot', text: result.text, model: result.model }]);

        // Render Visuals if present in Chat response
        if (result.visualMarkers && result.visualMarkers.length > 0) {
          console.log('🖌️ Rendering', result.visualMarkers.length, 'visual markers...');
          renderVisualMarkers(result.visualMarkers);
        } else if (result.visualMarkers && result.visualMarkers.length === 0) {
          // AI returned empty array - user likely asked to clear
          console.log('🧹 AI returned empty markers - clearing visuals');
          clearAiDrawings();
        }

      } else {
        // 2. Fallback to offline/rule-based
        console.warn('⚠️ AgentEngine not active. Using offline rules.');
        const response = await routeMessageToModel(currentMessage);
        setChatMessages(prev => [...prev, { role: 'bot', ...response }]);
      }
    } catch (err) {
      console.error('❌ Chat Error:', err);
      setChatMessages(prev => [...prev, { role: 'bot', text: 'Bağlantı hatası: ' + err.message }]);
    } finally {
      setIsTyping(false);
    }
  };


  const getChatResponse = (msg) => {
    const m = msg.toLowerCase();

    // === CONFIDENCE CALCULATION TERMS ===

    if (m.includes('güvenilirlik') || m.includes('confidence') || m.includes('nasıl hesaplan')) {
      return `📊 GÜVENİLİRLİK HESAPLAMA

Toplam skor 100 puan üzerinden hesaplanır:

1️⃣ TREND UYUMU (max 25 puan)
• Long + Uptrend = 25 puan
• Short + Downtrend = 25 puan
• Yatay piyasa = 15 puan
• Trend karşıtı = 5 puan

2️⃣ S/R GÜCÜ (max 20 puan)
• Her dokunuş = +5 puan
• Seviye test sayısı × 5

3️⃣ PATTERN KALİTESİ (max 20 puan)
• Order Block = 18 puan
• Liquidity Sweep = 17 puan
• FVG = 16 puan
• BOS = 15 puan
• Range = 14 puan

4️⃣ HACİM (max 15 puan)
• Ortalama üstü = 15 puan
• Normal = 10 puan
• Düşük = 5 puan

5️⃣ MTF CONFLUENCE (max 10 puan)
• Çoklu TF uyumu = 10 puan

6️⃣ TARİHSEL BAŞARI (max 10 puan)
• Benzer pattern win rate

Detay için: "trend uyumu nedir" veya "pattern nedir" sor.`;
    }

    if (m.includes('trend uyum') || m.includes('trend alignment')) {
      return `📈 TREND UYUMU (25 puan)

Setup yönünün ana trend ile uyumlu olup olmadığını ölçer.

HESAPLAMA:
• Long setup + Uptrend = 25 puan (en iyi)
• Short setup + Downtrend = 25 puan (en iyi)
• Yatay/Ranging piyasa = 15 puan (dikkatli)
• Trend karşıtı işlem = 5 puan (riskli)

NEDEN ÖNEMLİ:
"Trend is your friend" - Trend yönünde işlem yapmak başarı oranını %20-30 artırır.

ÖRNEK:
BTC uptrend'de → Long setup alırsan +25 puan
BTC uptrend'de → Short setup alırsan +5 puan (dikkat!)`;
    }

    if (m.includes('s/r') || m.includes('sr güc') || m.includes('destek direnç güc')) {
      return `🎯 S/R GÜCÜ (20 puan)

Destek/Direnç seviyesinin ne kadar güçlü olduğunu ölçer.

HESAPLAMA:
• Her seviye dokunuşu = +5 puan
• Maximum 20 puan

GÜÇLÜ SEVİYE BELİRTİLERİ:
✓ 3+ kez test edilmiş
✓ Güçlü rejection (uzun fitil)
✓ Hacimli tepki
✓ Çoklu timeframe'de görünür

ZAYIF SEVİYE:
✗ 1 kez test edilmiş
✗ Kırılıp geri dönmüş
✗ Düşük hacimli tepki`;
    }

    if (m.includes('pattern') || m.includes('kalite')) {
      return `🔷 PATTERN KALİTESİ (20 puan)

Her pattern tipinin güvenilirlik puanı:

📦 ORDER BLOCK = 18 puan
Büyük oyuncuların giriş yaptığı seviye. En güvenilir.

⚡ LIQUIDITY SWEEP = 17 puan  
Stop avı sonrası reversal. Profesyonel tuzak.

📐 FAIR VALUE GAP = 16 puan
Fiyat dengesizliği. Doldurulma eğiliminde.

🔀 BREAK OF STRUCTURE = 15 puan
Trend değişim sinyali.

📊 RANGE TRADING = 14 puan
Yatay piyasa üst/alt band işlemi.

Detay için: "order block nedir" veya "fvg nedir" sor.`;
    }

    if (m.includes('hacim') || m.includes('volume')) {
      return `📊 HACİM DOĞRULAMASI (15 puan)

Hacim, fiyat hareketinin gücünü doğrular.

HESAPLAMA:
• Hacim > Ortalama × 1.5 = 15 puan ✅
• Hacim > Ortalama = 10 puan
• Hacim < Ortalama = 5 puan ⚠️

YÜKSEK HACİM + PATTERN = GÜÇLÜ SİNYAL
• Kırılım hacimle desteklenmeli
• Rejection hacimle olmalı
• Düşük hacimli hareketlere güvenme

ÖRNEK:
Order block'ta fiyat tepki verdi:
• Yüksek hacimle → Güçlü sınyal (+15)
• Düşük hacimle → Zayıf sinyal (+5)`;
    }

    if (m.includes('mtf') || m.includes('multi time') || m.includes('çoklu zaman')) {
      return `🔄 MTF CONFLUENCE (10 puan)

Multi-Timeframe (Çoklu Zaman Dilimi) analizi.

KONSEPT:
Aynı seviye birden fazla timeframe'de görünüyorsa daha güçlüdür.

ÖRNEK:
4H'de destek + 1H'de destek + 15M'de destek
= 3 TF confluence = Çok güçlü seviye

HESAPLAMA:
• Şu an tek TF analizi yapılıyor = 7 puan
• Çoklu TF uyumu = 10 puan

ÖNERİ:
Büyük TF'den küçüğe bak:
1D → 4H → 1H → Giriş sinyali`;
    }

    if (m.includes('tarihs') || m.includes('historical') || m.includes('win rate')) {
      return `📈 TARİHSEL BAŞARI ORANI (10 puan)

Benzer pattern'lerin geçmiş performansı.

DEĞERLENDİRME:
• Win rate %70+ = 10 puan
• Win rate %60-70 = 7 puan  
• Win rate %50-60 = 5 puan
• Win rate <50 = 3 puan

ŞU AN:
Ortalama değer kullanılıyor = 7 puan
(Benzer setuplar ~%65 başarılı)

NOT:
Gerçek backtest verisi olmadan tarihsel oran tahminidir.`;
    }

    // === TRADING TECHNIQUES ===

    if (m.includes('order block') || m.includes('ob nedir') || m.includes('order blok')) {
      return `📦 ORDER BLOCK (OB)

Büyük oyuncuların (bankalar, hedge fund'lar) pozisyon açtığı son mum.

BULLISH ORDER BLOCK:
• Güçlü yükseliş öncesi son KIRMIZI mum
• Fiyat buraya döndüğünde alıcılar girer
• LONG giriş bölgesi

BEARISH ORDER BLOCK:
• Güçlü düşüş öncesi son YEŞİL mum
• Fiyat buraya döndüğünde satıcılar girer
• SHORT giriş bölgesi

TESPİT:
1. Güçlü impulsif hareket bul (min %1.5)
2. Hareket öncesi ters renkli mumu işaretle
3. O mumun high-low arası = OB zone

GRAFİKTE: 🟦 Mavi/Yeşil kutu olarak gösterilir`;
    }

    if (m.includes('fvg') || m.includes('fair value') || m.includes('imbalance')) {
      return `📐 FAIR VALUE GAP (FVG)

3 mum arasındaki fiyat boşluğu. "Imbalance" da denir.

BULLISH FVG:
• Mum 1'in HIGH'ı < Mum 3'ün LOW'u
• Arada boşluk var = FVG
• Fiyat bu boşluğu doldurmaya çalışır
• LONG giriş fırsatı

BEARISH FVG:
• Mum 1'in LOW'u > Mum 3'ün HIGH'ı
• Yukarıda boşluk = FVG
• Fiyat yukaru doldurur
• SHORT giriş fırsatı

NEDEN OLUŞUR:
Ani talep/arz dengesizliği. Piyasa "dengeye" dönmeye çalışır.

GRAFİKTE: 🟧 Turuncu kutu olarak gösterilir`;
    }

    if (m.includes('range') || m.includes('konsolidasy') || m.includes('yatay piyasa')) {
      return `📊 RANGE TRADING

Fiyatın belirli bir bant içinde yatay hareket etmesi.

TESPİT:
• Min 8 bar aynı aralıkta
• High-Low farkı < %3
• Üst ve alt bandda tepkiler

STRATEJİ:
🟢 LONG: Alt bantta al → Orta/Üst bantta sat
🔴 SHORT: Üst bantta sat → Orta/Alt bantta kapat

RİSK:
• Breakout olabilir! Stop'u bandın dışına koy
• Hacimli kırılım = Range bitti

GRAFİKTE: 🟪 Mor kutu olarak gösterilir (üst-alt band)`;
    }

    if (m.includes('bos') || m.includes('break of structure') || m.includes('yapı kırılım')) {
      return `🔀 BREAK OF STRUCTURE (BOS)

Trend yapısının kırılması = Potansiyel trend değişimi.

BULLISH BOS:
• Fiyat önceki swing HIGH'ı kırar
• Higher high oluşur
• Uptrend başlangıcı olabilir

BEARISH BOS:
• Fiyat önceki swing LOW'u kırar  
• Lower low oluşur
• Downtrend başlangıcı olabilir

STRATEJİ (RETEST):
1. BOS oluştuktan sonra bekle
2. Fiyat kırılan seviyeye geri döner (retest)
3. Retest'te giriş yap
4. Stop: BOS seviyesinin diğer tarafı

GRAFİKTE: Kırılan seviye çizgi olarak gösterilir`;
    }

    if (m.includes('liquidity') || m.includes('sweep') || m.includes('likidite') || m.includes('stop av')) {
      return `⚡ LIQUIDITY SWEEP (LİKİDİTE AVI)

Büyük oyuncuların retail trader'ların stop'larını avlaması.

MEKANIZMA:
1. Eşit high'lar/low'lar oluşur (stop birikimi)
2. Fiyat bu seviyeleri SWEEP eder (kısa süre geçer)
3. Hızlıca geri döner (trap)
4. Gerçek hareket başlar

BULLISH SWEEP:
• Equal lows sweep edilir
• Fiyat aşağı gider, stop'lar patlar
• Sonra keskin yukarı döner
• = LONG fırsatı 🟢

BEARISH SWEEP:
• Equal highs sweep edilir
• Fiyat yukarı çıkar, stop'lar patlar
• Sonra keskin aşağı döner  
• = SHORT fırsatı 🔴

GRAFİKTE: Sweep edilen seviye + geri dönüş noktası işaretlenir`;
    }

    // === EXISTING RESPONSES ===

    if (m.includes('price action')) {
      return 'Price action, fiyat hareketlerinin kendisini analiz etme yöntemidir. İndikatör kullanmadan sadece mum formasyonları, destek/direnç seviyeleri ve trend yapıları ile işlem yapar.';
    }

    if (m.includes('support') || m.includes('destek')) {
      return 'Support (Destek): Fiyatın düşüşte durduğu seviye. Alıcılar burada devreye girer. Previous swing lows ve multiple touches ile bulunur.';
    }

    if (m.includes('resistance') || m.includes('direnç')) {
      return 'Resistance (Direnç): Fiyatın yükselişte durduğu seviye. Satıcılar burada devreye girer. Previous swing highs ile bulunur.';
    }

    if (m.includes('r:r') || m.includes('risk reward')) {
      return 'Risk/Reward Ratio: Potansiyel kazancın riske oranı.\n\nFormül: (TP - Entry) / (Entry - SL)\n\nMinimum 1:2 olmalı. Profesyoneller 1:3+ arar.';
    }

    if (m.includes('stop loss')) {
      return 'Stop Loss: Setup\'ın geçersiz olduğu seviye.\n\nDestek için: Swing low\'un ALTINDA\nDirenç için: Swing high\'ın ÜSTÜNDE\n\nAsla rastgele yüzdelere değil, yapısal seviyelere koy.';
    }

    if (m.includes('uptrend')) {
      return 'Uptrend: Higher Highs (HH) ve Higher Lows (HL) yapısı. Her tepe ve dip öncekinden yüksek. Strateji: "Buy the dip"';
    }

    if (m.includes('downtrend')) {
      return 'Downtrend: Lower Highs (LH) ve Lower Lows (LL) yapısı. Her tepe ve dip öncekinden düşük. Strateji: "Sell the rally"';
    }

    if (m.includes('pin bar')) {
      return 'Pin Bar: Uzun fitil, küçük gövde.\n\nBullish: Uzun alt fitil, destek seviyesinde\nBearish: Uzun üst fitil, direnç seviyesinde\n\nGüçlü rejection sinyalidir.';
    }

    if (m.includes('engulfing')) {
      return 'Engulfing: Bir mum önceki mumu tamamen yutar.\n\nBullish Engulfing: Yeşil mum kırmızı mumu yutar\nBearish Engulfing: Kırmızı mum yeşil mumu yutar\n\n%80+ doğruluk oranı.';
    }

    return `Bu konuda bilgim yok. Şunları sorabilirsiniz:

📊 GÜVENİLİRLİK:
• "Güvenilirlik nasıl hesaplanıyor?"
• "Trend uyumu nedir?"
• "S/R gücü nedir?"
• "Pattern kalitesi nedir?"
• "Hacim ne işe yarar?"
• "MTF nedir?"

📈 TEKNİKLER:
• "Order block nedir?"
• "FVG nedir?"
• "Range trading nedir?"
• "BOS nedir?"
• "Liquidity sweep nedir?"

📉 TEMEL:
• "Price action nedir?"
• "R:R ratio nedir?"
• "Stop loss nereye konur?"`;
  };

  const fetchCandleData = async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);

    try {
      const intervals = { '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1d' };
      // Extended range based on user selection
      const limits = {
        short: { '15m': 100, '1h': 100, '4h': 100, '1d': 60 },
        medium: { '15m': 300, '1h': 300, '4h': 200, '1d': 180 },
        long: { '15m': 1000, '1h': 1000, '4h': 500, '1d': 365 }
      };
      const limit = limits[dataRange][timeframe];

      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${intervals[timeframe]}&limit=${limit}`
      );

      if (!response.ok) throw new Error('Binance API error');

      const data = await response.json();
      const formatted = data.map(candle => ({
        time: Math.floor(candle[0] / 1000), // Unix timestamp in seconds for lightweight-charts
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }));

      setCandleData(formatted);
      setLastUpdate(new Date());

    } catch (err) {
      setError('Veri çekilemedi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current || candleData.length === 0) return;

    // Remove existing chart
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (e) {
        console.warn('Chart removal failed:', e);
      }
      chartRef.current = null;
    }

    try {
      // Create new chart
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#1f2937' },
          textColor: '#9ca3af',
        },
        grid: {
          vertLines: { color: '#374151' },
          horzLines: { color: '#374151' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
        rightPriceScale: {
          borderColor: '#374151',
        },
        timeScale: {
          borderColor: '#374151',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: { vertTouchDrag: true },
        handleScale: { axisPressedMouseMove: true },
      });

      // Create candlestick series - v5 API uses addSeries with type
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#10b981',
        wickDownColor: '#ef4444',
        wickUpColor: '#10b981',
      });

      candlestickSeries.setData(candleData);
      candlestickSeriesRef.current = candlestickSeries;
      chartRef.current = chart;

      // Add user drawn lines
      if (drawnLines && drawnLines.length > 0) {
        drawnLines.forEach(line => {
          candlestickSeries.createPriceLine({
            price: line.price,
            color: line.color,
            lineWidth: 2,
            lineStyle: 0,
            axisLabelVisible: true,
            title: line.title,
          });
        });
      }

      // Add setup lines if available (with null checks)
      if (currentSetup && currentSetup.entry && Array.isArray(currentSetup.entry) && currentSetup.entry.length >= 2) {
        // Entry zone
        candlestickSeries.createPriceLine({
          price: currentSetup.entry[0],
          color: currentSetup.color || '#3b82f6',
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: 'Entry Low',
        });
        candlestickSeries.createPriceLine({
          price: currentSetup.entry[1],
          color: currentSetup.color || '#3b82f6',
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: 'Entry High',
        });
        // Stop loss
        if (currentSetup.stop) {
          candlestickSeries.createPriceLine({
            price: currentSetup.stop,
            color: '#ef4444',
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'Stop Loss',
          });
        }
        // Targets
        if (currentSetup.targets && Array.isArray(currentSetup.targets)) {
          currentSetup.targets.forEach((t, i) => {
            candlestickSeries.createPriceLine({
              price: t.level,
              color: '#10b981',
              lineWidth: 1,
              lineStyle: 2,
              axisLabelVisible: true,
              title: `TP${i + 1}`,
            });
          });
        }
      }

      // Add diagonal trend lines using primitives
      trendLinePrimitivesRef.current = [];
      if (trendLines && trendLines.length > 0) {
        trendLines.forEach(line => {
          const primitive = new TrendLinePrimitive(line.p1, line.p2, {
            lineColor: line.color || '#8b5cf6',
            lineWidth: 2,
            lineStyle: 'solid'
          });
          candlestickSeries.attachPrimitive(primitive);
          trendLinePrimitivesRef.current.push(primitive);
        });
      }

      // Add reference zones (Order Blocks, FVGs, Ranges) for selected setup
      zonePrimitivesRef.current = [];
      if (currentSetup && currentSetup.referenceZones && currentSetup.referenceZones.length > 0) {
        currentSetup.referenceZones.forEach(zone => {
          const primitive = new RectanglePrimitive(zone, {
            fillColor: zone.color || 'rgba(59, 130, 246, 0.2)',
            borderColor: zone.color?.replace('0.2)', '0.8)') || 'rgba(59, 130, 246, 0.8)',
            borderWidth: 1
          });
          candlestickSeries.attachPrimitive(primitive);
          zonePrimitivesRef.current.push(primitive);
        });
      }

      // Fit content
      chart.timeScale().fitContent();

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
          });
        }
      };

      window.addEventListener('resize', handleResize);
      handleResize();

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          try {
            chartRef.current.remove();
          } catch (e) {
            console.warn('Chart cleanup failed:', e);
          }
          chartRef.current = null;
        }
      };
    } catch (error) {
      console.error('Chart initialization failed:', error);
    }
  }, [candleData, currentSetup, drawnLines, trendLines]);

  // Handle Chart Clicks for Drawing (both horizontal and diagonal)
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current) return;

    const handleChartClick = (param) => {
      if (!drawingMode || !param.point || !param.time || !param.seriesData.size) return;

      const price = candlestickSeriesRef.current.coordinateToPrice(param.point.y);
      if (price === null) return;

      if (drawingMode === 'horizontal') {
        // Single-click horizontal line
        const newLine = {
          id: Date.now(),
          price: parseFloat(price.toFixed(2)),
          color: '#f59e0b',
          title: 'H-Line',
        };
        setDrawnLines(prev => [...prev, newLine]);
        setDrawingMode(null);
      } else if (drawingMode === 'diagonal') {
        // Two-click diagonal line
        if (!firstPoint) {
          // First click - store the starting point
          setFirstPoint({
            time: param.time,
            price: parseFloat(price.toFixed(2))
          });
        } else {
          // Second click - create the trend line
          const newTrendLine = {
            id: Date.now(),
            p1: firstPoint,
            p2: {
              time: param.time,
              price: parseFloat(price.toFixed(2))
            },
            color: '#8b5cf6', // Purple for trend lines
          };
          setTrendLines(prev => [...prev, newTrendLine]);
          setFirstPoint(null);
          setDrawingMode(null);
        }
      }
    };

    chartRef.current.subscribeClick(handleChartClick);

    return () => {
      if (chartRef.current) {
        chartRef.current.unsubscribeClick(handleChartClick);
      }
    };
  }, [drawingMode, firstPoint]);

  // Re-add user drawn lines when chart is recreated or lines change
  useEffect(() => {
    if (!candlestickSeriesRef.current) return;

    // Clear existing user lines? 
    // lightweight-charts doesn't have "clearPriceLines", but re-creating chart clears them.
    // If we only add them when chart is created (main useEffect), we are good.
    // BUT, main useEffect depends on [candleData, currentSetup].
    // If we add a line, we update drawnLines state, which should trigger a re-render/re-add?
    // The main useEffect does NOT depend on drawnLines currently.
    // Let's add drawnLines to main useEffect dependency or handle it separately.

    // Actually, creating lines is imperative. 
    // Use a separate effect to sync lines would be better to avoid re-creating the whole chart?
    // BUT, `createPriceLine` returns an object we can remove later. 
    // For simplicity: The main useEffect destroys chart. So we just need to ensure lines are added there.
    // I added `drawnLines` to the dependency array of the main useEffect above.

    // Wait, if I add `drawnLines` to main useEffect, the whole chart flickers on every line add?
    // That's not ideal.
    // Better: Helper function to add lines.
  }, [drawnLines]);

  // Sync refs with state (for drag handlers to access latest values)
  useEffect(() => {
    drawnLinesRef.current = drawnLines;
    trendLinesRef.current = trendLines;
  }, [drawnLines, trendLines]);

  // Sync trades to localStorage
  useEffect(() => {
    localStorage.setItem('trades', JSON.stringify(trades));
  }, [trades]);

  // Persist watchlist to localStorage
  useEffect(() => {
    localStorage.setItem('scannerWatchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  // Scanner loop effect
  useEffect(() => {
    if (!isScannerActive || watchlist.length === 0) {
      // Abort any pending scan when disabled
      scannerEngineRef.current?.abort();
      return;
    }

    let isMounted = true;

    const runScan = async () => {
      console.log('🔍 Starting scanner with', watchlist.length, 'pairs');

      const engine = new ScannerEngine({
        watchlist,
        delayMs: 150,
        timeframe: timeframe,
        limit: 200,
        onProgress: (progress) => {
          if (isMounted) {
            // Update results incrementally as they come in
            setScannerResults(prev => ({
              ...prev,
              [progress.symbol]: progress.result
            }));
          }
        }
      });

      scannerEngineRef.current = engine;

      try {
        const results = await engine.scan();
        if (isMounted) {
          setScannerResults(results);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Scanner error:', err);
        }
      }
    };

    // Initial scan
    runScan();

    // Rescan every 60 seconds
    const intervalId = setInterval(() => {
      if (isScannerActive && isMounted) {
        runScan();
      }
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      scannerEngineRef.current?.abort();
    };
  }, [isScannerActive, watchlist, timeframe]);

  // V3 Signal Engine Analysis
  useEffect(() => {
    if (!candleData || candleData.length < 20) return;

    try {
      // Run V3 analysis
      const analysis = analyzeV3(candleData);
      setV3Analysis(analysis);

      // Update signal memory
      signalMemoryRef.current.update(candleData);

      // Run condition checks if setup is selected
      if (currentSetup && currentSetup.confirmations) {
        const tracker = new ConditionTracker(currentSetup);
        const currentPrice = candleData[candleData.length - 1]?.close;
        const results = tracker.checkAll({
          candles: candleData,
          currentPrice,
          trend: analysis.trend
        });
        setConditionResults(results);

        // Alert if all conditions met
        if (tracker.shouldAlert() && Notification.permission === 'granted') {
          new Notification('🎯 Tüm Koşullar Sağlandı!', {
            body: `${symbol} - ${currentSetup.name}`,
            tag: `setup-${currentSetup.id}`
          });
        }
      }
    } catch (error) {
      console.warn('V3 Analysis error:', error);
    }
  }, [candleData, currentSetup, symbol]);

  // 🐞 Visual Debug Mode - Render Entry/SL markers for sanity checking
  useEffect(() => {
    if (!candlestickSeriesRef.current || !candleData || candleData.length === 0) return;

    // Clear existing markers when debug mode is off
    if (!showDebug) {
      try {
        if (typeof candlestickSeriesRef.current?.setMarkers === 'function') {
          candlestickSeriesRef.current.setMarkers([]);
        }
      } catch (err) {
        console.warn('Failed to clear markers:', err);
      }
      return;
    }

    // Get current setups from the generateSetups useMemo (we need to access it)
    // For now, use the last few candles as demo entry/stop points
    // In production, this would iterate through actual setups

    const markers = [];
    const lastCandle = candleData[candleData.length - 1];
    const lastIndex = candleData.length - 1;

    // Find the current setup if one is selected
    if (currentSetup) {
      // Entry marker
      if (currentSetup.entry && currentSetup.entry.length >= 2) {
        const entryPrice = (currentSetup.entry[0] + currentSetup.entry[1]) / 2;

        // Find candle closest to entry price in recent history
        let entryIndex = lastIndex;
        for (let i = lastIndex; i >= Math.max(0, lastIndex - 50); i--) {
          const candle = candleData[i];
          if (candle.low <= entryPrice && candle.high >= entryPrice) {
            entryIndex = i;
            break;
          }
        }

        markers.push({
          time: candleData[entryIndex].time,
          position: currentSetup.direction === 'long' ? 'belowBar' : 'aboveBar',
          color: '#FFFF00', // Bright Yellow
          shape: currentSetup.direction === 'long' ? 'arrowUp' : 'arrowDown',
          text: `ENTRY $${entryPrice.toFixed(0)}`
        });

        // Entry zone high marker
        markers.push({
          time: candleData[entryIndex].time,
          position: 'aboveBar',
          color: '#00FF00', // Bright Green
          shape: 'circle',
          text: `Zone H: $${currentSetup.entry[1].toFixed(0)}`
        });

        // Entry zone low marker  
        markers.push({
          time: candleData[entryIndex].time,
          position: 'belowBar',
          color: '#00FF00',
          shape: 'circle',
          text: `Zone L: $${currentSetup.entry[0].toFixed(0)}`
        });
      }

      // Stop Loss marker
      if (currentSetup.stop) {
        markers.push({
          time: lastCandle.time,
          position: currentSetup.direction === 'long' ? 'belowBar' : 'aboveBar',
          color: '#FF00FF', // Fuchsia
          shape: 'circle',
          text: `SL $${currentSetup.stop.toFixed(0)}`
        });
      }

      // Take Profit markers
      if (currentSetup.targets && currentSetup.targets.length > 0) {
        currentSetup.targets.forEach((tp, i) => {
          markers.push({
            time: lastCandle.time,
            position: currentSetup.direction === 'long' ? 'aboveBar' : 'belowBar',
            color: '#00FFFF', // Cyan
            shape: 'circle',
            text: `TP${i + 1} $${tp.level.toFixed(0)}`
          });
        });
      }
    }

    // Debug: Show swing points from V3 analysis
    if (v3Analysis?.swingPoints) {
      // Last 5 swing highs
      v3Analysis.swingPoints.highs?.slice(-5).forEach(sh => {
        if (candleData[sh.index]) {
          markers.push({
            time: candleData[sh.index].time,
            position: 'aboveBar',
            color: '#FF6B6B', // Light Red
            shape: 'circle',
            text: 'SH'
          });
        }
      });

      // Last 5 swing lows
      v3Analysis.swingPoints.lows?.slice(-5).forEach(sl => {
        if (candleData[sl.index]) {
          markers.push({
            time: candleData[sl.index].time,
            position: 'belowBar',
            color: '#4ECDC4', // Teal
            shape: 'circle',
            text: 'SL'
          });
        }
      });
    }

    console.log('🐞 Debug markers rendered:', markers.length);
    try {
      if (typeof candlestickSeriesRef.current?.setMarkers === 'function') {
        candlestickSeriesRef.current.setMarkers(markers);
      }
    } catch (err) {
      console.warn('Failed to set markers:', err);
    }

  }, [showDebug, candleData, currentSetup, v3Analysis]);

  // Click-to-zoom handler for conditions - Universal Visual Protocol
  // MENTOR-STYLE: Zooms and shows educational visuals for BOTH Long AND Short
  const handleConditionClick = useCallback((condition) => {
    if (!chartRef.current || !candlestickSeriesRef.current || !candleData) return;

    console.log('🎯 Condition clicked:', condition.text, condition.visualMeta);
    setSelectedCondition(condition);

    // Clear previous visuals
    if (highlightPrimitiveRef.current) {
      try {
        if (Array.isArray(highlightPrimitiveRef.current)) {
          highlightPrimitiveRef.current.forEach(p => {
            try { candlestickSeriesRef.current.detachPrimitive(p); } catch (e) { }
          });
        } else {
          candlestickSeriesRef.current.detachPrimitive(highlightPrimitiveRef.current);
        }
      } catch (e) { }
      highlightPrimitiveRef.current = null;
    }

    // EXPLICIT ZOOM using focusIndex from visualMeta
    const focusIndex = condition.visualMeta?.focusIndex || candleData.length - 1;
    const timeScale = chartRef.current.timeScale();

    // Calculate visible range: center on focusIndex with 30 bars around
    const fromIndex = Math.max(0, focusIndex - 25);
    const toIndex = Math.min(candleData.length - 1, focusIndex + 10);

    // Set visible logical range (explicit zoom)
    try {
      timeScale.setVisibleLogicalRange({
        from: fromIndex,
        to: toIndex
      });
      console.log('📍 Zoomed to range:', fromIndex, '-', toIndex);
    } catch (e) {
      console.warn('Zoom failed:', e);
    }

    // Render Universal Visual Protocol elements
    if (condition.visualMeta?.elements) {
      const renderer = new UniversalVisualRenderer(candleData, condition.visualMeta, {
        showTooltip: true,
        animatePulsing: true
      });

      candlestickSeriesRef.current.attachPrimitive(renderer);
      highlightPrimitiveRef.current = renderer;
    } else {
      // Fallback to legacy NeonHighlight if no visualMeta
      const focusCandle = candleData[focusIndex];
      if (focusCandle) {
        const highlight = new NeonHighlightPrimitive(
          focusCandle.time,
          condition.visualMeta?.focusPrice || focusCandle.close,
          {
            color: getStatusColor(condition.status),
            text: condition.result?.message || condition.text,
            size: 40
          }
        );

        candlestickSeriesRef.current.attachPrimitive(highlight);
        highlightPrimitiveRef.current = highlight;
      }
    }
  }, [candleData]);

  // Open a new trade
  const openTrade = () => {
    if (!newTrade.entryPrice || !newTrade.size) return;

    const trade = {
      id: Date.now(),
      pair: newTrade.pair || symbol || 'UNKNOWN',
      direction: newTrade.direction,
      entryPrice: parseFloat(newTrade.entryPrice),
      stopLoss: newTrade.stopLoss ? parseFloat(newTrade.stopLoss) : null,
      takeProfit: newTrade.takeProfit ? parseFloat(newTrade.takeProfit) : null,
      size: parseFloat(newTrade.size),
      notes: newTrade.notes,
      openTime: new Date().toISOString(),
      status: 'open',
      closeTime: null,
      closePrice: null,
      pnl: null
    };

    setTrades(prev => [...prev, trade]);
    setNewTrade({ pair: '', direction: 'long', entryPrice: '', stopLoss: '', takeProfit: '', size: '', notes: '' });
    setShowTradeModal(false);
  };

  // Close a trade
  const closeTrade = (tradeId, closePrice) => {
    setTrades(prev => prev.map(t => {
      if (t.id !== tradeId) return t;

      const priceDiff = closePrice - t.entryPrice;
      const pnlPercent = t.direction === 'long'
        ? (priceDiff / t.entryPrice) * 100
        : (-priceDiff / t.entryPrice) * 100;
      const pnl = (pnlPercent / 100) * t.size;

      return {
        ...t,
        status: 'closed',
        closeTime: new Date().toISOString(),
        closePrice: closePrice,
        pnl: pnl
      };
    }));
  };

  // Trade statistics
  const tradeStats = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'closed');
    const wins = closedTrades.filter(t => t.pnl > 0);
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    const avgRR = closedTrades.length > 0
      ? closedTrades.reduce((sum, t) => {
        if (!t.stopLoss || !t.takeProfit) return sum;
        const risk = Math.abs(t.entryPrice - t.stopLoss);
        const reward = Math.abs(t.takeProfit - t.entryPrice);
        return sum + (reward / risk);
      }, 0) / closedTrades.length
      : 0;

    return {
      total: trades.length,
      open: trades.filter(t => t.status === 'open').length,
      closed: closedTrades.length,
      wins: wins.length,
      winRate: closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0,
      totalPnl: totalPnl,
      avgRR: avgRR
    };
  }, [trades]);

  // Drag and Drop for Lines (horizontal and trend)
  useEffect(() => {
    if (!chartContainerRef.current || !chartRef.current || !candlestickSeriesRef.current) return;

    const container = chartContainerRef.current;
    const DRAG_THRESHOLD = 15; // pixels

    // Format price to 2 decimal places
    const formatPrice = (price) => parseFloat(price.toFixed(2));

    // Calculate distance from point to line segment
    const distanceToLineSegment = (px, py, x1, y1, x2, y2) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lengthSq = dx * dx + dy * dy;

      if (lengthSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);

      let t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
      const projX = x1 + t * dx;
      const projY = y1 + t * dy;

      return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
    };

    const handleMouseDown = (e) => {
      if (drawingMode) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const series = candlestickSeriesRef.current;
      const chart = chartRef.current;

      const currentTrendLines = trendLinesRef.current;
      const currentDrawnLines = drawnLinesRef.current;

      // Check trend line endpoints first
      for (const line of currentTrendLines) {
        const p1X = chart.timeScale().timeToCoordinate(line.p1.time);
        const p1Y = series.priceToCoordinate(line.p1.price);
        const p2X = chart.timeScale().timeToCoordinate(line.p2.time);
        const p2Y = series.priceToCoordinate(line.p2.price);

        if (p1X !== null && p1Y !== null) {
          if (Math.sqrt((x - p1X) ** 2 + (y - p1Y) ** 2) < DRAG_THRESHOLD) {
            draggingLineRef.current = { id: line.id, type: 'trend', endpoint: 'p1' };
            setIsDragging(true);
            container.style.cursor = 'move';
            chart.applyOptions({ handleScroll: false, handleScale: false });
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }

        if (p2X !== null && p2Y !== null) {
          if (Math.sqrt((x - p2X) ** 2 + (y - p2Y) ** 2) < DRAG_THRESHOLD) {
            draggingLineRef.current = { id: line.id, type: 'trend', endpoint: 'p2' };
            setIsDragging(true);
            container.style.cursor = 'move';
            chart.applyOptions({ handleScroll: false, handleScale: false });
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
      }

      // Check trend line body (middle drag)
      for (const line of currentTrendLines) {
        const p1X = chart.timeScale().timeToCoordinate(line.p1.time);
        const p1Y = series.priceToCoordinate(line.p1.price);
        const p2X = chart.timeScale().timeToCoordinate(line.p2.time);
        const p2Y = series.priceToCoordinate(line.p2.price);

        if (p1X !== null && p1Y !== null && p2X !== null && p2Y !== null) {
          if (distanceToLineSegment(x, y, p1X, p1Y, p2X, p2Y) < DRAG_THRESHOLD) {
            const currentTime = chart.timeScale().coordinateToTime(x);
            const currentPrice = series.coordinateToPrice(y);
            draggingLineRef.current = {
              id: line.id,
              type: 'trend',
              endpoint: 'body',
              startTime: currentTime,
              startPrice: currentPrice,
              originalP1: { ...line.p1 },
              originalP2: { ...line.p2 }
            };
            setIsDragging(true);
            container.style.cursor = 'move';
            chart.applyOptions({ handleScroll: false, handleScale: false });
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
      }

      // Check horizontal lines
      for (const line of currentDrawnLines) {
        const lineY = series.priceToCoordinate(line.price);
        if (lineY !== null && Math.abs(y - lineY) < DRAG_THRESHOLD) {
          draggingLineRef.current = { id: line.id, type: 'horizontal', originalPrice: line.price };
          dragStartYRef.current = y;
          setIsDragging(true);
          container.style.cursor = 'ns-resize';
          chart.applyOptions({ handleScroll: false, handleScale: false });
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
    };

    const handleMouseMove = (e) => {
      if (!draggingLineRef.current) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const series = candlestickSeriesRef.current;
      const chart = chartRef.current;
      const newPrice = series.coordinateToPrice(y);
      const newTime = chart.timeScale().coordinateToTime(x);

      if (draggingLineRef.current.type === 'horizontal' && newPrice !== null) {
        setDrawnLines(prev => {
          if (!Array.isArray(prev)) return [];
          if (!draggingLineRef.current) return prev;
          const targetId = draggingLineRef.current.id;
          return prev
            .filter(line => line && typeof line === 'object')
            .map(line => line.id === targetId ? { ...line, price: formatPrice(newPrice) } : line)
            .filter(line => line && typeof line === 'object');
        });
      } else if (draggingLineRef.current.type === 'trend' && newPrice !== null && newTime !== null) {
        const { endpoint } = draggingLineRef.current;

        if (endpoint === 'body') {
          const deltaTime = newTime - draggingLineRef.current.startTime;
          const deltaPrice = newPrice - draggingLineRef.current.startPrice;

          setTrendLines(prev => {
            if (!Array.isArray(prev)) return [];
            if (!draggingLineRef.current) return prev;
            const targetId = draggingLineRef.current.id;
            const { originalP1, originalP2 } = draggingLineRef.current;
            return prev
              .filter(line => line && typeof line === 'object')
              .map(line => line.id === targetId ? {
                ...line,
                p1: { time: originalP1.time + deltaTime, price: formatPrice(originalP1.price + deltaPrice) },
                p2: { time: originalP2.time + deltaTime, price: formatPrice(originalP2.price + deltaPrice) }
              } : line)
              .filter(line => line && typeof line === 'object');
          });
        } else {
          setTrendLines(prev => {
            if (!Array.isArray(prev)) return [];
            if (!draggingLineRef.current) return prev;
            const targetId = draggingLineRef.current.id;
            return prev
              .filter(line => line && typeof line === 'object')
              .map(line => line.id === targetId ? {
                ...line,
                [endpoint]: { time: newTime, price: formatPrice(newPrice) }
              } : line)
              .filter(line => line && typeof line === 'object');
          });
        }
      }
    };

    const handleMouseUp = () => {
      if (draggingLineRef.current) {
        draggingLineRef.current = null;
        dragStartYRef.current = null;
        setIsDragging(false);
        container.style.cursor = '';
        if (chartRef.current) {
          chartRef.current.applyOptions({
            handleScroll: { vertTouchDrag: true },
            handleScale: { axisPressedMouseMove: true }
          });
        }
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [drawingMode]);

  // Fetch available symbols from Binance
  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const [exchangeRes, tickerRes] = await Promise.all([
          fetch('https://api.binance.com/api/v3/exchangeInfo'),
          fetch('https://api.binance.com/api/v3/ticker/24hr')
        ]);
        const exchangeData = await exchangeRes.json();
        const tickerData = await tickerRes.json();

        // Create volume map
        const volumeMap = {};
        tickerData.forEach(t => {
          volumeMap[t.symbol] = parseFloat(t.quoteVolume);
        });

        // Filter: USDT pairs, trading status, volume > $1M
        const filtered = exchangeData.symbols
          .filter(s =>
            s.quoteAsset === 'USDT' &&
            s.status === 'TRADING' &&
            s.isSpotTradingAllowed &&
            (volumeMap[s.symbol] || 0) > 1000000
          )
          .map(s => ({
            symbol: s.symbol,
            baseAsset: s.baseAsset,
            volume: volumeMap[s.symbol] || 0
          }))
          .sort((a, b) => b.volume - a.volume);

        setAvailableSymbols(filtered);
      } catch (err) {
        console.error('Failed to fetch symbols:', err);
      } finally {
        setSymbolsLoading(false);
      }
    };
    fetchSymbols();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (symbol) fetchCandleData();
  }, [symbol, timeframe, dataRange]);

  const handleSymbolSelect = (sym) => {
    setSymbol(sym);
    setShowDropdown(false);
    setSearchTerm('');

    // Update recent symbols (max 5, no duplicates)
    setRecentSymbols(prev => {
      const updated = [sym, ...prev.filter(s => s !== sym)].slice(0, 5);
      localStorage.setItem('recentSymbols', JSON.stringify(updated));
      return updated;
    });
  };

  const filteredSymbols = useMemo(() => {
    if (!searchTerm) return availableSymbols.slice(0, 20);
    const term = searchTerm.toUpperCase();
    return availableSymbols.filter(s =>
      s.symbol.includes(term) || s.baseAsset.includes(term)
    ).slice(0, 20);
  }, [searchTerm, availableSymbols]);


  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          {/* Searchable Symbol Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded border border-gray-600 min-w-[160px]"
            >
              {symbol ? (
                <span className="font-medium">{symbol.replace('USDT', '/USDT')}</span>
              ) : (
                <span className="text-gray-400">Coin Seçin...</span>
              )}
              <ChevronDown size={16} className="ml-auto" />
            </button>

            {showDropdown && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50">
                {/* Search Input */}
                <div className="p-2 border-b border-gray-700">
                  <div className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded">
                    <Search size={16} className="text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Coin ara..."
                      className="bg-transparent border-none outline-none flex-1 text-sm"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Recent Symbols */}
                {recentSymbols.length > 0 && !searchTerm && (
                  <div className="p-2 border-b border-gray-700">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>Son Kullanılanlar</span>
                      </div>
                      <button
                        onClick={() => {
                          setRecentSymbols([]);
                          localStorage.setItem('recentSymbols', JSON.stringify([]));
                        }}
                        className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"
                      >
                        Temizle
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {recentSymbols.map(s => (
                        <div
                          key={s}
                          className="group relative flex items-center bg-gray-700 rounded overflow-hidden"
                        >
                          <button
                            onClick={() => handleSymbolSelect(s)}
                            className="px-2 py-1 text-xs hover:bg-blue-600 transition-colors"
                          >
                            {s.replace('USDT', '')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = recentSymbols.filter(sym => sym !== s);
                              setRecentSymbols(updated);
                              localStorage.setItem('recentSymbols', JSON.stringify(updated));
                            }}
                            className="px-1 py-1 text-gray-500 hover:text-red-400 hover:bg-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                            title="Kaldır"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Symbol List */}
                <div className="max-h-60 overflow-y-auto">
                  {symbolsLoading ? (
                    <div className="p-4 text-center text-gray-400">Yükleniyor...</div>
                  ) : filteredSymbols.length === 0 ? (
                    <div className="p-4 text-center text-gray-400">Sonuç bulunamadı</div>
                  ) : (
                    filteredSymbols.map(s => (
                      <button
                        key={s.symbol}
                        onClick={() => handleSymbolSelect(s.symbol)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-700 text-left"
                      >
                        <span className="font-medium">{s.baseAsset}<span className="text-gray-400">/USDT</span></span>
                        <span className="text-xs text-gray-400">${(s.volume / 1000000).toFixed(1)}M</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {['15m', '1h', '4h', '1d'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-2 rounded font-medium ${timeframe === tf ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Aralık:</span>
          <select
            value={dataRange}
            onChange={(e) => setDataRange(e.target.value)}
            className="bg-gray-700 px-2 py-1 rounded border border-gray-600 text-sm"
          >
            <option value="short">Kısa</option>
            <option value="medium">Orta</option>
            <option value="long">Uzun</option>
          </select>
        </div>

        <button onClick={fetchCandleData} disabled={loading || !symbol} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Yenile
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-4">
          {!symbol ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <BarChart3 size={64} className="mb-4 opacity-30" />
              <p className="text-lg">Analiz etmek için bir coin seçin</p>
              <p className="text-sm mt-2">Yukarıdaki dropdown'dan coin arayabilirsiniz</p>
            </div>
          ) : candleData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">Veri yükleniyor...</div>
          ) : (
            <div className="h-full bg-gray-800 rounded-lg p-2 relative">
              {/* Chart Drawing Tools */}
              <div className="absolute top-4 left-4 z-10 flex gap-1 bg-gray-900/80 rounded-lg p-1">
                {/* Horizontal Line Tool */}
                <button
                  onClick={() => {
                    setDrawingMode(drawingMode === 'horizontal' ? null : 'horizontal');
                    setFirstPoint(null);
                  }}
                  className={`p-2 rounded flex items-center gap-1 ${drawingMode === 'horizontal' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                  title="Yatay Çizgi (tek tık)"
                >
                  <MoveHorizontal size={16} />
                </button>
                {/* Diagonal Line Tool */}
                <button
                  onClick={() => {
                    setDrawingMode(drawingMode === 'diagonal' ? null : 'diagonal');
                    setFirstPoint(null);
                  }}
                  className={`p-2 rounded flex items-center gap-1 ${drawingMode === 'diagonal' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                  title="Trend Çizgisi (iki tık)"
                >
                  <Pencil size={16} />
                </button>

                {/* Line Manager Toggle */}
                {(drawnLines.length > 0 || trendLines.length > 0) && (
                  <button
                    onClick={() => setShowLineManager(!showLineManager)}
                    className={`p-2 rounded flex items-center gap-1 ${showLineManager ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                    title="Çizgi Yöneticisi"
                  >
                    <List size={16} />
                    <span className="text-xs">{drawnLines.length + trendLines.length}</span>
                  </button>
                )}

                {/* Clear All Lines */}
                {(drawnLines.length > 0 || trendLines.length > 0) && (
                  <button
                    onClick={() => {
                      setDrawnLines([]);
                      setTrendLines([]);
                      setShowLineManager(false);
                    }}
                    className="p-2 bg-gray-700 hover:bg-red-600 text-gray-400 hover:text-white rounded"
                    title="Tüm Çizgileri Temizle"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                {/* Backtest Button */}
                <button
                  onClick={() => {
                    if (!candleData || candleData.length < 100) {
                      alert('❌ Backtest için minimum 100 mum gerekli!');
                      return;
                    }
                    console.log('🧪 Starting backtest with', candleData.length, 'candles...');

                    const engine = new BacktestEngine(1000);
                    const report = engine.run(candleData);

                    if (report.success) {
                      console.log('\n' + formatBacktestReport(report));
                      console.table(report.tradeLog);

                      alert(`🧪 BACKTEST SONUÇLARI\n\n` +
                        `📊 Toplam Trade: ${report.summary.totalTrades}\n` +
                        `✅ Win Rate: ${report.summary.winRate.toFixed(1)}%\n` +
                        `💰 Net Kar: $${report.summary.netProfit.toFixed(2)} (${report.summary.netProfitPercent.toFixed(1)}%)\n` +
                        `📉 Max Drawdown: ${report.summary.maxDrawdown.toFixed(1)}%\n` +
                        `⚖️ Profit Factor: ${report.summary.profitFactor.toFixed(2)}\n\n` +
                        `Detaylar için Console'a bakın.`);
                    } else {
                      alert('❌ Backtest hatası: ' + report.error);
                    }
                  }}
                  className="p-2 rounded flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white"
                  title="Strateji Backtest"
                >
                  <span>🧪</span>
                  <span className="text-xs hidden sm:inline">Test</span>
                </button>

                {/* Debug Mode Checkbox */}
                <label className="flex items-center gap-1.5 px-2 py-1 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={showDebug}
                    onChange={(e) => setShowDebug(e.target.checked)}
                    className="w-3 h-3 accent-fuchsia-500"
                  />
                  <span className="text-xs text-gray-300">🐞 Debug</span>
                </label>
              </div>

              {/* Line Manager Panel */}
              {showLineManager && (drawnLines.length > 0 || trendLines.length > 0) && (
                <div className="absolute top-14 left-4 z-10 bg-gray-900/95 rounded-lg p-3 min-w-64 max-h-80 overflow-y-auto border border-gray-700 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-200">📐 Çizgi Yöneticisi</span>
                    <button onClick={() => setShowLineManager(false)} className="text-gray-400 hover:text-white">
                      <X size={14} />
                    </button>
                  </div>

                  {/* Horizontal Lines */}
                  {drawnLines.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs text-amber-400 mb-1">Yatay Çizgiler ({drawnLines.length})</div>
                      {drawnLines.map(line => (
                        <div key={line.id} className="flex items-center justify-between py-1 px-2 bg-gray-800 rounded mb-1 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-0.5 bg-amber-500"></div>
                            <span className="text-gray-300">${line.price.toFixed(2)}</span>
                          </div>
                          <button
                            onClick={() => setDrawnLines(prev => prev.filter(l => l.id !== line.id))}
                            className="text-gray-500 hover:text-red-400"
                            title="Sil"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Trend Lines */}
                  {trendLines.length > 0 && (
                    <div>
                      <div className="text-xs text-purple-400 mb-1">Trend Çizgileri ({trendLines.length})</div>
                      {trendLines.map((line, idx) => (
                        <div key={line.id} className="flex items-center justify-between py-1 px-2 bg-gray-800 rounded mb-1 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-0.5 bg-purple-500 transform rotate-45"></div>
                            <span className="text-gray-300">Trend #{idx + 1}</span>
                            <span className="text-gray-500 text-[10px]">${line.p1.price.toFixed(0)} → ${line.p2.price.toFixed(0)}</span>
                          </div>
                          <button
                            onClick={() => setTrendLines(prev => prev.filter(l => l.id !== line.id))}
                            className="text-gray-500 hover:text-red-400"
                            title="Sil"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Drawing Mode Indicator */}
              {drawingMode && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-gray-900/90 px-4 py-2 rounded-lg text-sm">
                  {drawingMode === 'horizontal' ? (
                    <span className="text-amber-400">📏 Yatay çizgi için grafiğe tıklayın</span>
                  ) : (
                    <span className="text-purple-400">
                      {firstPoint ? '📍 İkinci noktayı seçin...' : '📍 Birinci noktayı seçin...'}
                    </span>
                  )}
                  <button
                    onClick={() => { setDrawingMode(null); setFirstPoint(null); }}
                    className="ml-3 text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Fit Content Button */}
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => chartRef.current?.timeScale().fitContent()}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded"
                  title="Sığdır"
                >
                  <Maximize2 size={16} />
                </button>
              </div>

              {/* Chart Container */}
              <div ref={chartContainerRef} className="w-full h-full" />
            </div>
          )}
        </div>

        <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="flex border-b border-gray-700">
            {[
              { id: 'setups', icon: BarChart3, label: 'Setups' },
              { id: 'scanner', icon: Radar, label: 'Scanner' },
              { id: 'trades', icon: Calculator, label: 'Trades' },
              { id: 'chat', icon: MessageSquare, label: 'Chat' },
              { id: 'settings', icon: Settings, label: '' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 ${activeTab === tab.id ? 'bg-gray-700 text-blue-400' : 'text-gray-400'}`}>
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'setups' && (
              <div className="space-y-4">
                {/* Market Info Header */}
                {generateSetups.trend && (
                  <div className="flex items-center justify-between text-sm bg-gray-700/50 rounded-lg p-2">
                    <span className="text-gray-400">Trend:</span>
                    <span className={`font-bold ${generateSetups.trend === 'uptrend' ? 'text-green-400' :
                      generateSetups.trend === 'downtrend' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                      {generateSetups.trend === 'uptrend' ? '📈 Uptrend' :
                        generateSetups.trend === 'downtrend' ? '📉 Downtrend' : '↔️ Ranging'}
                    </span>
                  </div>
                )}

                {/* Confidence Explanation */}
                <div className="bg-gray-700/30 rounded-lg p-3 text-xs text-gray-400 border border-gray-600">
                  <div className="font-bold mb-1 text-gray-300">📊 Güvenilirlik Hesaplama:</div>
                  <div className="grid grid-cols-2 gap-1">
                    <span>• Trend Uyumu: 25%</span>
                    <span>• S/R Gücü: 20%</span>
                    <span>• Pattern: 20%</span>
                    <span>• Hacim: 15%</span>
                    <span>• MTF: 10%</span>
                    <span>• Tarihsel: 10%</span>
                  </div>
                </div>

                {/* LONG SETUPS SECTION */}
                <div className="border border-green-500/30 rounded-lg overflow-hidden">
                  <div className="bg-green-900/30 px-3 py-2 flex items-center gap-2">
                    <TrendingUp size={16} className="text-green-400" />
                    <span className="font-bold text-green-400">LONG SETUPS</span>
                    <span className="ml-auto text-xs text-green-300 bg-green-800/50 px-2 py-0.5 rounded">
                      {generateSetups.longSetups?.length || 0}
                    </span>
                  </div>

                  <div className="p-2 space-y-2">
                    {generateSetups.longSetups?.length > 0 ? (
                      generateSetups.longSetups.map((setup, idx) => (
                        <div
                          key={setup.id}
                          onClick={() => setSelectedSetup(setup.id)}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedSetup === setup.id
                            ? 'border-green-500 bg-green-900/20'
                            : 'border-gray-600 hover:border-green-500/50'
                            }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="font-bold text-sm">{setup.name}</span>
                            <span className="ml-auto font-bold text-green-400">{setup.confidence}%</span>
                          </div>

                          <div className="text-xs text-gray-400 mb-2">
                            Teknik: <span className="text-green-300">{setup.techniqueLabel}</span>
                          </div>

                          {selectedSetup === setup.id && setup.entry?.length > 0 && (
                            <div className="pt-2 border-t border-gray-600 space-y-2 text-xs">
                              <div className="grid grid-cols-2 gap-2">
                                <div><span className="text-gray-400">Entry:</span> ${setup.entry[0].toFixed(0)} - ${setup.entry[1].toFixed(0)}</div>
                                <div><span className="text-gray-400">Stop:</span> <span className="text-red-400">${setup.stop.toFixed(0)}</span></div>
                              </div>

                              <div className="space-y-1">
                                {setup.targets?.map((t, i) => (
                                  <div key={i} className="flex justify-between">
                                    <span className="text-gray-400">TP{i + 1}:</span>
                                    <span className="text-green-400">${t.level.toFixed(0)} (R:R {t.rr})</span>
                                  </div>
                                ))}
                              </div>

                              {/* Confidence Breakdown */}
                              {setup.confidenceBreakdown && (
                                <div className="mt-2 pt-2 border-t border-gray-600">
                                  <div className="text-gray-300 font-bold mb-1">Güvenilirlik Detayı:</div>
                                  {Object.entries(setup.confidenceBreakdown).map(([key, val]) => (
                                    <div key={key} className="flex justify-between text-[10px]">
                                      <span className="text-gray-400">{val.reason}</span>
                                      <span className="text-green-400">+{val.score}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Reasons */}
                              <div className="mt-2 space-y-1">
                                {setup.reasons?.map((r, i) => (
                                  <div key={i} className={`text-[10px] ${r.type === 'positive' ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {r.type === 'positive' ? '✓' : '⚠'} {r.text}
                                  </div>
                                ))}
                              </div>

                              {/* Entry Confirmations with V3 Status */}
                              {setup.confirmations && setup.confirmations.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-600">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-gray-300 font-bold text-[11px]">🎯 Entry Koşulları:</span>
                                    {conditionResults.length > 0 && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700">
                                        {conditionResults.filter(c => c.status === 'met').length}/{conditionResults.length}
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    {(conditionResults.length > 0 ? conditionResults : setup.confirmations.map((c, i) => ({
                                      id: i, text: c, status: 'pending', result: null
                                    }))).map((cond, i) => (
                                      <div
                                        key={i}
                                        onClick={() => {
                                          // FIXED: Always pass visualMeta for both Long AND Short
                                          console.log('🎯 Condition clicked:', cond.text, 'visualMeta:', cond.visualMeta);

                                          if (cond.visualMeta) {
                                            // visualMeta exists - use it directly
                                            handleConditionClick(cond);
                                          } else if (cond.result?.candleTime) {
                                            // Has candleTime but no visualMeta - legacy behavior
                                            handleConditionClick(cond);
                                          } else if (candleData && candleData.length > 0) {
                                            // For pending without visualMeta: create basic zoom info
                                            const lastCandle = candleData[candleData.length - 1];
                                            const lastIndex = candleData.length - 1;
                                            const entryPrice = setup?.entry?.[0] || lastCandle.close;
                                            const isShort = setup?.direction === 'short';

                                            const pendingCond = {
                                              ...cond,
                                              visualMeta: {
                                                focusIndex: lastIndex,
                                                focusPrice: entryPrice,
                                                tooltip: isShort
                                                  ? '📍 SHORT: Fiyat zone\'a yükselmeli'
                                                  : '📍 LONG: Fiyat zone\'a geri çekilmeli',
                                                elements: [
                                                  {
                                                    type: 'ZONE',
                                                    y1: setup?.entry?.[1] || lastCandle.high,
                                                    y2: setup?.entry?.[0] || lastCandle.low,
                                                    x1_index: Math.max(0, lastIndex - 30),
                                                    x2_index: 'FUTURE',
                                                    color: isShort ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.4)',
                                                    label: isShort ? '🎯 SHORT Entry Zone' : '🎯 LONG Entry Zone',
                                                    style: 'PULSING'
                                                  },
                                                  {
                                                    type: 'LINE',
                                                    price: entryPrice,
                                                    style: 'PULSING',
                                                    color: isShort ? '#ff4444' : '#22c55e',
                                                    label: isShort
                                                      ? `👇 SHORT ENTRY - Touch Here ($${entryPrice?.toFixed(0)})`
                                                      : `👆 LONG ENTRY - Touch Here ($${entryPrice?.toFixed(0)})`
                                                  }
                                                ]
                                              },
                                              result: {
                                                candleTime: lastCandle.time,
                                                price: entryPrice,
                                                message: cond.status === 'pending' ? '⏳ Bekleniyor - Mevcut seviye' : cond.result?.message || cond.text
                                              }
                                            };
                                            handleConditionClick(pendingCond);
                                          }
                                        }}
                                        className={`text-[10px] flex items-start gap-1.5 p-1.5 rounded cursor-pointer transition-all
                                          ${cond.status === 'met' ? 'bg-green-900/30 text-green-400 hover:bg-green-800/40' :
                                            cond.status === 'failed' ? 'bg-red-900/30 text-red-400 hover:bg-red-800/40' :
                                              'bg-yellow-900/20 text-yellow-300 hover:bg-yellow-800/30'}
                                          border border-transparent hover:border-white/20 active:scale-[0.98]`}
                                        title="Tıkla: Grafikte göster"
                                      >
                                        <span className="shrink-0 text-sm">
                                          {cond.status === 'met' ? '✅' : cond.status === 'failed' ? '❌' : '⏳'}
                                        </span>
                                        <div className="flex-1">
                                          <div>{cond.text}</div>
                                          {cond.result?.message && cond.result.message !== cond.text && (
                                            <div className="text-[9px] opacity-70">{cond.result.message}</div>
                                          )}
                                        </div>

                                        <div className="flex gap-1 ml-2 z-20">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              verifyConditionWithAI(cond, setup);
                                            }}
                                            className="px-1.5 py-0.5 bg-blue-900/50 hover:bg-blue-600 rounded text-[9px] text-blue-200 transition-colors border border-blue-500/30"
                                            title="AI ile Doğrula & Çiz"
                                          >
                                            🤖 Verify
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              explainConditionWithAI(cond, setup);
                                            }}
                                            className="px-1.5 py-0.5 bg-purple-900/50 hover:bg-purple-600 rounded text-[9px] text-purple-200 transition-colors border border-purple-500/30"
                                            title="Detaylı Açıklama"
                                          >
                                            🎓 Explain
                                          </button>
                                        </div>
                                        <span className="text-[10px] opacity-60 ml-1">🔍</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="text-[9px] text-gray-500 mt-1 italic">
                                    {conditionResults.every(c => c.status === 'met') && conditionResults.length > 0
                                      ? '✅ Tüm koşullar sağlandı!'
                                      : 'Tıklayarak grafikte gör. Tüm koşullar oluşmadan giriş YAPMAYIN!'}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 bg-gray-700/30 rounded-lg">
                        <div className="text-sm text-gray-400 mb-2">⚠️ Long setup bulunamadı</div>
                        <div className="text-xs text-gray-500 space-y-1">
                          {generateSetups.noLongReason?.map((reason, i) => (
                            <div key={i}>• {reason}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* SHORT SETUPS SECTION */}
                <div className="border border-red-500/30 rounded-lg overflow-hidden">
                  <div className="bg-red-900/30 px-3 py-2 flex items-center gap-2">
                    <TrendingUp size={16} className="text-red-400 transform rotate-180" />
                    <span className="font-bold text-red-400">SHORT SETUPS</span>
                    <span className="ml-auto text-xs text-red-300 bg-red-800/50 px-2 py-0.5 rounded">
                      {generateSetups.shortSetups?.length || 0}
                    </span>
                  </div>

                  <div className="p-2 space-y-2">
                    {generateSetups.shortSetups?.length > 0 ? (
                      generateSetups.shortSetups.map((setup, idx) => (
                        <div
                          key={setup.id}
                          onClick={() => setSelectedSetup(setup.id)}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedSetup === setup.id
                            ? 'border-red-500 bg-red-900/20'
                            : 'border-gray-600 hover:border-red-500/50'
                            }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span className="font-bold text-sm">{setup.name}</span>
                            <span className="ml-auto font-bold text-red-400">{setup.confidence}%</span>
                          </div>

                          <div className="text-xs text-gray-400 mb-2">
                            Teknik: <span className="text-red-300">{setup.techniqueLabel}</span>
                          </div>

                          {selectedSetup === setup.id && setup.entry?.length > 0 && (
                            <div className="pt-2 border-t border-gray-600 space-y-2 text-xs">
                              <div className="grid grid-cols-2 gap-2">
                                <div><span className="text-gray-400">Entry:</span> ${setup.entry[0].toFixed(0)} - ${setup.entry[1].toFixed(0)}</div>
                                <div><span className="text-gray-400">Stop:</span> <span className="text-red-400">${setup.stop.toFixed(0)}</span></div>
                              </div>

                              <div className="space-y-1">
                                {setup.targets?.map((t, i) => (
                                  <div key={i} className="flex justify-between">
                                    <span className="text-gray-400">TP{i + 1}:</span>
                                    <span className="text-red-400">${t.level.toFixed(0)} (R:R {t.rr})</span>
                                  </div>
                                ))}
                              </div>

                              {/* Confidence Breakdown */}
                              {setup.confidenceBreakdown && (
                                <div className="mt-2 pt-2 border-t border-gray-600">
                                  <div className="text-gray-300 font-bold mb-1">Güvenilirlik Detayı:</div>
                                  {Object.entries(setup.confidenceBreakdown).map(([key, val]) => (
                                    <div key={key} className="flex justify-between text-[10px]">
                                      <span className="text-gray-400">{val.reason}</span>
                                      <span className="text-red-400">+{val.score}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Reasons */}
                              <div className="mt-2 space-y-1">
                                {setup.reasons?.map((r, i) => (
                                  <div key={i} className={`text-[10px] ${r.type === 'positive' ? 'text-red-400' : 'text-yellow-400'}`}>
                                    {r.type === 'positive' ? '✓' : '⚠'} {r.text}
                                  </div>
                                ))}
                              </div>

                              {/* Entry Confirmations with V3 Status - SHORT */}
                              {setup.confirmations && setup.confirmations.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-600">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-gray-300 font-bold text-[11px]">🎯 Entry Koşulları:</span>
                                  </div>
                                  <div className="space-y-1">
                                    {setup.confirmations.map((conf, i) => (
                                      <div
                                        key={i}
                                        onClick={() => {
                                          // SHORT CLICK HANDLER WITH VISUALMETA
                                          if (candleData && candleData.length > 0) {
                                            const lastCandle = candleData[candleData.length - 1];
                                            const lastIndex = candleData.length - 1;
                                            const entryPrice = setup?.entry?.[0] || lastCandle.close;

                                            const shortCond = {
                                              id: `short_cond_${i}_${lastCandle.time}`,
                                              text: conf,
                                              status: 'pending',
                                              visualMeta: {
                                                focusIndex: lastIndex,
                                                focusPrice: entryPrice,
                                                elements: [
                                                  {
                                                    type: 'ZONE',
                                                    y1: setup?.entry?.[1] || lastCandle.high,
                                                    y2: setup?.entry?.[0] || lastCandle.low,
                                                    x1_index: Math.max(0, lastIndex - 30),
                                                    x2_index: 'FUTURE',
                                                    color: 'rgba(239, 68, 68, 0.4)',
                                                    label: '🎯 SHORT Entry Zone',
                                                    style: 'PULSING'
                                                  },
                                                  {
                                                    type: 'LINE',
                                                    price: entryPrice,
                                                    style: 'PULSING',
                                                    color: '#ff4444',
                                                    label: `👇 SHORT ENTRY ($${entryPrice?.toFixed(0)})`
                                                  },
                                                  {
                                                    type: 'LINE',
                                                    price: setup?.stop || entryPrice * 1.02,
                                                    style: 'DASHED',
                                                    color: '#ff0000',
                                                    label: `🛑 STOP LOSS ($${setup?.stop?.toFixed(0)})`
                                                  }
                                                ]
                                              },
                                              result: {
                                                candleTime: lastCandle.time,
                                                price: entryPrice,
                                                message: '⏳ Bekleniyor - SHORT entry zone'
                                              }
                                            };
                                            console.log('🔴 SHORT Condition clicked:', conf, shortCond.visualMeta);
                                            handleConditionClick(shortCond);
                                          }
                                        }}
                                        className="text-[10px] flex items-start gap-1.5 p-1.5 rounded cursor-pointer transition-all
                                          bg-yellow-900/20 text-yellow-300 hover:bg-red-800/30
                                          border border-transparent hover:border-red-500/50 active:scale-[0.98]"
                                        title="Tıkla: Grafikte göster"
                                      >
                                        <span className="shrink-0 text-sm">⏳</span>
                                        <div className="flex-1">
                                          <div>{conf}</div>
                                        </div>
                                        <div className="flex gap-1 ml-2 z-20">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              verifyConditionWithAI({ text: conf }, setup);
                                            }}
                                            className="px-1.5 py-0.5 bg-red-900/50 hover:bg-red-600 rounded text-[9px] text-red-200 transition-colors border border-red-500/30"
                                            title="AI ile Doğrula & Çiz"
                                          >
                                            🤖 Verify
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              explainConditionWithAI({ text: conf }, setup);
                                            }}
                                            className="px-1.5 py-0.5 bg-purple-900/50 hover:bg-purple-600 rounded text-[9px] text-purple-200 transition-colors border border-purple-500/30"
                                            title="Detaylı Açıklama"
                                          >
                                            🎓 Explain
                                          </button>
                                        </div>
                                        <span className="text-[10px] opacity-60 text-red-400 ml-1">🔍</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="text-[9px] text-gray-500 mt-1 italic">Tüm koşullar oluşmadan giriş YAPMAYIN!</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 bg-gray-700/30 rounded-lg">
                        <div className="text-sm text-gray-400 mb-2">⚠️ Short setup bulunamadı</div>
                        <div className="text-xs text-gray-500 space-y-1">
                          {generateSetups.noShortReason?.map((reason, i) => (
                            <div key={i}>• {reason}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Position Calculator */}
                {currentSetup && positionCalc && (
                  <div className={`p-4 rounded-lg border ${currentSetup.direction === 'long'
                    ? 'border-green-500/30 bg-green-900/10'
                    : 'border-red-500/30 bg-red-900/10'
                    }`}>
                    <h4 className={`font-bold mb-3 ${currentSetup.direction === 'long' ? 'text-green-400' : 'text-red-400'
                      }`}>
                      📱 CALCULATOR ({currentSetup.direction.toUpperCase()})
                    </h4>
                    <input
                      type="number"
                      value={investment}
                      onChange={(e) => setInvestment(e.target.value)}
                      className="w-full mb-2 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm"
                      placeholder="Yatırım tutarı ($)"
                    />
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.5"
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
                      className="w-full mb-2"
                    />
                    <div className="text-center mb-3 text-sm">Risk: {riskPercent}%</div>
                    <div className="bg-gray-800 p-3 rounded text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Position:</span>
                        <span>{positionCalc.positionSize} {symbol?.replace('USDT', '')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Max Loss:</span>
                        <span className="text-red-400">${positionCalc.maxLoss}</span>
                      </div>
                      {positionCalc.potentialGains?.map((gain, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-gray-400">TP{i + 1} Kar:</span>
                          <span className="text-green-400">${gain}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'trades' && (
              <div className="space-y-4">
                {/* Trade Stats */}
                <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-blue-400 mb-3">📊 Performance</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-900/50 rounded p-2">
                      <div className="text-gray-400 text-xs">Win Rate</div>
                      <div className={`font-bold ${tradeStats.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                        {tradeStats.winRate.toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-gray-900/50 rounded p-2">
                      <div className="text-gray-400 text-xs">Avg R:R</div>
                      <div className="font-bold text-blue-400">{tradeStats.avgRR.toFixed(2)}</div>
                    </div>
                    <div className="bg-gray-900/50 rounded p-2">
                      <div className="text-gray-400 text-xs">Total P&L</div>
                      <div className={`font-bold ${tradeStats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${tradeStats.totalPnl.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-gray-900/50 rounded p-2">
                      <div className="text-gray-400 text-xs">Trades</div>
                      <div className="font-bold text-gray-200">{tradeStats.closed} / {tradeStats.total}</div>
                    </div>
                  </div>
                </div>

                {/* New Trade Button */}
                <button
                  onClick={() => {
                    setNewTrade(prev => ({ ...prev, pair: symbol || '' }));
                    setShowTradeModal(true);
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Yeni İşlem Ekle
                </button>

                {/* Open Trades */}
                {trades.filter(t => t.status === 'open').length > 0 && (
                  <div className="border border-green-500/30 rounded-lg overflow-hidden">
                    <div className="bg-green-900/30 px-3 py-2 text-green-400 font-bold text-sm">
                      🟢 Açık İşlemler ({trades.filter(t => t.status === 'open').length})
                    </div>
                    <div className="p-2 space-y-2">
                      {trades.filter(t => t.status === 'open').map(trade => (
                        <div key={trade.id} className="bg-gray-700/50 rounded-lg p-3 text-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className={`font-bold ${trade.direction === 'long' ? 'text-green-400' : 'text-red-400'}`}>
                              {trade.direction.toUpperCase()} {trade.pair}
                            </span>
                            <span className="text-gray-400">${trade.size}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 mb-2">
                            <div>Entry: ${trade.entryPrice}</div>
                            <div>SL: ${trade.stopLoss || '-'}</div>
                            <div>TP: ${trade.takeProfit || '-'}</div>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              placeholder="Kapanış fiyatı"
                              className="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs"
                              id={`close-${trade.id}`}
                            />
                            <button
                              onClick={() => {
                                const input = document.getElementById(`close-${trade.id}`);
                                if (input?.value) closeTrade(trade.id, parseFloat(input.value));
                              }}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                            >
                              Kapat
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trade History */}
                {trades.filter(t => t.status === 'closed').length > 0 && (
                  <div className="border border-gray-600 rounded-lg overflow-hidden">
                    <div className="bg-gray-700/50 px-3 py-2 text-gray-300 font-bold text-sm">
                      📜 Geçmiş ({trades.filter(t => t.status === 'closed').length})
                    </div>
                    <div className="p-2 space-y-1 max-h-40 overflow-y-auto">
                      {trades.filter(t => t.status === 'closed').slice(-5).reverse().map(trade => (
                        <div key={trade.id} className="flex justify-between items-center bg-gray-800/50 rounded px-3 py-2 text-xs">
                          <div>
                            <span className={trade.direction === 'long' ? 'text-green-400' : 'text-red-400'}>
                              {trade.direction.toUpperCase()}
                            </span>
                            <span className="text-gray-400 ml-2">{trade.pair}</span>
                          </div>
                          <span className={`font-bold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {trade.pnl >= 0 ? '+' : ''}${trade.pnl?.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {trades.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Calculator size={32} className="mx-auto mb-2 opacity-30" />
                    <p>Henüz işlem yok</p>
                    <p className="text-xs mt-1">İşlemlerinizi buradan takip edin</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-blue-400">AI CHAT</h3>
                  {aiAnnotations.length > 0 && (
                    <button
                      onClick={clearAiDrawings}
                      className="text-xs px-2 py-1 bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white rounded flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={12} /> 🤖 AI Çizimlerini Temizle
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 ml-8' : 'bg-gray-700 mr-8'}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold">{msg.role === 'user' ? 'Siz' : 'AI'}</span>
                        {msg.model && <span className="text-[10px] opacity-50">{msg.model}</span>}
                      </div>
                      <div className="whitespace-pre-line text-sm">{msg.text}</div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="bg-gray-700 mr-8 p-3 rounded-lg animate-pulse text-sm text-gray-400">
                      AI düşünüyor...
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                    placeholder="Soru sor..." className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded" />
                  <button onClick={handleChatSubmit} className="px-4 py-2 bg-blue-600 rounded">Gönder</button>
                </div>
              </div>
            )}

            {activeTab === 'scanner' && (
              <div className="space-y-4">
                {/* Header with Power Toggle */}
                <div className="flex items-center justify-between bg-gradient-to-r from-cyan-900/50 to-gray-800 rounded-lg p-3 border border-cyan-700/30">
                  <div className="flex items-center gap-2">
                    <Radar size={20} className={`${isScannerActive ? 'text-cyan-400 animate-pulse' : 'text-gray-500'}`} />
                    <span className="font-bold text-cyan-300">{t('scanner.title').replace('📡 ', '')}</span>
                  </div>
                  <button
                    onClick={() => setIsScannerActive(!isScannerActive)}
                    className={`p-2 rounded-full transition-all duration-300 ${isScannerActive
                      ? 'bg-green-600 text-white shadow-lg shadow-green-600/50'
                      : 'bg-gray-600 text-gray-400 hover:bg-gray-500'}`}
                    title={isScannerActive ? t('scanner.powerOn') : t('scanner.powerOff')}
                  >
                    <Power size={18} />
                  </button>
                </div>

                {/* Status Indicator */}
                <div className={`text-xs px-3 py-1.5 rounded-full text-center ${isScannerActive
                  ? 'bg-green-900/50 text-green-400 border border-green-700/50'
                  : 'bg-gray-700/50 text-gray-500'}`}>
                  {isScannerActive ? `🟢 ${t('scanner.powerOn')}` : `⚫ ${t('scanner.powerOff')}`}
                </div>

                {/* Add Symbol Input with Autocomplete */}
                <div className="relative">
                  <div className="flex gap-2">
                    <input
                      ref={scannerInputRef}
                      type="text"
                      value={newSymbolInput}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setNewSymbolInput(val);
                        setShowScannerDropdown(val.length > 0);
                      }}
                      onFocus={() => setShowScannerDropdown(newSymbolInput.length > 0)}
                      onBlur={() => setTimeout(() => setShowScannerDropdown(false), 200)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setShowScannerDropdown(false);
                          setNewSymbolInput('');
                        }
                      }}
                      placeholder={t('scanner.addSymbol')}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  {/* Autocomplete Dropdown */}
                  {showScannerDropdown && newSymbolInput.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {availableSymbols
                        .filter(s =>
                          s.symbol.includes(newSymbolInput) ||
                          s.baseAsset.includes(newSymbolInput)
                        )
                        .slice(0, 10)
                        .map(s => {
                          const alreadyInList = watchlist.includes(s.symbol);
                          return (
                            <button
                              key={s.symbol}
                              onClick={() => {
                                if (!alreadyInList) {
                                  setWatchlist(prev => [...prev, s.symbol]);
                                }
                                setNewSymbolInput('');
                                setShowScannerDropdown(false);
                              }}
                              disabled={alreadyInList}
                              className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors
                                ${alreadyInList
                                  ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                                  : 'hover:bg-cyan-900/50 hover:text-cyan-300'}`}
                            >
                              <span>
                                <span className="font-bold">{s.baseAsset}</span>
                                <span className="text-gray-500">/USDT</span>
                              </span>
                              {alreadyInList && (
                                <span className="text-[10px] text-gray-500">Listede</span>
                              )}
                            </button>
                          );
                        })
                      }
                      {availableSymbols.filter(s =>
                        s.symbol.includes(newSymbolInput) ||
                        s.baseAsset.includes(newSymbolInput)
                      ).length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center">
                            ❌ Geçerli sembol bulunamadı
                          </div>
                        )}
                    </div>
                  )}
                </div>

                {/* Watchlist */}
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  <div className="text-xs text-gray-400 mb-2 flex justify-between items-center">
                    <span>📋 Watchlist ({watchlist.length})</span>
                    {watchlist.length > 0 && (
                      <button
                        onClick={() => setWatchlist([])}
                        className="text-red-400 hover:text-red-300 text-[10px]"
                      >
                        Temizle
                      </button>
                    )}
                  </div>
                  {watchlist.map(sym => {
                    const result = scannerResults[sym];
                    const signalColor = result?.signal === 'long'
                      ? 'bg-green-600 text-white'
                      : result?.signal === 'short'
                        ? 'bg-red-600 text-white'
                        : result?.signal === 'error'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-600 text-gray-300';

                    return (
                      <div
                        key={sym}
                        onClick={() => {
                          try {
                            setSymbol(sym);
                            // Symbol change will trigger fetchCandleData via useEffect
                          } catch (err) {
                            console.error('Symbol switch error:', err);
                          }
                        }}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all
                          ${symbol === sym
                            ? 'bg-cyan-800/50 border border-cyan-500/50'
                            : 'bg-gray-700/50 hover:bg-gray-600/50 border border-transparent'}`}
                      >
                        <div className="flex flex-col">
                          <span className="font-mono text-sm font-bold">
                            {sym.replace('USDT', '')}<span className="text-gray-500 font-normal">/USDT</span>
                          </span>
                          {result?.lastPrice && (
                            <span className="text-[10px] text-gray-500">
                              ${result.lastPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* Signal Badge with Confidence */}
                          {result ? (
                            <div className="flex items-center gap-1">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${signalColor}`}>
                                {result.signal === 'long' ? '🟢 LONG'
                                  : result.signal === 'short' ? '🔴 SHORT'
                                    : result.signal === 'error' ? '⚠️'
                                      : '—'}
                              </span>
                              {result.confidence > 0 && (
                                <span className={`text-[9px] px-1 py-0.5 rounded ${result.signal === 'long' ? 'bg-green-900/50 text-green-300'
                                  : result.signal === 'short' ? 'bg-red-900/50 text-red-300'
                                    : 'bg-gray-700 text-gray-400'
                                  }`}>
                                  {result.confidence}%
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-500">—</span>
                          )}

                          {/* Feedback Buttons */}
                          {result && result.signal !== 'none' && (
                            <div className="flex items-center gap-1 mx-1 border-l border-gray-600 pl-1.5 py-0.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  logFeedback(sym, result.signal, true);
                                }}
                                className="text-gray-600 hover:text-green-400 p-0.5 rounded transition-colors group"
                                title="Doğru Sinyal"
                              >
                                <ThumbsUp size={12} className="group-active:scale-90" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  logFeedback(sym, result.signal, false);
                                }}
                                className="text-gray-600 hover:text-red-400 p-0.5 rounded transition-colors group"
                                title="Yanlış Sinyal"
                              >
                                <ThumbsDown size={12} className="group-active:scale-90" />
                              </button>
                            </div>
                          )}

                          {/* Verify/Explain Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              verifySignalWithAI(sym, result);
                            }}
                            disabled={!aiEnabled || !geminiApiKey}
                            className={`ml-1 p-1 rounded transition-all relative group
                              ${aiVerifications[sym]?.status === 'loading' ? 'bg-yellow-900/30 text-yellow-500 animate-pulse' :
                                aiVerifications[sym]?.status === 'complete' ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-800' :
                                  'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'}`}
                            title="AI Mentor: Analiz Et & Açıkla"
                          >
                            <Search size={14} />
                            {aiVerifications[sym]?.status === 'complete' && (
                              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                              </span>
                            )}
                          </button>
                          {/* Delete Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setWatchlist(prev => prev.filter(s => s !== sym));
                            }}
                            className="text-gray-500 hover:text-red-400 transition-colors ml-1"
                            title="Kaldır"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Scanner Stats */}
                {Object.keys(scannerResults).length > 0 && (
                  <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-600 mt-4">
                    <div className="text-xs font-bold text-gray-300 mb-2">{t('scanner.summary')}</div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-green-900/30 rounded p-2">
                        <div className="text-green-400 font-bold">
                          {Object.values(scannerResults).filter(r => r.signal === 'long').length}
                        </div>
                        <div className="text-gray-500">{t('scanner.signals.long')}</div>
                      </div>
                      <div className="bg-red-900/30 rounded p-2">
                        <div className="text-red-400 font-bold">
                          {Object.values(scannerResults).filter(r => r.signal === 'short').length}
                        </div>
                        <div className="text-gray-500">{t('scanner.signals.short')}</div>
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        <div className="text-gray-400 font-bold">
                          {Object.values(scannerResults).filter(r => r.signal === 'none').length}
                        </div>
                        <div className="text-gray-500">{t('scanner.signals.none')}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* End Scanner Tab */}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                {/* Language Selector */}
                <div className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                  <span className="text-sm text-gray-300">{t('settings.language')}</span>
                  <LanguageSelector />
                </div>

                {/* Header */}
                <div className="flex items-center gap-2 bg-gradient-to-r from-purple-900/50 to-gray-800 rounded-lg p-3 border border-purple-700/30">
                  <Bot size={20} className={`${geminiApiKey ? 'text-purple-400' : 'text-gray-500'}`} />
                  <span className="font-bold text-purple-300">{t('settings.title')}</span>
                </div>

                {/* AI Status & Master Toggle */}
                <div className={`flex items-center justify-between px-3 py-3 rounded-lg border ${aiEnabled && geminiApiKey
                  ? 'bg-green-900/20 border-green-500/30'
                  : 'bg-gray-700/30 border-gray-600'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${aiEnabled && geminiApiKey ? 'bg-green-500/20 text-green-400' : 'bg-gray-600/50 text-gray-400'}`}>
                      <Bot size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-200">{t('settings.aiMentorMode')}</div>
                      <div className="text-[10px] text-gray-400">
                        {aiEnabled ? (geminiApiKey ? t('settings.active') : t('settings.apiKeyMissing')) : t('settings.disabled')}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const newState = !aiEnabled;
                      setAiEnabled(newState);
                      localStorage.setItem('aiMasterEnabled', JSON.stringify(newState));
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${aiEnabled ? 'bg-green-600' : 'bg-gray-600'
                      }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${aiEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                  </button>
                </div>

                {/* API Key Input */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <Key size={14} />
                    {t('settings.geminiApiKey')}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-purple-500 focus:outline-none pr-16"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
                      >
                        {showApiKey ? t('common.hide') : t('common.show')}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.setItem('geminiApiKey', geminiApiKey);
                      alert(t('settings.apiKeySaved'));
                    }}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 rounded text-sm font-bold transition-colors"
                  >
                    {t('common.save')}
                  </button>
                </div>

                {/* Get API Key Link */}
                <div className="text-xs text-gray-500 text-center">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    {t('settings.getApiKey')}
                  </a>
                </div>

                {/* Feedback History */}
                {userFeedback.length > 0 && (
                  <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-600">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-gray-300">{t('settings.feedbackHistory')}</span>
                      <button
                        onClick={() => {
                          setUserFeedback([]);
                          localStorage.setItem('aiFeedback', '[]');
                        }}
                        className="text-gray-500 hover:text-red-400"
                      >
                        {t('common.clear')}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-green-900/30 rounded p-2">
                        <div className="text-green-400 font-bold">
                          {userFeedback.filter(f => f.type === 'positive').length}
                        </div>
                        <div className="text-gray-500">{t('settings.positive')}</div>
                      </div>
                      <div className="bg-red-900/30 rounded p-2">
                        <div className="text-red-400 font-bold">
                          {userFeedback.filter(f => f.type === 'negative').length}
                        </div>
                        <div className="text-gray-500">{t('settings.negative')}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Info */}
                <div className="bg-gray-700/20 rounded-lg p-3 text-xs text-gray-500">
                  <p className="mb-2">{t('settings.aiFeatures')}</p>
                  <ul className="list-disc list-inside space-y-1">
                    {t('settings.featureList').map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Trade Modal */}
            {showTradeModal && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-xl p-6 w-96 border border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-blue-400">📝 Yeni İşlem</h3>
                    <button onClick={() => setShowTradeModal(false)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400">Pair</label>
                      <input
                        type="text"
                        value={newTrade.pair}
                        onChange={(e) => setNewTrade(prev => ({ ...prev, pair: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                        placeholder="BTCUSDT"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-400">Yön</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setNewTrade(prev => ({ ...prev, direction: 'long' }))}
                          className={`flex-1 py-2 rounded font-bold ${newTrade.direction === 'long' ? 'bg-green-600' : 'bg-gray-700'}`}
                        >
                          LONG
                        </button>
                        <button
                          onClick={() => setNewTrade(prev => ({ ...prev, direction: 'short' }))}
                          className={`flex-1 py-2 rounded font-bold ${newTrade.direction === 'short' ? 'bg-red-600' : 'bg-gray-700'}`}
                        >
                          SHORT
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-400">Entry Price</label>
                        <input
                          type="number"
                          value={newTrade.entryPrice}
                          onChange={(e) => setNewTrade(prev => ({ ...prev, entryPrice: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Position Size ($)</label>
                        <input
                          type="number"
                          value={newTrade.size}
                          onChange={(e) => setNewTrade(prev => ({ ...prev, size: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                          placeholder="100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-400">Stop Loss</label>
                        <input
                          type="number"
                          value={newTrade.stopLoss}
                          onChange={(e) => setNewTrade(prev => ({ ...prev, stopLoss: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                          placeholder="Opsiyonel"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Take Profit</label>
                        <input
                          type="number"
                          value={newTrade.takeProfit}
                          onChange={(e) => setNewTrade(prev => ({ ...prev, takeProfit: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                          placeholder="Opsiyonel"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400">Not</label>
                      <input
                        type="text"
                        value={newTrade.notes}
                        onChange={(e) => setNewTrade(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                        placeholder="OB long, HTF trend uyumu..."
                      />
                    </div>

                    <button
                      onClick={openTrade}
                      disabled={!newTrade.entryPrice || !newTrade.size}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-bold mt-2"
                    >
                      İşlem Aç
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* End Tab Content Container */}
          </div>
        </div>
      </div>
    </div>
  ); // return parantezi
}; // PriceActionEngine fonksiyonu kapanışı

export default PriceActionEngine;
