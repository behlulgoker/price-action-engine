/**
 * Agent Engine - Hybrid AI & Educational Mentor
 * Integrates with Google Gemini 1.5 Flash (v1) for dual-layer trade analysis
 * 
 * Features:
 * - Hybrid Verification: Compares V3 Algo signals with AI Price Action analysis
 * - Mentor Mode: Explains "concept", "why", and "guidance" in Turkish
 * - Strict JSON Schema: Ensures reliable UI parsing
 */

// FIXED: Upgrade to Gemini 2.5 Flash (State-of-the-Art)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Internal logic for retries (Anti-429)
const fetchWithRetry = async (url, options, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        const res = await fetch(url, options);
        if (res.status === 429) {
            console.warn(`⚠️ Rate limit (429). Retrying in 2s... (Attempt ${i + 1}/${retries})`);
            await new Promise(r => setTimeout(r, 2000));
            continue;
        }
        return res;
    }
    throw new Error('Max retries exceeded (429 Rate Limit)');
};

/**
 * Format candle data for AI context (OHLC + Volume)
 */
const formatCandlesForAI = (candles, limit = 50) => {
    const recent = candles.slice(-limit);
    return recent.map((c, i) => ({
        i, // index relative to slice
        t: new Date(c.time * 1000).toISOString().slice(5, 16).replace('T', ' '), // Compact time
        o: c.open,
        h: c.high,
        l: c.low,
        c: c.close,
        v: c.volume
    }));
};

/**
 * Parse AI response to extract JSON safely
 * Handles both plain text and structured JSON responses
 */
const parseAIResponse = (text) => {
    try {
        // First, try to find JSON block with code fence
        let jsonContent = text;

        // Remove markdown code fences if present
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            jsonContent = codeBlockMatch[1].trim();
        }

        // Try to find any JSON object
        const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);

            // Ensure visualMarkers exists (even if empty)
            if (!parsed.visualMarkers) {
                parsed.visualMarkers = [];
            }

            // Ensure text exists
            if (!parsed.text && parsed.educationalInsight) {
                parsed.text = parsed.educationalInsight;
            }

            console.log('✅ AI Response Parsed:', {
                hasText: !!parsed.text,
                markerCount: parsed.visualMarkers?.length || 0
            });

            return parsed;
        }

        // No JSON found - return plain text response
        console.warn('⚠️ No JSON found in AI response, treating as plain text');
        return {
            text: text,
            visualMarkers: []
        };

    } catch (err) {
        console.warn('AI JSON Parse Failed:', err.message);
        // Return the raw text as fallback
        return {
            text: text || "Yanıt işlenemedi.",
            visualMarkers: []
        };
    }
};

/**
 * Agent Engine Class
 */
const KNOWLEDGE_BASE = `
SİSTEM BİLGİ BANKASI (Price Action Engine v5.0):
1. ÖZELLİKLER:
   - "Multi-Pair Scanner": 10+ pariteyi saniyeler içinde tarar (BTC, ETH, SOL vb.).
   - "Backtest Engine": 🧪 Test butonuna basarak geçmiş veride strateji testi yapabilirsiniz.
   - "Debug Mode": 🐞 Kutucuğu ile swing noktalarını ve teknik seviyeleri grafikte görebilirsiniz.
   - "Hybrid AI": Gemini 2.5 Flash ile hem sinyal denetler hem de eğitim verir.

2. TEKNİK KONSEPTLER:
   - OB (Order Block): Kurumsal emirlerin toplandığı dönüş bölgeleri.
   - FVG (Fair Value Gap): Fiyattaki dengesizlik boşlukları (Mıknatıs görevi görür).
   - BOS (Break of Structure): Trendin devam ettiğini gösteren yapı kırılımı.
   - Sweep (Likidite Temizliği): Stop patlatma hareketi (Dönüş sinyali).
   - Range: Fiyatın sıkıştığı yatay alan (EQ seviyesi önemlidir).

3. AYARLAR:
   - API Key: Google AI Studio'dan alınan anahtar ile aktif edilir.
   - Timeframe: 15m, 1h, 4h grafikler desteklenir.
`;

/**
 * Agent Engine Class
 */
export class AgentEngine {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.isReady = !!apiKey;
    }

    setApiKey(apiKey) {
        console.log('🤖 Engine received new API Key');
        this.apiKey = apiKey;
        this.isReady = !!apiKey;
    }

    /**
     * SENIOR SIGNAL AUDITOR (Hybrid Verification)
     * Analyzes specific conditions and setups with visual auditing
     */
    async verifyHybridSetup(symbol, conditionText, activeSetup, candles) {
        if (!this.isReady) {
            return { error: 'API Anahtarı Eksik.', confirmed: false };
        }

        const candleContext = JSON.stringify(formatCandlesForAI(candles, 50));
        const setupContext = JSON.stringify({
            type: activeSetup.direction, // long/short
            technique: activeSetup.techniqueLabel,
            entry: activeSetup.entry,
            stop: activeSetup.stop
        });

        // AUDITOR PROMPT
        const prompt = `
Rol: Sen "Senior Signal Auditor" (Kıdemli Sinyal Denetçisi) yapay zekasısın.
Görevin: Aşağıdaki trading kurulumunu ve spesifik koşulu denetlemek ve grafikte kanıt işaretlemek.

GİRDİLER:
- Sembol: ${symbol}
- Aktif Kurulum (Setup): ${setupContext}
- DENETLENECEK KOŞUL: "${conditionText}"
- Son 50 Mum Verisi (OHLCV): ${candleContext}

GÖREVLER:
1. "Denetlenecek Koşul" grafik üzerinde gerçekleşmiş mi? (Örn: Fiyat zone'a değdi mi? Order block var mı?)
2. KANIT (VISUAL EVIDENCE):
   - Koşulun gerçekleştiği veya beklendiği yerleri (Zone, Line) belirle.
   - Entry, Stop veya FVG seviyelerini koordinatlarıyla çıkar.
   - Bu koordinatları "visualMarkers" dizisine ekle.

ÇIKTI FORMATI (STRICT JSON):
Sadece aşağıdaki JSON formatını döndür. Başka hiçbir metin ekleme.

\`\`\`json
{
  "auditResult": "PASS" | "FAIL" | "PENDING",
  "confidence": 0-100,
  "educationalInsight": "Koşul analizi ve nedenleri (Türkçe)",
  "visualMarkers": [
    {
      "type": "ZONE" | "LINE", 
      "top": number,   // Zone üst (varsa)
      "bottom": number,// Zone alt (varsa)
      "price": number, // Çizgi fiyatı (varsa)
      "color": "#hex", // Yeşil (#22c55e) veya Kırmızı (#ef4444)
      "label": "Kısa Açıklama (örn: FVG Test)"
    }
  ]
}
\`\`\`
`;

        try {
            console.log(` Auditor analyzing: ${conditionText}...`);
            const response = await fetchWithRetry(GEMINI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.5,
                        topP: 0.95,
                        maxOutputTokens: 8192
                    }
                })
            });

            const data = await response.json();
            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            console.log('✅ Auditor Response:', aiText.length);

            return parseAIResponse(aiText);

        } catch (err) {
            console.error('Auditor Error:', err);
            return { auditResult: "FAIL", educationalInsight: "Bağlantı hatası.", visualMarkers: [] };
        }
    }

    /**
     * CONTEXT-AWARE CHAT (Product Expert & Visual Analyst)
     * @param {string} message - User message
     * @param {Object} scannerResults - Active signal results
     * @param {Array} history - Chat history
     * @param {Array} candles - OHLCV candle data for price context
     */
    async chatWithContext(message, scannerResults = {}, history = [], candles = []) {
        if (!this.isReady) {
            return { error: 'API key missing', text: 'Lütfen ayarlardan API anahtarını girin.' };
        }

        const marketContext = Object.entries(scannerResults)
            .filter(([_, r]) => r.signal !== 'none')
            .map(([sym, r]) => `• ${sym}: ${r.signal?.toUpperCase()} (${r.confidence}%)`)
            .join('\n');

        // Format candle data for AI context (last 30 candles)
        const priceContext = candles.length > 0
            ? JSON.stringify(formatCandlesForAI(candles, 30))
            : 'Veri yok';

        // Get current price info
        const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : null;
        const recentHigh = candles.length > 0 ? Math.max(...candles.slice(-20).map(c => c.high)) : null;
        const recentLow = candles.length > 0 ? Math.min(...candles.slice(-20).map(c => c.low)) : null;

        const prompt = `Sen bir kripto teknik analiz uzmanısın. Türkçe yanıt ver.

GÖREV: Kullanıcının sorusunu yanıtla. Eğer grafik üzerinde çizim isteniyorsa, visualMarkers dizisine gerçek koordinatlar ekle.

${candles.length > 0 ? `
MEVCUT VERİ:
- Güncel Fiyat: ${currentPrice}
- Son High: ${recentHigh}
- Son Low: ${recentLow}
` : ''}

${KNOWLEDGE_BASE}

KULLANICI SORUSU: ${message}

ÖNEMLİ KURALLAR:
1. Her zaman yardımcı ol, "bilmiyorum" deme.
2. Kullanıcı "göster", "çiz", "bölge", "seviye", "giriş", "çıkış" derse visualMarkers DOLDUR.
3. Fiyat değerleri GERÇEK olmalı (yukarıdaki verileri kullan).

JSON FORMATI:
\`\`\`json
{
  "text": "Açıklayıcı yanıt (markdown)",
  "visualMarkers": [
    {"type": "LINE", "price": ${currentPrice || 3000}, "color": "#22c55e", "label": "Giriş"},
    {"type": "LINE", "price": ${recentLow || 2800}, "color": "#ef4444", "label": "Stop"},
    {"type": "ZONE", "top": ${recentHigh || 3200}, "bottom": ${currentPrice || 3000}, "color": "#3b82f6", "label": "Hedef Bölge"}
  ]
}
\`\`\`

Sadece JSON döndür, başka metin yazma.`;

        try {
            console.log('📡 Fetching Gemini 2.5 Flash (Product Expert Chat)...');
            const response = await fetchWithRetry(GEMINI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.85,
                        topP: 0.95,
                        maxOutputTokens: 8192
                    }
                })
            });

            const data = await response.json();
            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            console.log('✅ AI Expert Response length:', aiText.length);

            // Parse JSON 
            const parsed = parseAIResponse(aiText);

            return {
                text: parsed.text || "Yanıt işlenemedi.",
                model: 'Gemini 2.5 Flash (Expert)',
                visualMarkers: parsed.visualMarkers || []
            };
        } catch (err) {
            return { text: 'Bağlantı hatası: ' + err.message };
        }
    }
}

export default AgentEngine;
