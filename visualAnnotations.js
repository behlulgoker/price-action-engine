/**
 * Visual Annotations Module v2 - Universal Visual Protocol Renderer
 * 
 * Renders multiple visual elements per condition with mentor-style graphics
 * Supports: ZONE, LINE, ARROW, MARKER, TEXT with PULSING, GLOW effects
 */

const ELEMENT_STYLE = {
    PULSING: 'PULSING',
    GLOW: 'GLOW',
    DASHED: 'DASHED',
    SOLID: 'SOLID'
};

const NEON_COLORS = {
    CYAN: '#00ffff',
    GREEN: '#22c55e',
    RED: '#ef4444',
    PURPLE: '#a855f7',
    YELLOW: '#eab308'
};

// Animation timing for pulsing effects

// Animation timing for pulsing effects
let animationFrame = 0;
let animationInterval = null;

function startAnimation(callback) {
    if (animationInterval) return;
    animationInterval = setInterval(() => {
        animationFrame = (animationFrame + 1) % 60;
        callback();
    }, 33); // ~30fps
}

function stopAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
}

/**
 * Universal Visual Elements Renderer
 * Renders an array of visual elements from visualMeta
 */
export class UniversalVisualRenderer {
    constructor(candles, visualMeta, options = {}) {
        this._candles = candles;
        this._visualMeta = visualMeta;
        this._options = {
            showTooltip: options.showTooltip !== false,
            animatePulsing: options.animatePulsing !== false,
            ...options
        };
        this._primitives = [];
        this._paneViews = [new UniversalPaneView(this)];
        this._animationPhase = 0;
    }

    paneViews() { return this._paneViews; }

    attached({ chart, series, requestUpdate }) {
        this._chart = chart;
        this._series = series;
        this._requestUpdate = requestUpdate;

        // Start animation loop for pulsing effects
        if (this._options.animatePulsing && this.hasPulsingElements()) {
            startAnimation(() => {
                this._animationPhase = (this._animationPhase + 0.05) % (Math.PI * 2);
                if (this._requestUpdate) this._requestUpdate();
            });
        }
    }

    detached() {
        stopAnimation();
        this._chart = undefined;
        this._series = undefined;
        this._requestUpdate = undefined;
    }

    chart() { return this._chart; }
    series() { return this._series; }
    getCandles() { return this._candles; }
    getVisualMeta() { return this._visualMeta; }
    getOptions() { return this._options; }
    getAnimationPhase() { return this._animationPhase; }

    hasPulsingElements() {
        return this._visualMeta?.elements?.some(e => e.style === ELEMENT_STYLE?.PULSING);
    }
}

class UniversalPaneView {
    constructor(source) {
        this._source = source;
    }

    update() {
        // Coordinate updates happen in renderer
    }

    renderer() {
        return {
            draw: (target) => {
                const source = this._source;
                const chart = source.chart();
                const series = source.series();
                const candles = source.getCandles();
                const meta = source.getVisualMeta();

                if (!chart || !series || !meta?.elements) return;

                target.useBitmapCoordinateSpace(scope => {
                    const ctx = scope.context;
                    const { horizontalPixelRatio: hpr, verticalPixelRatio: vpr } = scope;
                    const timeScale = chart.timeScale();
                    const animPhase = source.getAnimationPhase();

                    ctx.save();

                    meta.elements.forEach(element => {
                        switch (element.type) {
                            case 'ZONE':
                                this.drawZone(ctx, element, candles, timeScale, series, hpr, vpr, animPhase, scope);
                                break;
                            case 'LINE':
                                this.drawLine(ctx, element, candles, timeScale, series, hpr, vpr, animPhase);
                                break;
                            case 'ARROW':
                                this.drawArrow(ctx, element, candles, timeScale, series, hpr, vpr, animPhase);
                                break;
                            case 'MARKER':
                                this.drawMarker(ctx, element, candles, timeScale, series, hpr, vpr, animPhase);
                                break;
                            case 'TEXT':
                                this.drawText(ctx, element, candles, timeScale, series, hpr, vpr, animPhase);
                                break;
                        }
                    });

                    // Draw tooltip if present
                    if (meta.tooltip && source.getOptions().showTooltip) {
                        this.drawTooltip(ctx, meta.tooltip, hpr);
                    }

                    ctx.restore();
                });
            }
        };
    }

    drawZone(ctx, element, candles, timeScale, series, hpr, vpr, animPhase, scope) {
        const y1 = series.priceToCoordinate(element.y1);
        const y2 = series.priceToCoordinate(element.y2);

        if (y1 === null || y2 === null) return;

        let x1, x2;

        // Handle x indices
        if (typeof element.x1_index === 'number' && candles[element.x1_index]) {
            x1 = timeScale.timeToCoordinate(candles[element.x1_index].time);
        } else {
            x1 = timeScale.timeToCoordinate(candles[Math.max(0, candles.length - 20)]?.time);
        }

        if (element.x2_index === 'FUTURE') {
            // Extend to right edge of visible area
            const visibleRange = timeScale.getVisibleLogicalRange();
            if (visibleRange) {
                x2 = scope?.bitmapSize?.width || (x1 + 500 * hpr);
            } else {
                x2 = x1 + 300 * hpr;
            }
        } else if (typeof element.x2_index === 'number' && candles[element.x2_index]) {
            x2 = timeScale.timeToCoordinate(candles[element.x2_index].time);
        } else {
            x2 = x1 + 200 * hpr;
        }

        if (x1 === null) return;

        const minX = Math.min(x1, x2 || x1 + 200) * hpr;
        const maxX = Math.max(x1, x2 || x1 + 200) * hpr;
        const minY = Math.min(y1, y2) * vpr;
        const maxY = Math.max(y1, y2) * vpr;

        // Pulsing effect
        let alpha = 1;
        if (element.style === 'PULSING') {
            alpha = 0.4 + Math.sin(animPhase) * 0.3;
        }

        ctx.globalAlpha = alpha;

        // Glow effect
        if (element.style === 'GLOW') {
            ctx.shadowColor = element.color;
            ctx.shadowBlur = 15 * hpr;
        }

        // Fill zone
        ctx.fillStyle = element.color || 'rgba(139, 92, 246, 0.3)';
        ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

        // Border
        ctx.strokeStyle = element.color?.replace('0.3)', '0.8)') || element.color;
        ctx.lineWidth = 2 * hpr;
        ctx.setLineDash(element.style === 'DASHED' ? [5 * hpr, 3 * hpr] : []);
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Label
        if (element.label) {
            const fontSize = 11 * hpr;
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            const textWidth = ctx.measureText(element.label).width;
            const padding = 4 * hpr;
            ctx.fillRect(minX + padding, minY + padding, textWidth + padding * 2, fontSize + padding);
            ctx.fillStyle = '#ffffff';
            ctx.textBaseline = 'top';
            ctx.fillText(element.label, minX + padding * 2, minY + padding * 1.5);
        }
    }

    drawLine(ctx, element, candles, timeScale, series, hpr, vpr, animPhase) {
        const y = series.priceToCoordinate(element.price);
        if (y === null) return;

        const visibleRange = timeScale.getVisibleLogicalRange();
        if (!visibleRange) return;

        // Get visible x range
        const startTime = candles[Math.max(0, candles.length - 50)]?.time;
        const endTime = candles[candles.length - 1]?.time;

        if (!startTime || !endTime) return;

        const x1 = timeScale.timeToCoordinate(startTime) * hpr;
        const x2 = (timeScale.timeToCoordinate(endTime) + 100) * hpr; // Extend to right

        const yCoord = y * vpr;

        // Pulsing effect
        let lineWidth = 2;
        if (element.style === 'PULSING') {
            lineWidth = 2 + Math.sin(animPhase * 2) * 1;
            ctx.shadowColor = element.color;
            ctx.shadowBlur = 10 + Math.sin(animPhase) * 5;
        }

        // Glow effect
        if (element.style === 'GLOW') {
            ctx.shadowColor = element.color;
            ctx.shadowBlur = 15 * hpr;
        }

        ctx.strokeStyle = element.color || NEON_COLORS?.CYAN || '#00ffff';
        ctx.lineWidth = lineWidth * hpr;

        if (element.style === 'DASHED' || element.style === 'PULSING') {
            ctx.setLineDash([10 * hpr, 5 * hpr]);
        }

        ctx.beginPath();
        ctx.moveTo(x1, yCoord);
        ctx.lineTo(x2, yCoord);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        // Label on right
        if (element.label) {
            const fontSize = 10 * hpr;
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.fillStyle = element.color || '#ffffff';
            ctx.textBaseline = 'middle';
            ctx.fillText(element.label, x2 - ctx.measureText(element.label).width - 10 * hpr, yCoord - 12 * hpr);
        }
    }

    drawArrow(ctx, element, candles, timeScale, series, hpr, vpr, animPhase) {
        const candle = candles[element.index];
        if (!candle) return;

        const x = timeScale.timeToCoordinate(candle.time);
        if (x === null) return;

        const xCoord = x * hpr;
        const basePrice = element.direction === 'up' ? candle.low : candle.high;
        const y = series.priceToCoordinate(basePrice);
        if (y === null) return;

        const yCoord = y * vpr;
        const arrowSize = (element.size === 'large' ? 25 : 15) * hpr;
        const direction = element.direction === 'up' ? -1 : 1;

        // Animate arrow
        const bounce = element.style === 'PULSING' ? Math.sin(animPhase * 3) * 5 * hpr : 0;

        ctx.fillStyle = element.color || NEON_COLORS?.GREEN || '#22c55e';
        ctx.shadowColor = element.color;
        ctx.shadowBlur = 10 * hpr;

        // Draw arrow
        ctx.beginPath();
        ctx.moveTo(xCoord, yCoord + (20 * direction + bounce) * hpr);
        ctx.lineTo(xCoord - arrowSize / 2, yCoord + (20 * direction + arrowSize * direction + bounce) * hpr);
        ctx.lineTo(xCoord + arrowSize / 2, yCoord + (20 * direction + arrowSize * direction + bounce) * hpr);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;

        // Label
        if (element.label) {
            const fontSize = 9 * hpr;
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.fillStyle = element.color || '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = direction === -1 ? 'bottom' : 'top';
            ctx.fillText(element.label, xCoord, yCoord + (30 * direction) * hpr);
        }
    }

    drawMarker(ctx, element, candles, timeScale, series, hpr, vpr, animPhase) {
        const candle = candles[element.index];
        if (!candle) return;

        const x = timeScale.timeToCoordinate(candle.time);
        const y = series.priceToCoordinate(element.price || candle.high);

        if (x === null || y === null) return;

        const xCoord = x * hpr;
        const yCoord = y * vpr - 20 * hpr;

        // Pulsing glow
        if (element.style !== 'SOLID') {
            ctx.shadowColor = element.color;
            ctx.shadowBlur = 15 + Math.sin(animPhase * 2) * 5;
        }

        // Draw circle marker
        ctx.fillStyle = element.color || NEON_COLORS?.GREEN || '#22c55e';
        ctx.beginPath();
        ctx.arc(xCoord, yCoord, 8 * hpr, 0, Math.PI * 2);
        ctx.fill();

        // Icon in center
        if (element.icon) {
            ctx.font = `${12 * hpr}px Arial`;
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(element.icon, xCoord, yCoord);
        }

        ctx.shadowBlur = 0;

        // Label
        if (element.label) {
            const fontSize = 9 * hpr;
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            const textWidth = ctx.measureText(element.label).width;
            ctx.fillRect(xCoord - textWidth / 2 - 4, yCoord - 25 * hpr, textWidth + 8, fontSize + 4);
            ctx.fillStyle = element.color || '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(element.label, xCoord, yCoord - 20 * hpr);
        }
    }

    drawText(ctx, element, candles, timeScale, series, hpr, vpr, animPhase) {
        const candle = candles[element.x_index];
        if (!candle) return;

        const x = timeScale.timeToCoordinate(candle.time);
        const y = series.priceToCoordinate(element.y_price);

        if (x === null || y === null) return;

        const xCoord = x * hpr;
        const yCoord = y * vpr;

        const fontSize = 11 * hpr;
        ctx.font = `bold ${fontSize}px Arial`;

        // Background
        const textWidth = ctx.measureText(element.text).width;
        const padding = 4 * hpr;

        if (element.style === 'GLOW') {
            ctx.shadowColor = element.color;
            ctx.shadowBlur = 10 * hpr;
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(xCoord - textWidth / 2 - padding, yCoord - fontSize / 2 - padding, textWidth + padding * 2, fontSize + padding * 2);

        ctx.fillStyle = element.color || '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(element.text, xCoord, yCoord);

        ctx.shadowBlur = 0;
    }

    drawTooltip(ctx, tooltip, hpr) {
        // Draw tooltip at bottom of chart
        const fontSize = 10 * hpr;
        ctx.font = `${fontSize}px Arial`;

        const padding = 8 * hpr;
        const textWidth = ctx.measureText(tooltip).width;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(10 * hpr, 10 * hpr, textWidth + padding * 2, fontSize + padding * 2);

        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'top';
        ctx.fillText(tooltip, 10 * hpr + padding, 10 * hpr + padding);
    }
}

/**
 * Render condition visual elements on chart
 */
export function renderConditionVisuals(series, candles, condition) {
    if (!condition?.visualMeta?.elements) return null;

    const renderer = new UniversalVisualRenderer(candles, condition.visualMeta, {
        showTooltip: true,
        animatePulsing: true
    });

    series.attachPrimitive(renderer);
    return renderer;
}

/**
 * Clear all visual elements
 */
export function clearConditionVisuals(series, renderers) {
    if (!renderers || !Array.isArray(renderers)) return;

    renderers.forEach(renderer => {
        try {
            series.detachPrimitive(renderer);
        } catch (e) { }
    });

    stopAnimation();
}


// Zone Label and AutoZoom functions defined below
export function generateZoneLabel(zone, setupDirection) {
    const typeLabels = {
        'orderBlock': '📦 ORDER BLOCK',
        'fvg': '📐 FAIR VALUE GAP',
        'range': '📊 RANGE',
        'bos': '🔀 BOS LEVEL',
        'sweep': '⚡ LIQUIDITY SWEEP',
        'breaker': '🔄 BREAKER BLOCK',
        'mitigation': '⚖️ MITIGATION'
    };

    const mainLabel = typeLabels[zone.type] || zone.type?.toUpperCase() || 'ZONE';
    let entryLabel = '';

    if (setupDirection === 'long') {
        entryLabel = `Bottom: $${zone.low?.toFixed(2)} ← ENTRY ZONE`;
    } else if (setupDirection === 'short') {
        entryLabel = `Top: $${zone.high?.toFixed(2)} ← ENTRY ZONE`;
    }

    return {
        main: mainLabel,
        top: `Top: $${zone.high?.toFixed(2)}`,
        bottom: `Bottom: $${zone.low?.toFixed(2)}`,
        entry: entryLabel,
        full: `${mainLabel}\n${entryLabel}`
    };
}

export function autoZoomToEvent(chart, eventTime, paddingBars = 10) {
    if (!chart) return;

    const timeScale = chart.timeScale();
    const visibleRange = timeScale.getVisibleLogicalRange();

    if (!visibleRange) return;

    const barsWidth = 30;

    timeScale.scrollToPosition(-paddingBars, false);
    timeScale.setVisibleLogicalRange({
        from: visibleRange.from,
        to: visibleRange.from + barsWidth
    });
}

// Keep legacy primitives for backward compatibility
export class NeonHighlightPrimitive {
    constructor(time, price, options = {}) {
        this._time = time;
        this._price = price;
        this._options = {
            color: options.color || '#00ffff',
            size: options.size || 20,
            text: options.text || '',
            ...options
        };
        this._paneViews = [new NeonHighlightPaneView(this)];
    }

    paneViews() { return this._paneViews; }
    attached({ chart, series }) { this._chart = chart; this._series = series; }
    detached() { this._chart = undefined; this._series = undefined; }
    chart() { return this._chart; }
    series() { return this._series; }
    getTime() { return this._time; }
    getPrice() { return this._price; }
    getOptions() { return this._options; }
}

class NeonHighlightPaneView {
    constructor(source) { this._source = source; }

    update() {
        const chart = this._source.chart();
        const series = this._source.series();
        if (!chart || !series) return;
        this._x = chart.timeScale().timeToCoordinate(this._source.getTime());
        this._y = series.priceToCoordinate(this._source.getPrice());
    }

    renderer() {
        return {
            draw: (target) => {
                target.useBitmapCoordinateSpace(scope => {
                    const ctx = scope.context;
                    const { horizontalPixelRatio: hpr } = scope;

                    if (this._x == null || this._y == null) return;

                    const x = this._x * hpr;
                    const y = this._y * hpr;
                    const options = this._source.getOptions();
                    const size = options.size * hpr;

                    ctx.save();
                    ctx.shadowColor = options.color;
                    ctx.shadowBlur = 20 * hpr;
                    ctx.strokeStyle = options.color;
                    ctx.lineWidth = 3 * hpr;
                    ctx.strokeRect(x - size / 2, y - size / 2, size, size);

                    if (options.text) {
                        ctx.shadowBlur = 0;
                        ctx.font = `bold ${10 * hpr}px Arial`;
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                        const textWidth = ctx.measureText(options.text).width;
                        ctx.fillRect(x - textWidth / 2 - 4, y - size / 2 - 20 * hpr, textWidth + 8, 16 * hpr);
                        ctx.fillStyle = options.color;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(options.text, x, y - size / 2 - 12 * hpr);
                    }

                    ctx.restore();
                });
            }
        };
    }
}

export class ZoneAnnotationPrimitive {
    constructor(zone, options = {}) {
        this._zone = zone;
        this._options = { ...options };
        this._paneViews = [];
    }

    paneViews() { return this._paneViews; }
    attached({ chart, series }) { this._chart = chart; this._series = series; }
    detached() { this._chart = undefined; this._series = undefined; }
}

export default {
    UniversalVisualRenderer,
    NeonHighlightPrimitive,
    ZoneAnnotationPrimitive,
    renderConditionVisuals,
    clearConditionVisuals,
    generateZoneLabel,
    autoZoomToEvent,
    stopAnimation
};
