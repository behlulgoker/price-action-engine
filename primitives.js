// Primitive classes for lightweight-charts v5
// Separated from App.jsx to avoid Vite Fast Refresh signature issues

// Trend Line Primitive
export class TrendLinePrimitive {
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

    updatePoints(p1, p2) {
        this._p1 = p1;
        this._p2 = p2;
        this.updateAllViews();
        this.requestUpdate();
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
        const self = this;
        return {
            draw: function (target) {
                target.useBitmapCoordinateSpace(function (scope) {
                    const ctx = scope.context;
                    const horizontalPixelRatio = scope.horizontalPixelRatio;
                    const verticalPixelRatio = scope.verticalPixelRatio;

                    if (self._x1 === null || self._y1 === null ||
                        self._x2 === null || self._y2 === null) return;

                    const x1 = self._x1 * horizontalPixelRatio;
                    const y1 = self._y1 * verticalPixelRatio;
                    const x2 = self._x2 * horizontalPixelRatio;
                    const y2 = self._y2 * verticalPixelRatio;

                    const options = self._source.getOptions();

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

// Rectangle Primitive for reference zones
export class RectanglePrimitive {
    constructor(zone, options = {}) {
        this._zone = zone;
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
        const self = this;
        return {
            draw: function (target) {
                target.useBitmapCoordinateSpace(function (scope) {
                    const ctx = scope.context;
                    const horizontalPixelRatio = scope.horizontalPixelRatio;
                    const verticalPixelRatio = scope.verticalPixelRatio;

                    if (self._x1 === null || self._y1 === null ||
                        self._x2 === null || self._y2 === null) return;

                    const x1 = Math.min(self._x1, self._x2) * horizontalPixelRatio;
                    const y1 = Math.min(self._y1, self._y2) * verticalPixelRatio;
                    const x2 = Math.max(self._x1, self._x2) * horizontalPixelRatio;
                    const y2 = Math.max(self._y1, self._y2) * verticalPixelRatio;

                    const width = x2 - x1;
                    const height = y2 - y1;

                    const options = self._source.getOptions();

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
                        ctx.font = 'bold ' + fontSize + 'px Arial, sans-serif';

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
