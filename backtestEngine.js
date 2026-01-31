/**
 * Backtest Engine
 * Historical Simulation for Price Action Strategies
 * 
 * Phase 4 - Price Action Engine
 * 
 * CRITICAL: Uses the EXACT same analyzeV3 logic as live app
 * to ensure backtest results match real-world performance.
 */

import { analyzeV3 } from './signalEngineV3';

// ============================================================
// SECTION 1: CONFIGURATION
// ============================================================

export const BACKTEST_CONFIG = {
    // Risk management
    riskPerTrade: 0.01,         // 1% risk per trade
    maxOpenTrades: 1,           // Only 1 trade at a time

    // Execution settings
    slippage: 0.0005,           // 0.05% slippage
    commission: 0.001,          // 0.1% commission (taker fee)

    // Analysis settings
    minHistoryRequired: 50,     // Minimum candles before starting
    minConfidence: 60           // Minimum confidence to take trade
};

// ============================================================
// SECTION 2: BACKTEST ENGINE CLASS
// ============================================================

export class BacktestEngine {
    constructor(initialBalance = 1000, config = {}) {
        this.initialBalance = initialBalance;
        this.balance = initialBalance;
        this.config = { ...BACKTEST_CONFIG, ...config };
        this.trades = [];
        this.activeTrade = null;
        this.equity = [initialBalance];
        this.peakEquity = initialBalance;
        this.maxDrawdown = 0;
    }

    /**
     * Run backtest on historical candle data
     * @param {Array} candles - Historical OHLCV data [{time, open, high, low, close, volume}]
     * @returns {Object} - Comprehensive backtest report
     */
    run(candles) {
        if (!candles || candles.length < this.config.minHistoryRequired + 10) {
            return {
                error: `Minimum ${this.config.minHistoryRequired + 10} candles required`,
                success: false
            };
        }

        // Reset state
        this.balance = this.initialBalance;
        this.trades = [];
        this.activeTrade = null;
        this.equity = [this.initialBalance];
        this.peakEquity = this.initialBalance;
        this.maxDrawdown = 0;

        const START_INDEX = this.config.minHistoryRequired;

        console.log(`🔬 Backtest started: ${candles.length} candles, starting at index ${START_INDEX}`);

        // Main simulation loop
        for (let i = START_INDEX; i < candles.length - 1; i++) {
            // 1. Simulate "Current Time" by slicing history
            // This prevents look-ahead bias
            const currentSlice = candles.slice(0, i + 1);
            const currentCandle = candles[i];
            const nextCandle = candles[i + 1]; // Used for execution simulation

            // 2. Run V3 Engine on this slice (same as live app)
            let analysis;
            try {
                analysis = analyzeV3(currentSlice);
            } catch (e) {
                // Skip this candle if analysis fails
                continue;
            }

            // 3. Process this candle
            this.processCandle(currentCandle, nextCandle, analysis, i);

            // 4. Track equity
            const currentEquity = this.calculateEquity(currentCandle);
            this.equity.push(currentEquity);
            this.updateDrawdown(currentEquity);
        }

        console.log(`🔬 Backtest complete: ${this.trades.length} trades executed`);

        return this.generateReport();
    }

    /**
     * Process a single candle in the simulation
     * @param {Object} currentCandle - Current candle data
     * @param {Object} nextCandle - Next candle (for execution)
     * @param {Object} analysis - V3 analysis result
     * @param {number} index - Current candle index
     */
    processCandle(currentCandle, nextCandle, analysis, index) {
        // First, check if we have an active trade
        if (this.activeTrade) {
            this.checkTradeExit(currentCandle, nextCandle, index);
            return; // Don't open new trades while one is active
        }

        // Look for new entry signals
        this.checkTradeEntry(currentCandle, nextCandle, analysis, index);
    }

    /**
     * Check for trade entry based on V3 analysis
     */
    checkTradeEntry(currentCandle, nextCandle, analysis, index) {
        // Check Long setups
        if (analysis.longSetups && analysis.longSetups.length > 0) {
            const bestLong = analysis.longSetups
                .filter(s => s.confidence >= this.config.minConfidence)
                .sort((a, b) => b.confidence - a.confidence)[0];

            if (bestLong && this.isValidEntry(bestLong, currentCandle, 'long')) {
                this.openTrade('long', bestLong, currentCandle, nextCandle, index);
                return;
            }
        }

        // Check Short setups
        if (analysis.shortSetups && analysis.shortSetups.length > 0) {
            const bestShort = analysis.shortSetups
                .filter(s => s.confidence >= this.config.minConfidence)
                .sort((a, b) => b.confidence - a.confidence)[0];

            if (bestShort && this.isValidEntry(bestShort, currentCandle, 'short')) {
                this.openTrade('short', bestShort, currentCandle, nextCandle, index);
                return;
            }
        }
    }

    /**
     * Validate if entry conditions are met
     */
    isValidEntry(setup, candle, direction) {
        if (!setup.entry || setup.entry.length < 2) return false;
        if (!setup.stop) return false;

        const price = candle.close;
        const [entryLow, entryHigh] = setup.entry;

        // Check if price is within entry zone
        if (price < entryLow || price > entryHigh) return false;

        // For long: stop must be below entry
        if (direction === 'long' && setup.stop >= entryLow) return false;

        // For short: stop must be above entry
        if (direction === 'short' && setup.stop <= entryHigh) return false;

        return true;
    }

    /**
     * Open a new trade
     */
    openTrade(direction, setup, currentCandle, nextCandle, index) {
        // Execute at next candle open (more realistic)
        const entryPrice = nextCandle.open * (1 + (direction === 'long' ? this.config.slippage : -this.config.slippage));
        const stopLoss = setup.stop;

        // Calculate take profit (use first TP or default 2:1 R:R)
        let takeProfit;
        if (setup.targets && setup.targets.length > 0) {
            takeProfit = setup.targets[0].level;
        } else {
            const riskDistance = Math.abs(entryPrice - stopLoss);
            takeProfit = direction === 'long'
                ? entryPrice + (riskDistance * 2)
                : entryPrice - (riskDistance * 2);
        }

        // Calculate position size based on risk
        const riskDistance = Math.abs(entryPrice - stopLoss);
        const riskAmount = this.balance * this.config.riskPerTrade;
        const positionSize = riskAmount / riskDistance;

        this.activeTrade = {
            id: `trade_${Date.now()}_${index}`,
            direction,
            setupType: setup.technique || setup.name || 'unknown',
            confidence: setup.confidence,
            entryIndex: index + 1, // Entered on next candle
            entryTime: nextCandle.time,
            entryPrice,
            stopLoss,
            takeProfit,
            positionSize,
            riskAmount,
            status: 'open'
        };

        console.log(`📈 Trade opened: ${direction.toUpperCase()} @ ${entryPrice.toFixed(2)}, SL: ${stopLoss.toFixed(2)}, TP: ${takeProfit.toFixed(2)}`);
    }

    /**
     * Check if active trade should be closed
     */
    checkTradeExit(currentCandle, nextCandle, index) {
        if (!this.activeTrade) return;

        const trade = this.activeTrade;
        const high = currentCandle.high;
        const low = currentCandle.low;

        let exitPrice = null;
        let exitReason = null;

        if (trade.direction === 'long') {
            // Check SL first (worst case assumption)
            if (low <= trade.stopLoss) {
                exitPrice = trade.stopLoss * (1 - this.config.slippage);
                exitReason = 'stop_loss';
            }
            // Check TP
            else if (high >= trade.takeProfit) {
                exitPrice = trade.takeProfit * (1 - this.config.slippage);
                exitReason = 'take_profit';
            }
        } else {
            // Short trade
            // Check SL first
            if (high >= trade.stopLoss) {
                exitPrice = trade.stopLoss * (1 + this.config.slippage);
                exitReason = 'stop_loss';
            }
            // Check TP
            else if (low <= trade.takeProfit) {
                exitPrice = trade.takeProfit * (1 + this.config.slippage);
                exitReason = 'take_profit';
            }
        }

        if (exitPrice !== null) {
            this.closeTrade(exitPrice, exitReason, currentCandle, index);
        }
    }

    /**
     * Close the active trade
     */
    closeTrade(exitPrice, exitReason, candle, index) {
        const trade = this.activeTrade;

        // Calculate P&L
        const priceDiff = trade.direction === 'long'
            ? exitPrice - trade.entryPrice
            : trade.entryPrice - exitPrice;

        const grossPnl = priceDiff * trade.positionSize;
        const commission = (trade.entryPrice + exitPrice) * trade.positionSize * this.config.commission;
        const netPnl = grossPnl - commission;
        const pnlPercent = (netPnl / this.balance) * 100;

        // Update balance
        this.balance += netPnl;

        // Record completed trade
        const completedTrade = {
            ...trade,
            exitIndex: index,
            exitTime: candle.time,
            exitPrice,
            exitReason,
            grossPnl,
            commission,
            netPnl,
            pnlPercent,
            result: netPnl > 0 ? 'win' : netPnl < 0 ? 'loss' : 'breakeven',
            balanceAfter: this.balance
        };

        this.trades.push(completedTrade);
        this.activeTrade = null;

        const emoji = netPnl > 0 ? '✅' : '❌';
        console.log(`${emoji} Trade closed: ${exitReason}, PnL: $${netPnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`);
    }

    /**
     * Calculate current equity including open positions
     */
    calculateEquity(currentCandle) {
        let equity = this.balance;

        if (this.activeTrade) {
            const trade = this.activeTrade;
            const currentPrice = currentCandle.close;
            const unrealizedPnl = trade.direction === 'long'
                ? (currentPrice - trade.entryPrice) * trade.positionSize
                : (trade.entryPrice - currentPrice) * trade.positionSize;
            equity += unrealizedPnl;
        }

        return equity;
    }

    /**
     * Update max drawdown tracking
     */
    updateDrawdown(currentEquity) {
        if (currentEquity > this.peakEquity) {
            this.peakEquity = currentEquity;
        }

        const drawdown = ((this.peakEquity - currentEquity) / this.peakEquity) * 100;
        if (drawdown > this.maxDrawdown) {
            this.maxDrawdown = drawdown;
        }
    }

    /**
     * Generate comprehensive backtest report
     */
    generateReport() {
        const totalTrades = this.trades.length;
        const wins = this.trades.filter(t => t.result === 'win');
        const losses = this.trades.filter(t => t.result === 'loss');

        const grossProfit = wins.reduce((sum, t) => sum + t.netPnl, 0);
        const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.netPnl, 0));

        const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
        const netProfit = this.balance - this.initialBalance;
        const netProfitPercent = (netProfit / this.initialBalance) * 100;

        // Calculate average trade stats
        const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
        const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
        const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;

        // Trade duration stats
        const tradeDurations = this.trades.map(t => t.exitIndex - t.entryIndex);
        const avgDuration = tradeDurations.length > 0
            ? tradeDurations.reduce((a, b) => a + b, 0) / tradeDurations.length
            : 0;

        return {
            success: true,

            // Summary
            summary: {
                initialBalance: this.initialBalance,
                finalBalance: this.balance,
                netProfit,
                netProfitPercent,
                totalTrades,
                winRate,
                profitFactor,
                maxDrawdown: this.maxDrawdown
            },

            // Trade breakdown
            trades: {
                total: totalTrades,
                wins: wins.length,
                losses: losses.length,
                winRate,
                avgWin,
                avgLoss,
                avgRR,
                avgDuration
            },

            // Risk metrics
            risk: {
                maxDrawdown: this.maxDrawdown,
                profitFactor,
                sharpeRatio: this.calculateSharpeRatio()
            },

            // Full trade log
            tradeLog: this.trades.map(t => ({
                id: t.id,
                direction: t.direction,
                setupType: t.setupType,
                confidence: t.confidence,
                entryPrice: t.entryPrice,
                exitPrice: t.exitPrice,
                exitReason: t.exitReason,
                netPnl: t.netPnl,
                pnlPercent: t.pnlPercent,
                result: t.result
            })),

            // Equity curve for charting
            equityCurve: this.equity
        };
    }

    /**
     * Calculate simplified Sharpe Ratio
     */
    calculateSharpeRatio() {
        if (this.trades.length < 2) return 0;

        const returns = this.trades.map(t => t.pnlPercent);
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);

        return stdDev > 0 ? avgReturn / stdDev : 0;
    }
}

// ============================================================
// SECTION 3: UTILITY FUNCTIONS
// ============================================================

/**
 * Format backtest report for console display
 */
export function formatBacktestReport(report) {
    if (!report.success) {
        return `❌ Backtest failed: ${report.error}`;
    }

    const s = report.summary;
    const t = report.trades;
    const r = report.risk;

    return `
╔══════════════════════════════════════════════════════════════╗
║                    BACKTEST REPORT                           ║
╠══════════════════════════════════════════════════════════════╣
║  PERFORMANCE                                                 ║
║  ─────────────────────────────────────────────────────────   ║
║  Initial Balance:  $${s.initialBalance.toFixed(2).padStart(10)}                         ║
║  Final Balance:    $${s.finalBalance.toFixed(2).padStart(10)}                         ║
║  Net Profit:       $${s.netProfit.toFixed(2).padStart(10)} (${s.netProfitPercent.toFixed(1)}%)                  ║
╠══════════════════════════════════════════════════════════════╣
║  TRADES                                                      ║
║  ─────────────────────────────────────────────────────────   ║
║  Total Trades:     ${t.total.toString().padStart(10)}                              ║
║  Wins:             ${t.wins.toString().padStart(10)}                              ║
║  Losses:           ${t.losses.toString().padStart(10)}                              ║
║  Win Rate:         ${t.winRate.toFixed(1).padStart(9)}%                              ║
║  Avg Winner:       $${t.avgWin.toFixed(2).padStart(10)}                         ║
║  Avg Loser:        $${t.avgLoss.toFixed(2).padStart(10)}                         ║
║  Avg R:R:          ${t.avgRR.toFixed(2).padStart(10)}                              ║
╠══════════════════════════════════════════════════════════════╣
║  RISK METRICS                                                ║
║  ─────────────────────────────────────────────────────────   ║
║  Max Drawdown:     ${r.maxDrawdown.toFixed(1).padStart(9)}%                              ║
║  Profit Factor:    ${r.profitFactor.toFixed(2).padStart(10)}                              ║
║  Sharpe Ratio:     ${r.sharpeRatio.toFixed(2).padStart(10)}                              ║
╚══════════════════════════════════════════════════════════════╝
    `.trim();
}

/**
 * Quick run helper
 */
export function runBacktest(candles, initialBalance = 1000, config = {}) {
    const engine = new BacktestEngine(initialBalance, config);
    return engine.run(candles);
}

export default BacktestEngine;
