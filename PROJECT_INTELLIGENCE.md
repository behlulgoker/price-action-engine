# Project Intelligence & Technical Rules

## A. Technical Constraints

### 1. Short Setup Mandate
Short Setups **MUST** generate explicit `visualMeta` payloads:
- Red Zones (`rgba(239, 68, 68, 0.4)`)
- Candle Markers
- Accurate `focusIndex` for zoom

### 2. Visual Protocol
**Never hardcode logic in App.jsx.** All interactions (Zoom, Highlights) are driven by the `conditions` array from Signal Engine.

### 3. Legacy Policy
`_OLD_LEGACY/` is for rollback only. **Do not import from it.**

### 4. Backtest Integrity
BacktestEngine must use `candles.slice(0, i + 1)` to prevent look-ahead bias. Always execute trades on **next candle open**.

### 5. AI Safety Protocols
- **Endpoint**: Must use `v1` stable endpoint (`generativelanguage.googleapis.com/v1/...`).
- **Schema**: AI outputs often fail JSON parsing. Use strict Regex extraction and `try/catch` fallback.
- **Hybrid Check**: Never rely solely on AI for signaling. Always cross-reference with V3 Algorithm signals.

---

## B. Design Philosophy

### 5. Mentor-First Principle
Visuals must be EXPLICIT with Text Labels:
```
❌ BAD:  Empty box on chart
✅ GOOD: Box with "🎯 SHORT Entry Zone"
```

### 6. Debug-First Development
Use 🐞 Debug Mode to verify coordinates before deploying visual changes.

---

## C. File Responsibilities

| File | Responsibility |
|------|----------------|
| `signalEngineV3.js` | Structure detection, swing points |
| `backtestEngine.js` | Historical simulation |
| `conditionTracker.js` | Entry condition logic |
| `visualAnnotations.js` | Chart primitives |
| `agentEngine.js` | Hybrid AI Analysis, JSON strict parsing |
| `App.jsx` | UI only |

---

## D. Recent Learnings

### Phase 4 Lessons
1. **setMarkers API** works for debug visualization
2. **Time-sliced analysis** prevents look-ahead bias
3. **formatBacktestReport** provides readable console output

---

Last Updated: 20 January 2025 02:14
