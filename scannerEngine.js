/**
 * Scanner Engine for Multi-Pair Analysis
 * Sequentially scans multiple trading pairs using analyzeV3
 * 
 * Features:
 * - Sequential scanning with configurable delay
 * - Abort mechanism for cancellation
 * - Real-time results streaming
 */

import { analyzeV3 } from './signalEngineV3.js';

/**
 * Delay helper with abort support
 */
const delay = (ms, signal) => {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, ms);
        signal?.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new DOMException('Aborted', 'AbortError'));
        });
    });
};

/**
 * Fetch candle data from Binance API
 */
const fetchCandleData = async (symbol, timeframe = '4h', limit = 200, signal) => {
    const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=${limit}`,
        { signal }
    );

    if (!response.ok) {
        throw new Error(`API error for ${symbol}: ${response.status}`);
    }

    const data = await response.json();
    return data.map(candle => ({
        time: Math.floor(candle[0] / 1000),
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
    }));
};

/**
 * Determine signal from V3 analysis results
 */
const determineSignal = (analysis) => {
    if (!analysis || analysis.error) {
        return { signal: 'none', confidence: 0, reason: 'Analysis failed' };
    }

    // Check for order blocks and FVGs that suggest direction
    const { orderBlocks = [], fvgs = [], trend = 'ranging' } = analysis;

    const bullishOBs = orderBlocks.filter(ob => ob.type === 'bullish' && !ob.mitigated);
    const bearishOBs = orderBlocks.filter(ob => ob.type === 'bearish' && !ob.mitigated);
    const bullishFVGs = fvgs.filter(f => f.type === 'bullish' && !f.filled);
    const bearishFVGs = fvgs.filter(f => f.type === 'bearish' && !f.filled);

    // Score calculation
    let bullScore = 0;
    let bearScore = 0;

    // Order blocks weight
    bullScore += bullishOBs.length * 30;
    bearScore += bearishOBs.length * 30;

    // FVG weight
    bullScore += bullishFVGs.length * 20;
    bearScore += bearishFVGs.length * 20;

    // Trend alignment
    if (trend === 'bullish' || trend === 'uptrend') bullScore += 25;
    if (trend === 'bearish' || trend === 'downtrend') bearScore += 25;

    // Determine signal
    const threshold = 40;
    if (bullScore >= threshold && bullScore > bearScore) {
        return {
            signal: 'long',
            confidence: Math.min(bullScore, 100),
            reason: `${bullishOBs.length} OB, ${bullishFVGs.length} FVG, Trend: ${trend}`
        };
    } else if (bearScore >= threshold && bearScore > bullScore) {
        return {
            signal: 'short',
            confidence: Math.min(bearScore, 100),
            reason: `${bearishOBs.length} OB, ${bearishFVGs.length} FVG, Trend: ${trend}`
        };
    }

    return { signal: 'none', confidence: 0, reason: 'No clear setup' };
};

/**
 * Scanner Engine Class
 * Handles sequential scanning of multiple trading pairs
 */
export class ScannerEngine {
    constructor(config = {}) {
        this.watchlist = config.watchlist || [];
        this.delayMs = config.delayMs || 100;
        this.timeframe = config.timeframe || '4h';
        this.limit = config.limit || 200;
        this.abortController = null;
        this.onProgress = config.onProgress || null;
    }

    /**
     * Start scanning all pairs in watchlist
     * Returns object with results indexed by symbol
     */
    async scan() {
        this.abortController = new AbortController();
        const { signal } = this.abortController;
        const results = {};

        console.log(`🔍 Scanner: Starting scan of ${this.watchlist.length} pairs...`);

        for (let i = 0; i < this.watchlist.length; i++) {
            const symbol = this.watchlist[i];

            if (signal.aborted) {
                console.log('🛑 Scanner: Aborted');
                throw new DOMException('Scan aborted', 'AbortError');
            }

            try {
                // Fetch candle data
                const candles = await fetchCandleData(
                    symbol,
                    this.timeframe,
                    this.limit,
                    signal
                );

                // Run V3 analysis
                const analysis = analyzeV3(candles);

                // Determine signal
                const signalResult = determineSignal(analysis);

                results[symbol] = {
                    ...signalResult,
                    lastPrice: candles[candles.length - 1]?.close || 0,
                    lastUpdate: Date.now(),
                    candleCount: candles.length
                };

                // Progress callback
                if (this.onProgress) {
                    this.onProgress({
                        current: i + 1,
                        total: this.watchlist.length,
                        symbol,
                        result: results[symbol]
                    });
                }

                console.log(
                    `📊 ${symbol}: ${signalResult.signal.toUpperCase()} (${signalResult.confidence}%)`
                );

                // Delay before next request (respect rate limits)
                if (i < this.watchlist.length - 1) {
                    await delay(this.delayMs, signal);
                }
            } catch (err) {
                if (err.name === 'AbortError') throw err;

                console.warn(`⚠️ ${symbol}: Scan failed -`, err.message);
                results[symbol] = {
                    signal: 'error',
                    confidence: 0,
                    reason: err.message,
                    lastUpdate: Date.now()
                };
            }
        }

        console.log(`✅ Scanner: Completed scan of ${Object.keys(results).length} pairs`);
        return results;
    }

    /**
     * Abort any pending scan
     */
    abort() {
        if (this.abortController) {
            this.abortController.abort();
            console.log('🛑 Scanner: Abort requested');
        }
    }

    /**
     * Update watchlist
     */
    setWatchlist(watchlist) {
        this.watchlist = watchlist;
    }
}

export default ScannerEngine;
