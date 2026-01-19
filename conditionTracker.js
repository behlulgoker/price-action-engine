/**
 * Condition Tracker Module v2 - Universal Visual Protocol
 * 
 * Supports multiple visual elements per condition with mentor-style graphics
 * Element types: ZONE, LINE, ARROW, MARKER, TEXT
 * Styles: SOLID, DASHED, PULSING, GLOW, NEON
 */

export const CONDITION_STATUS = {
    MET: 'met',
    PENDING: 'pending',
    FAILED: 'failed'
};

export const ELEMENT_TYPE = {
    ZONE: 'ZONE',       // Rectangle/box
    LINE: 'LINE',       // Horizontal or trigger line
    ARROW: 'ARROW',     // Direction indicator
    MARKER: 'MARKER',   // Point marker on candle
    TEXT: 'TEXT'        // Annotation text
};

export const ELEMENT_STYLE = {
    SOLID: 'SOLID',
    DASHED: 'DASHED',
    PULSING: 'PULSING',   // Animated pulsing
    GLOW: 'GLOW',         // Neon glow effect
    GRADIENT: 'GRADIENT'
};

// Neon color palette for mentor-style visuals
export const NEON_COLORS = {
    PURPLE: 'rgba(139, 92, 246, 0.6)',
    CYAN: 'rgba(34, 211, 238, 0.6)',
    PINK: 'rgba(236, 72, 153, 0.6)',
    GREEN: 'rgba(34, 197, 94, 0.6)',
    ORANGE: 'rgba(249, 115, 22, 0.6)',
    YELLOW: 'rgba(250, 204, 21, 0.6)',
    RED: 'rgba(239, 68, 68, 0.6)'
};

/**
 * Generate visualMeta for a condition based on its type and context
 * MENTOR-STYLE: Educational labels that explain exactly what to look for
 */
function generateVisualMeta(checkerType, context, result) {
    const { zone, candles, currentPrice, setupDirection } = context;
    const lastCandle = candles?.[candles.length - 1];
    const lastIndex = candles?.length - 1 || 0;

    // Direction-based colors and labels
    const isLong = setupDirection === 'long';
    const dirColor = isLong ? NEON_COLORS.GREEN : NEON_COLORS.RED;
    const dirLabel = isLong ? 'LONG' : 'SHORT';
    const entryPrice = isLong ? zone?.low : zone?.high;

    switch (checkerType) {
        case 'zone_touch':
            return {
                tooltip: isLong
                    ? '📍 Fiyat yeşil zone\'a GERİ ÇEKİLMELİ. Dokunduğunda entry sinyali arayın!'
                    : '📍 Fiyat kırmızı zone\'a YÜKSELMELI. Dokunduğunda short sinyali arayın!',
                focusIndex: lastIndex,
                focusPrice: entryPrice,
                elements: [
                    {
                        type: ELEMENT_TYPE.ZONE,
                        y1: zone?.high || 0,
                        y2: zone?.low || 0,
                        x1_index: Math.max(0, lastIndex - 50),
                        x2_index: 'FUTURE',
                        color: dirColor,
                        label: `🎯 ${dirLabel} ENTRY ZONE`,
                        style: result.status === 'met' ? ELEMENT_STYLE.GLOW : ELEMENT_STYLE.PULSING
                    },
                    {
                        type: ELEMENT_TYPE.LINE,
                        price: entryPrice || 0,
                        style: ELEMENT_STYLE.PULSING,
                        color: dirColor,
                        label: isLong
                            ? `👆 WAIT FOR PRICE TO TOUCH HERE ($${entryPrice?.toFixed(0)})`
                            : `👇 WAIT FOR PRICE TO TOUCH HERE ($${entryPrice?.toFixed(0)})`
                    },
                    {
                        type: ELEMENT_TYPE.TEXT,
                        x_index: lastIndex - 5,
                        y_price: isLong ? (zone?.low * 0.998) : (zone?.high * 1.002),
                        text: isLong ? '⬆️ ENTRY LEVEL - Look for Rejection Here' : '⬇️ ENTRY LEVEL - Look for Rejection Here',
                        color: dirColor,
                        style: ELEMENT_STYLE.GLOW
                    },
                    {
                        type: ELEMENT_TYPE.ARROW,
                        index: lastIndex,
                        direction: isLong ? 'down' : 'up',
                        color: NEON_COLORS.CYAN,
                        label: isLong ? 'Price Must Pull Back' : 'Price Must Rally Up'
                    }
                ]
            };

        case 'rejection_candle':
            return {
                tooltip: isLong
                    ? '🕯️ Zone içinde BULLISH rejection (pin bar/engulfing) bekleniyor!'
                    : '🕯️ Zone içinde BEARISH rejection (pin bar/engulfing) bekleniyor!',
                focusIndex: result.candleIndex || lastIndex,
                focusPrice: zone?.low,
                elements: [
                    {
                        type: ELEMENT_TYPE.ZONE,
                        y1: zone?.high || 0,
                        y2: zone?.low || 0,
                        x1_index: Math.max(0, lastIndex - 20),
                        x2_index: lastIndex + 5,
                        color: dirColor,
                        label: `👁️ ${dirLabel}: LOOK FOR PIN BAR / ENGULFING HERE`,
                        style: ELEMENT_STYLE.PULSING
                    },
                    result.status === 'met' && result.candleIndex ? {
                        type: ELEMENT_TYPE.MARKER,
                        index: result.candleIndex,
                        price: isLong ? candles?.[result.candleIndex]?.low : candles?.[result.candleIndex]?.high,
                        color: NEON_COLORS.GREEN,
                        icon: '✅',
                        label: '🎉 Rejection = Entry Signal!'
                    } : {
                        type: ELEMENT_TYPE.TEXT,
                        x_index: lastIndex,
                        y_price: isLong ? (zone?.low * 0.998) : (zone?.high * 1.002),
                        text: '⏳ Waiting for Rejection Candle...',
                        color: NEON_COLORS.YELLOW,
                        style: ELEMENT_STYLE.PULSING
                    }
                ].filter(Boolean)
            };

        case 'volume_spike':
            return {
                tooltip: '📊 Volume ortalamanın 150% üstüne çıkmalı. Güçlü hareket konfirmasyonu.',
                focusIndex: lastIndex,
                focusPrice: lastCandle?.close,
                elements: [
                    {
                        type: ELEMENT_TYPE.TEXT,
                        x_index: lastIndex,
                        y_price: lastCandle?.high || 0,
                        text: result.status === 'met'
                            ? `📊 VOLUME SPIKE: ${result.value?.toFixed(0)} (${((result.value / result.average) * 100).toFixed(0)}%)`
                            : '📊 Waiting for Volume Spike...',
                        color: result.status === 'met' ? NEON_COLORS.GREEN : NEON_COLORS.YELLOW,
                        style: result.status === 'met' ? ELEMENT_STYLE.GLOW : ELEMENT_STYLE.SOLID
                    },
                    {
                        type: ELEMENT_TYPE.LINE,
                        price: lastCandle?.low * 0.99 || 0,
                        style: ELEMENT_STYLE.DASHED,
                        color: NEON_COLORS.PURPLE,
                        label: 'Volume Indicator'
                    }
                ]
            };

        case 'rsi_oversold_exit':
        case 'rsi_overbought_exit':
            const isOversold = checkerType === 'rsi_oversold_exit';
            return {
                tooltip: isOversold
                    ? '📈 RSI 30 altından yukarı kırmalı (oversold çıkış)'
                    : '📉 RSI 70 üstünden aşağı kırmalı (overbought çıkış)',
                elements: [
                    {
                        type: ELEMENT_TYPE.TEXT,
                        x_index: lastIndex,
                        y_price: lastCandle?.close || 0,
                        text: `RSI: ${result.value?.toFixed(1) || '?'}`,
                        color: result.status === 'met' ? NEON_COLORS.GREEN : NEON_COLORS.YELLOW,
                        style: ELEMENT_STYLE.GLOW
                    },
                    {
                        type: ELEMENT_TYPE.LINE,
                        price: lastCandle?.close || 0,
                        style: ELEMENT_STYLE.PULSING,
                        color: isOversold ? NEON_COLORS.GREEN : NEON_COLORS.RED,
                        label: isOversold ? 'RSI Oversold Exit' : 'RSI Overbought Exit'
                    }
                ]
            };

        case 'body_close_in_zone':
            return {
                tooltip: '🕯️ Mumun gövdesi (body) zone içinde kapanmalı. Wick değil, close fiyatı önemli.',
                elements: [
                    {
                        type: ELEMENT_TYPE.ZONE,
                        y1: zone?.high || 0,
                        y2: zone?.low || 0,
                        x1_index: Math.max(0, lastIndex - 30),
                        x2_index: 'FUTURE',
                        color: NEON_COLORS.CYAN,
                        label: '📍 Body Close Zone',
                        style: ELEMENT_STYLE.PULSING
                    },
                    {
                        type: ELEMENT_TYPE.LINE,
                        price: lastCandle?.close || 0,
                        style: ELEMENT_STYLE.GLOW,
                        color: result.status === 'met' ? NEON_COLORS.GREEN : NEON_COLORS.YELLOW,
                        label: `Close: $${lastCandle?.close?.toFixed(0) || '?'}`
                    }
                ]
            };

        case 'htf_trend_alignment':
            return {
                tooltip: '📊 Yüksek zaman dilimi (HTF) trend yönü ile uyumlu olmalı.',
                elements: [
                    {
                        type: ELEMENT_TYPE.ARROW,
                        index: lastIndex - 10,
                        direction: context.trend === 'uptrend' ? 'up' : 'down',
                        color: result.status === 'met' ? NEON_COLORS.GREEN :
                            result.status === 'failed' ? NEON_COLORS.RED : NEON_COLORS.YELLOW,
                        label: `HTF Trend: ${context.trend?.toUpperCase() || 'UNKNOWN'}`,
                        size: 'large'
                    },
                    {
                        type: ELEMENT_TYPE.TEXT,
                        x_index: lastIndex - 5,
                        y_price: lastCandle?.high * 1.01 || 0,
                        text: result.status === 'met' ? '✅ HTF Aligned' :
                            result.status === 'failed' ? '❌ HTF Conflict' : '⏳ HTF Check',
                        color: result.status === 'met' ? NEON_COLORS.GREEN :
                            result.status === 'failed' ? NEON_COLORS.RED : NEON_COLORS.YELLOW,
                        style: ELEMENT_STYLE.GLOW
                    }
                ]
            };

        case 'sweep_candle':
            return {
                tooltip: '⚡ Wick ile liquidity sweep yapılmalı. Gövde seviyenin üstünde kalmalı.',
                elements: [
                    {
                        type: ELEMENT_TYPE.LINE,
                        price: context.level || zone?.low || 0,
                        style: ELEMENT_STYLE.PULSING,
                        color: NEON_COLORS.PINK,
                        label: '💧 Liquidity Level'
                    },
                    {
                        type: ELEMENT_TYPE.ZONE,
                        y1: (context.level || zone?.low || 0) * 1.001,
                        y2: (context.level || zone?.low || 0) * 0.999,
                        x1_index: Math.max(0, lastIndex - 20),
                        x2_index: 'FUTURE',
                        color: NEON_COLORS.PINK,
                        label: 'Sweep Target',
                        style: ELEMENT_STYLE.GLOW
                    },
                    result.status === 'met' ? {
                        type: ELEMENT_TYPE.MARKER,
                        index: result.candleIndex || lastIndex,
                        price: context.level || zone?.low || 0,
                        color: NEON_COLORS.GREEN,
                        icon: '⚡',
                        label: 'SWEPT!'
                    } : null
                ].filter(Boolean)
            };

        default:
            return {
                tooltip: 'Manuel doğrulama gerekli.',
                elements: [
                    {
                        type: ELEMENT_TYPE.MARKER,
                        index: lastIndex,
                        price: currentPrice || lastCandle?.close || 0,
                        color: NEON_COLORS.YELLOW,
                        icon: '❓',
                        label: 'Check Manually'
                    }
                ]
            };
    }
}

/**
 * Condition Checkers with visualMeta generation
 */
const conditionCheckers = {
    'zone_touch': (context) => {
        const { currentPrice, zone } = context;
        let result;

        if (currentPrice >= zone.low && currentPrice <= zone.high) {
            result = { status: CONDITION_STATUS.MET, message: 'Fiyat zone içinde', candleIndex: -1 };
        } else if (currentPrice > zone.high) {
            result = { status: CONDITION_STATUS.PENDING, message: 'Zone altında bekleniyor' };
        } else if (currentPrice < zone.low) {
            result = { status: CONDITION_STATUS.FAILED, message: 'Zone atlandı' };
        } else {
            result = { status: CONDITION_STATUS.PENDING };
        }

        result.visualMeta = generateVisualMeta('zone_touch', context, result);
        return result;
    },

    'rejection_candle': (context) => {
        const { candles, zone } = context;
        const last3 = candles.slice(-3);
        let result = { status: CONDITION_STATUS.PENDING, message: 'Rejection candle bekleniyor' };

        for (let i = 0; i < last3.length; i++) {
            const candle = last3[i];
            const bodySize = Math.abs(candle.close - candle.open);
            const range = candle.high - candle.low;
            const wickRatio = range > 0 ? bodySize / range : 0;

            if (wickRatio < 0.3 && range > 0) {
                const isInZone = candle.low <= zone.high && candle.high >= zone.low;
                if (isInZone) {
                    result = {
                        status: CONDITION_STATUS.MET,
                        message: 'Rejection candle (pin bar) tespit edildi',
                        candleIndex: candles.length - 3 + i,
                        candleTime: candle.time
                    };
                    break;
                }
            }

            if (i > 0) {
                const prev = last3[i - 1];
                const isBullishEngulfing = prev.close < prev.open &&
                    candle.close > candle.open &&
                    candle.close > prev.open &&
                    candle.open < prev.close;
                if (isBullishEngulfing && zone.type === 'bullish') {
                    result = {
                        status: CONDITION_STATUS.MET,
                        message: 'Bullish Engulfing tespit edildi',
                        candleIndex: candles.length - 3 + i,
                        candleTime: candle.time
                    };
                    break;
                }
            }
        }

        result.visualMeta = generateVisualMeta('rejection_candle', context, result);
        return result;
    },

    'volume_spike': (context) => {
        const { candles, threshold = 1.5 } = context;
        let result;

        if (candles.length < 20) {
            result = { status: CONDITION_STATUS.PENDING };
        } else {
            const last20 = candles.slice(-20);
            const avgVolume = last20.reduce((sum, c) => sum + (c.volume || 0), 0) / 20;
            const currentVolume = candles[candles.length - 1].volume || 0;

            if (currentVolume > avgVolume * threshold) {
                const spikePercent = ((currentVolume / avgVolume) * 100).toFixed(0);
                result = {
                    status: CONDITION_STATUS.MET,
                    message: `Volume spike: ${spikePercent}% ortalama üstü`,
                    candleIndex: candles.length - 1,
                    indicator: 'volume',
                    value: currentVolume,
                    average: avgVolume
                };
            } else {
                result = {
                    status: CONDITION_STATUS.PENDING,
                    message: 'Volume artışı bekleniyor',
                    indicator: 'volume',
                    value: currentVolume,
                    average: avgVolume
                };
            }
        }

        result.visualMeta = generateVisualMeta('volume_spike', context, result);
        return result;
    },

    'rsi_oversold_exit': (context) => {
        const { candles, period = 14 } = context;
        const rsiValues = calculateRSI(candles, period);
        let result;

        if (rsiValues.length < 2) {
            result = { status: CONDITION_STATUS.PENDING };
        } else {
            const currentRSI = rsiValues[rsiValues.length - 1];
            const prevRSI = rsiValues[rsiValues.length - 2];

            if (prevRSI < 30 && currentRSI >= 30) {
                result = {
                    status: CONDITION_STATUS.MET,
                    message: `RSI oversold çıkışı (${currentRSI.toFixed(1)})`,
                    indicator: 'rsi',
                    value: currentRSI
                };
            } else if (currentRSI < 30) {
                result = {
                    status: CONDITION_STATUS.PENDING,
                    message: `RSI oversold bölgede (${currentRSI.toFixed(1)})`,
                    indicator: 'rsi',
                    value: currentRSI
                };
            } else {
                result = {
                    status: CONDITION_STATUS.PENDING,
                    message: 'RSI oversold bekleniyor',
                    value: currentRSI
                };
            }
        }

        result.visualMeta = generateVisualMeta('rsi_oversold_exit', context, result);
        return result;
    },

    'rsi_overbought_exit': (context) => {
        const { candles, period = 14 } = context;
        const rsiValues = calculateRSI(candles, period);
        let result;

        if (rsiValues.length < 2) {
            result = { status: CONDITION_STATUS.PENDING };
        } else {
            const currentRSI = rsiValues[rsiValues.length - 1];
            const prevRSI = rsiValues[rsiValues.length - 2];

            if (prevRSI > 70 && currentRSI <= 70) {
                result = {
                    status: CONDITION_STATUS.MET,
                    message: `RSI overbought çıkışı (${currentRSI.toFixed(1)})`,
                    indicator: 'rsi',
                    value: currentRSI
                };
            } else {
                result = { status: CONDITION_STATUS.PENDING, value: currentRSI };
            }
        }

        result.visualMeta = generateVisualMeta('rsi_overbought_exit', context, result);
        return result;
    },

    'body_close_in_zone': (context) => {
        const { candles, zone } = context;
        const lastCandle = candles[candles.length - 1];
        let result;

        if (lastCandle.close >= zone.low && lastCandle.close <= zone.high) {
            result = {
                status: CONDITION_STATUS.MET,
                message: 'Body close zone içinde',
                candleIndex: candles.length - 1
            };
        } else {
            result = { status: CONDITION_STATUS.PENDING, message: 'Body close bekleniyor' };
        }

        result.visualMeta = generateVisualMeta('body_close_in_zone', context, result);
        return result;
    },

    'htf_trend_alignment': (context) => {
        const { trend, setupDirection } = context;
        let result;

        if ((setupDirection === 'long' && trend === 'uptrend') ||
            (setupDirection === 'short' && trend === 'downtrend')) {
            result = {
                status: CONDITION_STATUS.MET,
                message: `HTF trend uyumlu (${trend})`
            };
        } else if (trend === 'ranging') {
            result = {
                status: CONDITION_STATUS.PENDING,
                message: 'HTF trend belirsiz (ranging)'
            };
        } else {
            result = {
                status: CONDITION_STATUS.FAILED,
                message: `HTF trend karşıt (${trend})`
            };
        }

        result.visualMeta = generateVisualMeta('htf_trend_alignment', context, result);
        return result;
    },

    'sweep_candle': (context) => {
        const { candles, level, direction, zone } = context;
        const lastCandle = candles[candles.length - 1];
        const sweepLevel = level || zone?.low;
        let result;

        if (direction === 'bullish' || context.setupDirection === 'long') {
            if (lastCandle.low < sweepLevel && Math.min(lastCandle.open, lastCandle.close) > sweepLevel) {
                result = {
                    status: CONDITION_STATUS.MET,
                    message: 'Sweep tamamlandı (wick sweep)',
                    candleIndex: candles.length - 1
                };
            } else {
                result = { status: CONDITION_STATUS.PENDING, message: 'Sweep bekleniyor' };
            }
        } else {
            if (lastCandle.high > sweepLevel && Math.max(lastCandle.open, lastCandle.close) < sweepLevel) {
                result = {
                    status: CONDITION_STATUS.MET,
                    message: 'Sweep tamamlandı (wick sweep)',
                    candleIndex: candles.length - 1
                };
            } else {
                result = { status: CONDITION_STATUS.PENDING, message: 'Sweep bekleniyor' };
            }
        }

        result.visualMeta = generateVisualMeta('sweep_candle', { ...context, level: sweepLevel }, result);
        return result;
    }
};

/**
 * Calculate RSI
 */
function calculateRSI(candles, period = 14) {
    if (candles.length < period + 1) return [];

    const rsiValues = [];
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
        const change = candles[i].close - candles[i - 1].close;
        if (change > 0) gains += change;
        else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiValues.push(100 - (100 / (1 + rs)));

    for (let i = period + 1; i < candles.length; i++) {
        const change = candles[i].close - candles[i - 1].close;
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? -change : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsiValues.push(100 - (100 / (1 + rs)));
    }

    return rsiValues;
}

/**
 * Condition Tracker Class
 */
export class ConditionTracker {
    constructor(setup) {
        this.setup = setup;
        this.conditions = this.parseConditions(setup.confirmations || []);
        this.results = [];
    }

    parseConditions(confirmations) {
        return confirmations.map((text, index) => {
            let checkerType = 'unknown';

            if (text.includes('zone') || text.includes('sınır') || text.includes('dokunma') || text.includes('dönmeli')) {
                checkerType = 'zone_touch';
            } else if (text.includes('rejection') || text.includes('engulfing') || text.includes('pin bar')) {
                checkerType = 'rejection_candle';
            } else if (text.includes('volume') || text.includes('hacim')) {
                checkerType = 'volume_spike';
            } else if (text.includes('RSI') || text.includes('oversold')) {
                checkerType = 'rsi_oversold_exit';
            } else if (text.includes('overbought')) {
                checkerType = 'rsi_overbought_exit';
            } else if (text.includes('body') || text.includes('kapan')) {
                checkerType = 'body_close_in_zone';
            } else if (text.includes('HTF') || text.includes('trend uyum')) {
                checkerType = 'htf_trend_alignment';
            } else if (text.includes('sweep') || text.includes('wick')) {
                checkerType = 'sweep_candle';
            }

            return {
                id: `cond_${index}`,
                text,
                checkerType,
                status: CONDITION_STATUS.PENDING,
                result: null,
                visualMeta: null
            };
        });
    }

    checkAll(context) {
        this.results = this.conditions.map(condition => {
            const checker = conditionCheckers[condition.checkerType];

            if (!checker) {
                const defaultResult = {
                    status: CONDITION_STATUS.PENDING,
                    message: 'Manuel doğrulama gerekli',
                    visualMeta: generateVisualMeta('unknown', context, { status: CONDITION_STATUS.PENDING })
                };
                return {
                    ...condition,
                    status: defaultResult.status,
                    result: defaultResult,
                    visualMeta: defaultResult.visualMeta
                };
            }

            const result = checker({
                ...context,
                zone: {
                    type: this.setup.direction === 'long' ? 'bullish' : 'bearish',
                    high: this.setup.entry?.[1] || this.setup.referenceZones?.[0]?.high,
                    low: this.setup.entry?.[0] || this.setup.referenceZones?.[0]?.low
                },
                setupDirection: this.setup.direction
            });

            return {
                ...condition,
                status: result.status,
                result,
                visualMeta: result.visualMeta
            };
        });

        return this.results;
    }

    getStatusSummary() {
        const met = this.results.filter(r => r.status === CONDITION_STATUS.MET).length;
        const pending = this.results.filter(r => r.status === CONDITION_STATUS.PENDING).length;
        const failed = this.results.filter(r => r.status === CONDITION_STATUS.FAILED).length;
        return { met, pending, failed, total: this.results.length };
    }

    shouldAlert() {
        const summary = this.getStatusSummary();
        return summary.met === summary.total && summary.total > 0;
    }
}

export function getStatusIcon(status) {
    switch (status) {
        case CONDITION_STATUS.MET: return '✅';
        case CONDITION_STATUS.PENDING: return '⏳';
        case CONDITION_STATUS.FAILED: return '❌';
        default: return '❔';
    }
}

export function getStatusColor(status) {
    switch (status) {
        case CONDITION_STATUS.MET: return '#22c55e';
        case CONDITION_STATUS.PENDING: return '#eab308';
        case CONDITION_STATUS.FAILED: return '#ef4444';
        default: return '#6b7280';
    }
}

export default {
    ConditionTracker,
    CONDITION_STATUS,
    ELEMENT_TYPE,
    ELEMENT_STYLE,
    NEON_COLORS,
    getStatusIcon,
    getStatusColor,
    calculateRSI
};
