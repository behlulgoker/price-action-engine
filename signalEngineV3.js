/**
 * Price Action Signal Engine V3
 * Institutional Grade Logic with Strict Math Definitions
 * 
 * SAFETY: This is a PARALLEL module - does NOT modify existing App.jsx
 */

// ============================================================
// SECTION 1: CORE DEFINITIONS (THE MATH)
// ============================================================

/**
 * Swing High Detection (5-Candle Fractal)
 * Definition: High[i] > High[i-2, i-1, i+1, i+2]
 */
export function isSwingHigh(candles, i) {
    if (i < 2 || i > candles.length - 3) return false;
    const high = candles[i].high;
    return high > candles[i - 2].high &&
        high > candles[i - 1].high &&
        high > candles[i + 1].high &&
        high > candles[i + 2].high;
}

/**
 * Swing Low Detection (5-Candle Fractal)
 * Definition: Low[i] < Low[i-2, i-1, i+1, i+2]
 */
export function isSwingLow(candles, i) {
    if (i < 2 || i > candles.length - 3) return false;
    const low = candles[i].low;
    return low < candles[i - 2].low &&
        low < candles[i - 1].low &&
        low < candles[i + 1].low &&
        low < candles[i + 2].low;
}

/**
 * Find all Swing Points in candle data
 * Returns memory arrays for historical reference
 */
export function findSwingPoints(candles) {
    const swingHighs = [];
    const swingLows = [];

    for (let i = 2; i < candles.length - 2; i++) {
        if (isSwingHigh(candles, i)) {
            swingHighs.push({
                index: i,
                time: candles[i].time,
                price: candles[i].high,
                confirmed: true
            });
        }
        if (isSwingLow(candles, i)) {
            swingLows.push({
                index: i,
                time: candles[i].time,
                price: candles[i].low,
                confirmed: true
            });
        }
    }

    return { highs: swingHighs, lows: swingLows };
}

// ============================================================
// SECTION 2: BREAK OF STRUCTURE (BOS)
// ============================================================

/**
 * Bullish BOS Detection
 * Definition: Candle Body Close > Most recent confirmed Swing High
 */
export function detectBullishBOS(candles, swingPoints) {
    if (!swingPoints.highs.length) return null;

    const lastSwingHigh = swingPoints.highs[swingPoints.highs.length - 1];

    // Find the candle that breaks the swing high with BODY CLOSE
    for (let i = lastSwingHigh.index + 3; i < candles.length; i++) {
        const candle = candles[i];
        if (candle.close > lastSwingHigh.price) {
            return {
                type: 'bullish',
                level: lastSwingHigh.price,
                breakIndex: i,
                breakTime: candle.time,
                swingIndex: lastSwingHigh.index
            };
        }
    }
    return null;
}

/**
 * Bearish BOS Detection
 * Definition: Candle Body Close < Most recent confirmed Swing Low
 */
export function detectBearishBOS(candles, swingPoints) {
    if (!swingPoints.lows.length) return null;

    const lastSwingLow = swingPoints.lows[swingPoints.lows.length - 1];

    for (let i = lastSwingLow.index + 3; i < candles.length; i++) {
        const candle = candles[i];
        if (candle.close < lastSwingLow.price) {
            return {
                type: 'bearish',
                level: lastSwingLow.price,
                breakIndex: i,
                breakTime: candle.time,
                swingIndex: lastSwingLow.index
            };
        }
    }
    return null;
}

/**
 * Find all BOS events in data
 */
export function findAllBOS(candles, swingPoints) {
    const bosEvents = [];

    // Track confirmed swing highs/lows progressively
    const confirmedHighs = [];
    const confirmedLows = [];

    for (let i = 4; i < candles.length; i++) {
        // Check for new swing points (confirmed 2 candles later)
        if (isSwingHigh(candles, i - 2)) {
            confirmedHighs.push({ index: i - 2, price: candles[i - 2].high, time: candles[i - 2].time });
        }
        if (isSwingLow(candles, i - 2)) {
            confirmedLows.push({ index: i - 2, price: candles[i - 2].low, time: candles[i - 2].time });
        }

        const candle = candles[i];

        // Check Bullish BOS
        if (confirmedHighs.length > 0) {
            const lastHigh = confirmedHighs[confirmedHighs.length - 1];
            if (candle.close > lastHigh.price) {
                bosEvents.push({
                    type: 'bullish',
                    level: lastHigh.price,
                    breakIndex: i,
                    breakTime: candle.time,
                    swingIndex: lastHigh.index,
                    swingTime: lastHigh.time
                });
                // Remove broken swing from active list
                confirmedHighs.pop();
            }
        }

        // Check Bearish BOS
        if (confirmedLows.length > 0) {
            const lastLow = confirmedLows[confirmedLows.length - 1];
            if (candle.close < lastLow.price) {
                bosEvents.push({
                    type: 'bearish',
                    level: lastLow.price,
                    breakIndex: i,
                    breakTime: candle.time,
                    swingIndex: lastLow.index,
                    swingTime: lastLow.time
                });
                confirmedLows.pop();
            }
        }
    }

    return bosEvents;
}

// ============================================================
// SECTION 3: MARKET STRUCTURE SHIFT (MSS)
// ============================================================

/**
 * Detect Market Structure Shift
 * Definition: First structure break AGAINST the current trend
 */
export function detectMSS(candles, currentTrend, swingPoints) {
    if (currentTrend === 'uptrend') {
        // In uptrend, MSS = first bearish BOS
        return detectBearishBOS(candles, swingPoints);
    } else if (currentTrend === 'downtrend') {
        // In downtrend, MSS = first bullish BOS
        return detectBullishBOS(candles, swingPoints);
    }
    return null;
}

/**
 * Determine current trend from swing points
 */
export function determineTrend(swingPoints) {
    const { highs, lows } = swingPoints;

    if (highs.length < 2 || lows.length < 2) return 'ranging';

    const lastHighs = highs.slice(-2);
    const lastLows = lows.slice(-2);

    const higherHighs = lastHighs[1].price > lastHighs[0].price;
    const higherLows = lastLows[1].price > lastLows[0].price;
    const lowerHighs = lastHighs[1].price < lastHighs[0].price;
    const lowerLows = lastLows[1].price < lastLows[0].price;

    if (higherHighs && higherLows) return 'uptrend';
    if (lowerHighs && lowerLows) return 'downtrend';
    return 'ranging';
}

// ============================================================
// SECTION 4: FAIR VALUE GAP (FVG)
// ============================================================

/**
 * Detect FVG at specific index
 * Definition: Gap between Candle1 High and Candle3 Low
 */
export function detectFVG(candles, i) {
    if (i < 2) return null;

    const c1 = candles[i - 2]; // First candle
    const c2 = candles[i - 1]; // Middle candle (the impulsive move)
    const c3 = candles[i];     // Third candle

    // Bullish FVG: C3.low > C1.high (gap up)
    if (c3.low > c1.high) {
        const gapSize = c3.low - c1.high;
        const gapPercent = (gapSize / c1.high) * 100;

        // Minimum gap threshold (0.1%)
        if (gapPercent < 0.1) return null;

        return {
            type: 'bullish',
            high: c3.low,
            low: c1.high,
            gapSize,
            gapPercent,
            startTime: c1.time,
            endTime: c3.time,
            middleCandle: c2,
            filled: false
        };
    }

    // Bearish FVG: C3.high < C1.low (gap down)
    if (c3.high < c1.low) {
        const gapSize = c1.low - c3.high;
        const gapPercent = (gapSize / c1.low) * 100;

        if (gapPercent < 0.1) return null;

        return {
            type: 'bearish',
            high: c1.low,
            low: c3.high,
            gapSize,
            gapPercent,
            startTime: c1.time,
            endTime: c3.time,
            middleCandle: c2,
            filled: false
        };
    }

    return null;
}

/**
 * Find all FVGs in candle data
 */
export function findAllFVGs(candles) {
    const fvgs = [];

    for (let i = 2; i < candles.length; i++) {
        const fvg = detectFVG(candles, i);
        if (fvg) {
            fvg.index = i;
            fvgs.push(fvg);
        }
    }

    return fvgs;
}

// ============================================================
// SECTION 5: ORDER BLOCK (Strict Definition)
// ============================================================

/**
 * Find Order Block
 * Definition: Last opposing candle before BOS/MSS + must have FVG
 */
export function findOrderBlock(candles, bosEvent, fvgs) {
    if (!bosEvent) return null;

    const bosIndex = bosEvent.breakIndex;
    const bosType = bosEvent.type;

    // Look for the last opposing candle before the BOS
    for (let i = bosIndex - 1; i >= Math.max(0, bosIndex - 10); i--) {
        const candle = candles[i];
        const isBearishCandle = candle.close < candle.open;
        const isBullishCandle = candle.close > candle.open;

        // For Bullish OB: Last bearish candle before bullish move
        if (bosType === 'bullish' && isBearishCandle) {
            // Check if there's an FVG near this candle
            const hasFVG = fvgs.some(fvg =>
                fvg.type === 'bullish' &&
                fvg.index >= i && fvg.index <= bosIndex
            );

            // Calculate strength (body size relative to range)
            const bodySize = Math.abs(candle.close - candle.open);
            const range = candle.high - candle.low;
            const strength = range > 0 ? (bodySize / range) * 100 : 0;

            return {
                type: 'bullish',
                high: candle.high,
                low: candle.low,
                time: candle.time,
                index: i,
                hasFVG,
                strength,
                bosEvent,
                status: 'active',
                mitigated: false
            };
        }

        // For Bearish OB: Last bullish candle before bearish move
        if (bosType === 'bearish' && isBullishCandle) {
            const hasFVG = fvgs.some(fvg =>
                fvg.type === 'bearish' &&
                fvg.index >= i && fvg.index <= bosIndex
            );

            const bodySize = Math.abs(candle.close - candle.open);
            const range = candle.high - candle.low;
            const strength = range > 0 ? (bodySize / range) * 100 : 0;

            return {
                type: 'bearish',
                high: candle.high,
                low: candle.low,
                time: candle.time,
                index: i,
                hasFVG,
                strength,
                bosEvent,
                status: 'active',
                mitigated: false
            };
        }
    }

    return null;
}

/**
 * Find all Order Blocks
 */
export function findAllOrderBlocks(candles, bosEvents, fvgs) {
    const orderBlocks = [];

    for (const bos of bosEvents) {
        const ob = findOrderBlock(candles, bos, fvgs);
        if (ob) {
            ob.id = `ob_${ob.time}_${ob.type}`;
            orderBlocks.push(ob);
        }
    }

    return orderBlocks;
}

// ============================================================
// SECTION 6: BREAKER BLOCK
// ============================================================

/**
 * Find Breaker Block
 * Definition: Valid Order Block broken by strong body close
 * (Support becomes Resistance / Resistance becomes Support)
 */
export function findBreakerBlocks(candles, orderBlocks) {
    const breakerBlocks = [];

    for (const ob of orderBlocks) {
        if (ob.mitigated) continue;

        // Look for price returning to OB and breaking through
        for (let i = ob.index + 5; i < candles.length; i++) {
            const candle = candles[i];

            if (ob.type === 'bullish') {
                // Bullish OB broken = Bearish Breaker
                // Price must close below the OB low
                if (candle.close < ob.low) {
                    breakerBlocks.push({
                        type: 'bearish_breaker',
                        originalOB: ob,
                        high: ob.high,
                        low: ob.low,
                        breakTime: candle.time,
                        breakIndex: i,
                        // Now this zone acts as resistance
                        entryZone: { high: ob.high, low: ob.low },
                        direction: 'short'
                    });
                    ob.mitigated = true;
                    break;
                }
            } else {
                // Bearish OB broken = Bullish Breaker
                if (candle.close > ob.high) {
                    breakerBlocks.push({
                        type: 'bullish_breaker',
                        originalOB: ob,
                        high: ob.high,
                        low: ob.low,
                        breakTime: candle.time,
                        breakIndex: i,
                        entryZone: { high: ob.high, low: ob.low },
                        direction: 'long'
                    });
                    ob.mitigated = true;
                    break;
                }
            }
        }
    }

    return breakerBlocks;
}

// ============================================================
// SECTION 7: MITIGATION BLOCK
// ============================================================

/**
 * Find Mitigation Block
 * Definition: Similar to Breaker but from failure swing (HL/LH) without liquidity sweep
 */
export function findMitigationBlocks(candles, swingPoints) {
    const mitigationBlocks = [];
    const { highs, lows } = swingPoints;

    // Look for Higher Lows (potential bullish mitigation)
    for (let i = 1; i < lows.length; i++) {
        if (lows[i].price > lows[i - 1].price) {
            // Higher Low detected - find the candle creating this structure
            const hlCandle = candles[lows[i].index];

            mitigationBlocks.push({
                type: 'bullish_mitigation',
                high: hlCandle.high,
                low: hlCandle.low,
                time: hlCandle.time,
                index: lows[i].index,
                swingType: 'higher_low',
                direction: 'long'
            });
        }
    }

    // Look for Lower Highs (potential bearish mitigation)
    for (let i = 1; i < highs.length; i++) {
        if (highs[i].price < highs[i - 1].price) {
            const lhCandle = candles[highs[i].index];

            mitigationBlocks.push({
                type: 'bearish_mitigation',
                high: lhCandle.high,
                low: lhCandle.low,
                time: lhCandle.time,
                index: highs[i].index,
                swingType: 'lower_high',
                direction: 'short'
            });
        }
    }

    return mitigationBlocks;
}

// ============================================================
// SECTION 8: MEMORY SYSTEM
// ============================================================

/**
 * SignalEngineV3 Memory Class
 * Maintains persistent state across updates
 */
export class SignalMemory {
    constructor() {
        this.swingHighs = [];
        this.swingLows = [];
        this.activeZones = [];
        this.bosHistory = [];
        this.invalidatedZones = [];
    }

    update(candles) {
        const swings = findSwingPoints(candles);
        this.swingHighs = swings.highs;
        this.swingLows = swings.lows;

        const fvgs = findAllFVGs(candles);
        const bosEvents = findAllBOS(candles, swings);
        const orderBlocks = findAllOrderBlocks(candles, bosEvents, fvgs);
        const breakerBlocks = findBreakerBlocks(candles, orderBlocks);
        const mitigationBlocks = findMitigationBlocks(candles, swings);

        this.activeZones = [
            ...orderBlocks.filter(ob => !ob.mitigated && ob.status === 'active'),
            ...breakerBlocks,
            ...mitigationBlocks
        ];

        this.bosHistory = bosEvents;

        return {
            swings,
            fvgs,
            bosEvents,
            orderBlocks,
            breakerBlocks,
            mitigationBlocks,
            trend: determineTrend(swings)
        };
    }

    checkZoneValidity(zone, currentPrice) {
        // Ghost Mode: Invalidate zone if SL violated
        if (zone.direction === 'long') {
            if (currentPrice < zone.low * 0.99) { // 1% below zone
                return { status: 'INVALID', reason: 'Price broke below zone' };
            }
        } else if (zone.direction === 'short') {
            if (currentPrice > zone.high * 1.01) { // 1% above zone
                return { status: 'INVALID', reason: 'Price broke above zone' };
            }
        }
        return { status: 'ACTIVE' };
    }

    invalidateZone(zoneId) {
        const zone = this.activeZones.find(z => z.id === zoneId);
        if (zone) {
            zone.status = 'INVALID';
            zone.invalidatedAt = Date.now();
            zone.retainUntil = Date.now() + 10 * 60 * 1000; // Retain for 10 candles (approx)
            this.invalidatedZones.push(zone);
            this.activeZones = this.activeZones.filter(z => z.id !== zoneId);
        }
    }
}

// ============================================================
// SECTION 9: DEBUG LAYER
// ============================================================

/**
 * Generate debug visualization data for swing points
 * Returns array of markers to display on chart
 */
export function generateSwingDebugMarkers(swingPoints) {
    const markers = [];

    for (const high of swingPoints.highs) {
        markers.push({
            time: high.time,
            position: 'aboveBar',
            color: '#22c55e',
            shape: 'circle',
            text: 'SH',
            size: 1
        });
    }

    for (const low of swingPoints.lows) {
        markers.push({
            time: low.time,
            position: 'belowBar',
            color: '#ef4444',
            shape: 'circle',
            text: 'SL',
            size: 1
        });
    }

    return markers;
}

/**
 * Generate BOS debug markers
 */
export function generateBOSDebugMarkers(bosEvents) {
    return bosEvents.map(bos => ({
        time: bos.breakTime,
        position: bos.type === 'bullish' ? 'aboveBar' : 'belowBar',
        color: bos.type === 'bullish' ? '#3b82f6' : '#f97316',
        shape: 'arrowUp',
        text: bos.type === 'bullish' ? 'BOS↑' : 'BOS↓',
        size: 2
    }));
}

// ============================================================
// SECTION 10: MAIN ANALYSIS FUNCTION
// ============================================================

/**
 * Run complete V3 analysis on candle data
 */
export function analyzeV3(candles) {
    if (!candles || candles.length < 10) {
        return { error: 'Insufficient data' };
    }

    const memory = new SignalMemory();
    const analysis = memory.update(candles);

    return {
        ...analysis,
        memory,
        debugMarkers: {
            swings: generateSwingDebugMarkers(analysis.swings),
            bos: generateBOSDebugMarkers(analysis.bosEvents)
        }
    };
}

export default {
    analyzeV3,
    SignalMemory,
    findSwingPoints,
    findAllBOS,
    findAllFVGs,
    findAllOrderBlocks,
    findBreakerBlocks,
    findMitigationBlocks,
    determineTrend
};
