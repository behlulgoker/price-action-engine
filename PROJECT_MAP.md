# Price Action Engine - Project Map

## File Architecture

```
price-action-engine/
├── App.jsx                  ← Main React component (MODIFIED for V3)
├── signalEngineV3.js        ← [NEW] Institutional-grade PA logic
├── conditionTracker.js      ← [NEW] Real-time condition status
├── visualAnnotations.js     ← [NEW] Enhanced zone labels & highlights
├── main.jsx                 ← React entry point (unchanged)
├── index.css                ← Styles (unchanged)
└── package.json             ← Dependencies (unchanged)
```

## V3 Module Reference

### signalEngineV3.js
| Export | Description |
|--------|-------------|
| `analyzeV3(candles)` | Main analysis function |
| `SignalMemory` | Persistent memory class |
| `findSwingPoints` | 5-candle fractal detection |
| `findAllBOS` | Body-close based BOS |
| `findBreakerBlocks` | OB → Breaker conversion |
| `findMitigationBlocks` | HL/LH zone detection |
| `generateSwingDebugMarkers` | Chart debug markers |

### conditionTracker.js
| Export | Description |
|--------|-------------|
| `ConditionTracker` | Class for tracking conditions |
| `CONDITION_STATUS` | Enum: met, pending, failed |
| `getStatusIcon` | Returns ✅/⏳/❌ |
| `getStatusColor` | Returns status color |

### visualAnnotations.js
| Export | Description |
|--------|-------------|
| `ZoneAnnotationPrimitive` | Enhanced zone with labels |
| `NeonHighlightPrimitive` | Click highlight effect |
| `generateZoneLabel` | Creates label with prices |
| `autoZoomToEvent` | Zooms chart to time |

## Revert Instructions

To revert to pre-V3 state:

```bash
# 1. Remove V3 imports from App.jsx (lines 5-8)
# 2. Remove V3 state variables (lines ~356-361)
# 3. Remove V3 useEffect (lines ~2024-2085)
# 4. Restore original confirmations display

# Or simply:
git checkout HEAD~1 -- App.jsx
```

## Safety Notes
- All V3 modules are in separate files
- Existing features (Calculator, Trendlines, Trades) preserved
- V3 integration is surgical - minimal App.jsx changes
