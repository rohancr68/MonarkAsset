require('dotenv').config();
const express   = require('express');
const fetch     = require('node-fetch');
const cors      = require('cors');
const NodeCache = require('node-cache');

const app   = express();
const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_SECONDS) || 60 });
const PORT  = process.env.PORT || 3001;

app.use(cors());

const SYMBOLS = [
  { symbol: '^NSEI',    label: 'NIFTY 50'     },
  { symbol: '^BSESN',   label: 'SENSEX'       },
  { symbol: 'GC=F',     label: 'Gold'         },
  { symbol: '^NSMIDCP', label: 'NIFTY MidCap' },
  { symbol: 'INR=X',    label: 'USD/INR'      },
  { symbol: '^CNXIT',   label: 'NIFTY IT'     },
];

async function fetchSymbol({ symbol, label }) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/json',
    },
    timeout: 8000,
  });

  if (!res.ok) throw new Error(`Yahoo returned ${res.status}`);

  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`No meta for ${symbol}`);

  const price     = meta.regularMarketPrice;
  const prev      = meta.previousClose || meta.chartPreviousClose;
  const change    = price - prev;
  const changePct = ((change / prev) * 100).toFixed(2);

  return {
    symbol,
    label,
    price:     price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    change:    change.toFixed(2),
    changePct,
    direction: change >= 0 ? 'up' : 'dn',
    arrow:     change >= 0 ? '↑' : '↓',
    updatedAt: new Date().toISOString(),
  };
}

app.get('/api/market', async (req, res) => {
  const cached = cache.get('market_data');
  if (cached) return res.json({ success: true, cached: true, data: cached });

  const results = await Promise.allSettled(SYMBOLS.map(fetchSymbol));

  const data = results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    console.error(`Failed: ${SYMBOLS[i].symbol}:`, result.reason?.message);
    return {
      symbol: SYMBOLS[i].symbol, label: SYMBOLS[i].label,
      price: '--', change: '0', changePct: '0.00',
      direction: 'up', arrow: '–', error: true,
    };
  });

  cache.set('market_data', data);
  res.json({ success: true, cached: false, data });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`\n📈  Market server → http://localhost:${PORT}/api/market`);
  console.log(`🔄  Refreshes every ${process.env.CACHE_SECONDS || 60}s\n`);
});
