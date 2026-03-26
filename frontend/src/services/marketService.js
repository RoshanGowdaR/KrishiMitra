const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const AGMARKNET_API_URL = import.meta.env.VITE_AGMARKNET_API_URL || '';
const DATA_GOV_API_URL = import.meta.env.VITE_DATA_GOV_API_URL || 'https://api.data.gov.in/resource';
const DATA_GOV_RESOURCE_ID = import.meta.env.VITE_DATA_GOV_RESOURCE_ID || '9ef84268-d588-465a-a308-a864a43d0070';
const DATA_GOV_API_KEY = import.meta.env.VITE_DATA_GOV_API_KEY || '';

const PRIMARY_GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const SECONDARY_GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY_FALLBACK || '';

const parseGroqResponse = (data) => {
  try {
    let text = data.choices?.[0]?.message?.content?.trim() || '';
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    // If model returns extra prose, extract the JSON array/object region.
    const firstArray = text.indexOf('[');
    const lastArray = text.lastIndexOf(']');
    if (firstArray !== -1 && lastArray !== -1 && lastArray > firstArray) {
      text = text.slice(firstArray, lastArray + 1);
    } else {
      const firstObj = text.indexOf('{');
      const lastObj = text.lastIndexOf('}');
      if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
        text = text.slice(firstObj, lastObj + 1);
      }
    }

    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    throw new Error('Could not parse price data');
  }
};

const callGroq = async (apiKey, prompt) => {
  if (!apiKey) throw new Error('Missing Groq API key');

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq request failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  return parseGroqResponse(data);
};

export const fetchMarketPrices = async (state, district, commodity) => {
  const normalizedState = String(state || '').trim();
  const normalizedDistrict = String(district || '').trim();
  const normalizedCommodity = String(commodity || '').trim();
  const preferredUnit = getPreferredCommodityUnit(normalizedCommodity);

  const dataGovRows = await fetchMarketPricesFromDataGov({
    state: normalizedState,
    district: normalizedDistrict,
    commodity: normalizedCommodity,
    preferredUnit,
  }).catch(() => []);

  if (dataGovRows.length) {
    return dataGovRows;
  }

  const agmarknetRows = await fetchMarketPricesFromAgmarknet({
    state: normalizedState,
    district: normalizedDistrict,
    commodity: normalizedCommodity,
    preferredUnit,
  }).catch(() => []);

  if (agmarknetRows.length) {
    return agmarknetRows;
  }

  // Do not synthesize fake markets when crop is unavailable in the requested area.
  return [];
};

const normalizeCompareText = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const toTitleCase = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .split(/\s+/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const matchesRequestedCommodity = (rowCommodity, requestedCommodity) => {
  const rowToken = normalizeCompareText(rowCommodity);
  const requestToken = normalizeCompareText(requestedCommodity);
  if (!rowToken || !requestToken) return false;
  return rowToken === requestToken || rowToken.includes(requestToken) || requestToken.includes(rowToken);
};

const fetchDataGovRecords = async ({ state, commodity }) => {
  const strictParams = new URLSearchParams({
    'api-key': DATA_GOV_API_KEY,
    format: 'json',
    limit: '1000',
    'filters[state.keyword]': toTitleCase(state),
    'filters[commodity]': toTitleCase(commodity),
  });

  const strictResponse = await fetch(`${DATA_GOV_API_URL}/${DATA_GOV_RESOURCE_ID}?${strictParams.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!strictResponse.ok) {
    throw new Error(`data.gov.in request failed: ${strictResponse.status}`);
  }

  const strictPayload = await strictResponse.json();
  const strictRows = Array.isArray(strictPayload?.records) ? strictPayload.records : [];
  if (strictRows.length) return strictRows;

  // Fallback: query full state data and do fuzzy commodity matching client-side.
  const fallbackParams = new URLSearchParams({
    'api-key': DATA_GOV_API_KEY,
    format: 'json',
    limit: '1000',
    'filters[state.keyword]': toTitleCase(state),
  });

  const fallbackResponse = await fetch(`${DATA_GOV_API_URL}/${DATA_GOV_RESOURCE_ID}?${fallbackParams.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!fallbackResponse.ok) {
    throw new Error(`data.gov.in fallback request failed: ${fallbackResponse.status}`);
  }

  const fallbackPayload = await fallbackResponse.json();
  return Array.isArray(fallbackPayload?.records) ? fallbackPayload.records : [];
};

const fetchMarketPricesFromDataGov = async ({
  state,
  district,
  commodity,
  preferredUnit,
}) => {
  if (!state || !commodity || !DATA_GOV_API_KEY) return [];

  const rows = await fetchDataGovRecords({ state, commodity });

  const districtToken = normalizeCompareText(district);
  const stateToken = normalizeCompareText(state);

  return rows
    .map((row, index) => {
      const min = toNumber(row?.min_price ?? row?.['Min Price'] ?? row?.['Min Prize'], 0);
      const max = toNumber(row?.max_price ?? row?.['Max Price'] ?? row?.['Max Prize'], 0);
      const modal = toNumber(row?.modal_price ?? row?.['Modal Price'] ?? row?.['Model Prize'], 0);
      const safeMin = Math.max(0, Math.round(Math.min(min || modal, max || modal)));
      const safeMax = Math.max(0, Math.round(Math.max(max || modal, min || modal)));
      const safeModal = Math.max(
        safeMin,
        Math.min(safeMax || modal || safeMin, Math.round(modal || (safeMin + safeMax) / 2 || 0))
      );

      return {
        commodity: String(row?.commodity || row?.Commodity || commodity).trim(),
        variety: String(row?.variety || row?.grade || row?.Grade || `Lot ${index + 1}`).trim(),
        market: String(row?.market || row?.Market || row?.city || row?.City || district).trim(),
        state: String(row?.state || row?.State || state).trim(),
        district: String(row?.district || row?.District || district).trim(),
        min_price: safeMin,
        max_price: safeMax,
        modal_price: safeModal,
        unit: normalizeUnit(row?.unit || row?.Unit, preferredUnit),
        date: String(row?.arrival_date || row?.date || row?.Date || formatDateIST()).trim(),
      };
    })
    .filter((row) => row.modal_price > 0)
    .filter((row) => normalizeCompareText(row.state) === stateToken)
    .filter((row) => {
      if (!districtToken) return true;
      const districtValue = normalizeCompareText(row.district);
      const marketValue = normalizeCompareText(row.market);
      return districtValue.includes(districtToken)
        || districtToken.includes(districtValue)
        || marketValue.includes(districtToken);
    })
    .filter((row) => matchesRequestedCommodity(row.commodity, commodity))
    .slice(0, 8);
};

export const fetchMarketLocationSuggestions = async (state, commodity) => {
  const normalizedState = String(state || '').trim();
  const normalizedCommodity = String(commodity || '').trim();
  if (!normalizedState || !normalizedCommodity || !DATA_GOV_API_KEY) return [];

  const rows = await fetchDataGovRecords({ state: normalizedState, commodity: normalizedCommodity });
  const stateToken = normalizeCompareText(normalizedState);

  const map = new Map();
  rows
    .filter((row) => matchesRequestedCommodity(row?.commodity, normalizedCommodity))
    .filter((row) => normalizeCompareText(row?.state) === stateToken)
    .forEach((row) => {
      const districtValue = String(row?.district || '').trim();
      const marketValue = String(row?.market || '').trim();
      const key = `${normalizeCompareText(districtValue)}|${normalizeCompareText(marketValue)}`;
      if (!key || map.has(key)) return;
      map.set(key, {
        district: districtValue,
        market: marketValue,
        label: marketValue ? `${districtValue} - ${marketValue}` : districtValue,
      });
    });

  return Array.from(map.values()).slice(0, 12);
};

const fetchMarketPricesFromAgmarknet = async ({
  state,
  district,
  commodity,
  preferredUnit,
}) => {
  if (!AGMARKNET_API_URL || !state || !district || !commodity) return [];

  const query = new URLSearchParams({
    commodity,
    state,
    market: district,
  });

  const response = await fetch(`${AGMARKNET_API_URL}?${query.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Agmarknet request failed: ${response.status}`);
  }

  const rows = await response.json();
  return normalizeAgmarknetRows(rows, { state, district, commodity, preferredUnit });
};

const COMMODITY_UNIT_PREFERENCE = {
  rice: 'per quintal',
  wheat: 'per quintal',
  maize: 'per quintal',
  soybean: 'per quintal',
  groundnut: 'per quintal',
  turmeric: 'per quintal',
  cotton: 'per quintal',
  sugarcane: 'per tonne',
  sugarcanegur: 'per tonne',
  tomato: 'per kg',
  onion: 'per kg',
  potato: 'per kg',
  banana: 'per quintal',
  chilli: 'per kg',
};

const UNIT_ALIASES = {
  quintal: 'per quintal',
  'per quintal': 'per quintal',
  qtl: 'per quintal',
  kg: 'per kg',
  'per kg': 'per kg',
  kilogram: 'per kg',
  '100 kg': 'per quintal',
  tonne: 'per tonne',
  'per tonne': 'per tonne',
  ton: 'per tonne',
  mt: 'per tonne',
};

const getPreferredCommodityUnit = (commodity) => {
  const normalized = String(commodity || '').trim().toLowerCase();
  const compact = normalized.replace(/[^a-z]/g, '');

  if (compact.includes('sugarcane')) return 'per tonne';
  if (compact.includes('tomato')) return 'per kg';
  if (compact.includes('onion')) return 'per kg';
  if (compact.includes('potato')) return 'per kg';
  if (compact.includes('chilli') || compact.includes('chili')) return 'per kg';

  return COMMODITY_UNIT_PREFERENCE[compact] || COMMODITY_UNIT_PREFERENCE[normalized] || 'per quintal';
};

const normalizeUnit = (unit, preferredUnit) => {
  const cleaned = String(unit || '').trim().toLowerCase();
  if (UNIT_ALIASES[cleaned]) return UNIT_ALIASES[cleaned];
  return preferredUnit || 'per quintal';
};

const formatDateIST = () => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const parts = formatter.formatToParts(new Date());
  const day = parts.find((part) => part.type === 'day')?.value || '01';
  const month = parts.find((part) => part.type === 'month')?.value || '01';
  const year = parts.find((part) => part.type === 'year')?.value || '2026';
  return `${day}-${month}-${year}`;
};

const toNumber = (value, fallback = 0) => {
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim();
    const parsedString = Number(cleaned);
    return Number.isFinite(parsedString) ? parsedString : fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeAgmarknetRows = (rows, {
  state,
  district,
  commodity,
  preferredUnit,
}) => {
  if (!Array.isArray(rows)) return [];

  return rows
    .slice(0, 12)
    .map((row, index) => {
      const min = toNumber(row?.['Min Prize'] ?? row?.['Min Price'] ?? row?.min_price, 0);
      const max = toNumber(row?.['Max Prize'] ?? row?.['Max Price'] ?? row?.max_price, 0);
      const modal = toNumber(row?.['Model Prize'] ?? row?.['Modal Price'] ?? row?.modal_price, 0);
      const safeMin = Math.max(0, Math.round(Math.min(min || modal, max || modal)));
      const safeMax = Math.max(0, Math.round(Math.max(max || modal, min || modal)));
      const safeModal = Math.max(
        safeMin,
        Math.min(safeMax || modal || safeMin, Math.round(modal || (safeMin + safeMax) / 2 || 0))
      );

      return {
        commodity: String(row?.Commodity || row?.commodity || commodity).trim(),
        variety: `Lot ${index + 1}`,
        market: String(row?.City || row?.Market || row?.market || district).trim(),
        state: String(row?.State || row?.state || state).trim(),
        district: String(row?.District || row?.district || district).trim(),
        min_price: safeMin,
        max_price: safeMax,
        modal_price: safeModal,
        unit: normalizeUnit(row?.Unit || row?.unit, preferredUnit),
        date: String(row?.Date || row?.date || formatDateIST()).trim(),
      };
    })
    .filter((row) => row.modal_price > 0)
    .slice(0, 8);
};

const buildMarketPricePrompt = ({
  state,
  district,
  commodity,
  preferredUnit,
  requestedAt,
  strictVariation,
}) => `You are an Indian agricultural mandi analyst.
Provide live, realistic mandi prices for ${commodity} in ${district}, ${state}, India.
Request timestamp (IST relevance required): ${requestedAt}

Return ONLY a valid JSON array with 6 to 8 entries and this exact schema:
[
  {
    "commodity": "${commodity}",
    "variety": "Sona Masuri",
    "market": "Mandya Market",
    "state": "${state}",
    "district": "${district}",
    "min_price": 1800,
    "max_price": 2200,
    "modal_price": 2050,
    "unit": "${preferredUnit}",
    "date": "25-03-2026"
  }
]

Rules:
- Use unit '${preferredUnit}' for this commodity unless genuinely unavailable.
- min_price, max_price, modal_price must be integers in INR for the given unit.
- modal_price must be between min and max.
- Use different varieties/markets so modal prices are not cloned.
- Keep realistic spread across rows, not flat values.
- No markdown, no explanation, JSON only.
${strictVariation ? '- Enforce strong variation: at least 4 unique modal_price values and visible range across markets.' : ''}`;

const normalizeMarketPriceRows = (rows, {
  state,
  district,
  commodity,
  preferredUnit,
}) => {
  if (!Array.isArray(rows)) return [];

  return rows
    .slice(0, 8)
    .map((row, index) => {
      const min = toNumber(row?.min_price, 0);
      const max = toNumber(row?.max_price, 0);
      let modal = toNumber(row?.modal_price, 0);
      let safeMin = min;
      let safeMax = max;

      if (safeMin > safeMax) {
        [safeMin, safeMax] = [safeMax, safeMin];
      }

      if (!safeMin && !safeMax && modal > 0) {
        safeMin = Math.round(modal * 0.92);
        safeMax = Math.round(modal * 1.08);
      }

      if (!modal || modal < safeMin || modal > safeMax) {
        modal = safeMin && safeMax ? Math.round((safeMin + safeMax) / 2) : modal;
      }

      return {
        commodity: String(row?.commodity || commodity || '').trim(),
        variety: String(row?.variety || `Variety ${index + 1}`).trim(),
        market: String(row?.market || `${district} Mandi`).trim(),
        state: String(row?.state || state || '').trim(),
        district: String(row?.district || district || '').trim(),
        min_price: Math.max(0, Math.round(safeMin)),
        max_price: Math.max(0, Math.round(safeMax)),
        modal_price: Math.max(0, Math.round(modal)),
        unit: normalizeUnit(row?.unit, preferredUnit),
        date: String(row?.date || formatDateIST()),
      };
    })
    .filter((row) => row.modal_price > 0);
};

const hasPriceVariance = (rows) => {
  if (!Array.isArray(rows) || rows.length < 2) return false;
  const modals = rows.map((row) => Number(row.modal_price)).filter((value) => Number.isFinite(value));
  if (modals.length < 2) return false;
  const unique = new Set(modals).size;
  const spread = Math.max(...modals) - Math.min(...modals);
  return unique >= 3 && spread > 0;
};

const parseTransportFare = (responseRows) => {
  const row = Array.isArray(responseRows) ? responseRows[0] : null;
  const amount = Number(row?.estimated_cost_inr || row?.estimated_fare || row?.price || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid estimated transport fare');
  }

  return {
    estimatedCost: Math.round(amount),
    distanceKm: Number(row?.distance_km || 0) || null,
    summary: row?.reason || row?.pricing_logic || 'Estimated by Groq',
  };
};

export const estimateTransportPrice = async ({
  commodity,
  quantityKg,
  fromAddress,
  toAddress,
}) => {
  const prompt = `You are an India logistics pricing assistant.
Estimate realistic one-way truck transport fare in INR for agricultural produce.

Inputs:
- Commodity: ${commodity}
- Quantity (kg): ${quantityKg}
- From: ${fromAddress}
- To: ${toAddress}

Return ONLY valid JSON array with exactly one object:
[
  {
    "estimated_cost_inr": 2450,
    "distance_km": 128,
    "reason": "Short explanation in one line"
  }
]

Rules:
- amount must be positive integer in INR
- distance_km should be realistic approximation
- no markdown, no extra text`;

  try {
    const data = await callGroq(PRIMARY_GROQ_API_KEY, prompt);
    return parseTransportFare(data);
  } catch {
    const data = await callGroq(SECONDARY_GROQ_API_KEY, prompt);
    return parseTransportFare(data);
  }
};

const normalizeNumeric = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeInsightRows = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row) => row?.crop)
    .map((row, index) => ({
      rank: normalizeNumeric(row.rank, index + 1),
      crop: String(row.crop || '').trim(),
      state: String(row.state || ''),
      district: String(row.district || ''),
      production_index: normalizeNumeric(row.production_index, 0),
      demand_index: normalizeNumeric(row.demand_index, 0),
      surplus_tonnes: normalizeNumeric(row.surplus_tonnes, 0),
      demand_tonnes: normalizeNumeric(row.demand_tonnes, 0),
    }));
};

const normalizeTrendRows = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row) => row?.month)
    .map((row) => ({
      month: String(row.month || '').trim(),
      demand_index: normalizeNumeric(row.demand_index, 0),
      arrival_index: normalizeNumeric(row.arrival_index, 0),
      price_index: normalizeNumeric(row.price_index, 0),
    }));
};

export const fetchCropMarketIntelligence = async ({ state = 'India' } = {}) => {
  const nowIso = new Date().toISOString();
  const prompt = `You are an Indian agri market analyst.
Generate 2026 market intelligence for crops in ${state}.
Current timestamp: ${nowIso}

Return ONLY a valid JSON object with this exact shape:
{
  "excess_crops": [
    {
      "rank": 1,
      "crop": "Tomato",
      "state": "${state}",
      "district": "Kolar",
      "production_index": 92,
      "surplus_tonnes": 18500
    }
  ],
  "demand_crops": [
    {
      "rank": 1,
      "crop": "Maize",
      "state": "${state}",
      "district": "Belagavi",
      "demand_index": 95,
      "demand_tonnes": 16200
    }
  ],
  "state_demand_trend": [
    {
      "month": "Apr",
      "demand_index": 76,
      "arrival_index": 68,
      "price_index": 72
    }
  ]
}

Rules:
- Exactly 10 items in excess_crops and 10 items in demand_crops.
- Exactly 6 items in state_demand_trend with realistic month-on-month variation.
- Rank must be 1 to 10.
- production_index and demand_index should be in range 0-100.
- Avoid almost-flat series. Keep visible ups/downs in state_demand_trend.
- Use realistic India 2026 style crop trends.
- Output JSON only.`;

  const callAndNormalize = async (key) => {
    const data = await callGroq(key, prompt);
    const base = Array.isArray(data) && data.length ? data[0] : {};
    return {
      excessCrops: normalizeInsightRows(base.excess_crops || base.excessCrops || []),
      demandCrops: normalizeInsightRows(base.demand_crops || base.demandCrops || []),
      demandTrend: normalizeTrendRows(base.state_demand_trend || base.stateDemandTrend || []),
      fetchedAt: nowIso,
    };
  };

  try {
    return await callAndNormalize(PRIMARY_GROQ_API_KEY);
  } catch {
    return callAndNormalize(SECONDARY_GROQ_API_KEY);
  }
};

export const fetchWhatToGrowRecommendations = async ({ state = 'India' } = {}) => {
  const prompt = `You are an agri advisory expert for India.
Suggest top 10 crops farmers should grow in ${state} based on market demand.

Return ONLY a valid JSON array sorted by demand descending:
[
  {
    "rank": 1,
    "crop": "Maize",
    "demand_index": 95,
    "why": "2-3 sentence explanation with market demand logic, price trend, and suitability."
  }
]

Rules:
- Exactly 10 items.
- rank from 1 to 10.
- demand_index range 0-100.
- why must be concise paragraph (2-3 sentences).
- JSON only, no markdown.`;

  const callAndNormalize = async (key) => {
    const data = await callGroq(key, prompt);
    const rows = Array.isArray(data) ? data : [];
    return rows
      .filter((row) => row?.crop)
      .map((row, index) => ({
        rank: normalizeNumeric(row.rank, index + 1),
        crop: String(row.crop || '').trim(),
        demand_index: normalizeNumeric(row.demand_index, 0),
        why: String(row.why || '').trim(),
      }))
      .sort((a, b) => b.demand_index - a.demand_index)
      .slice(0, 10);
  };

  try {
    return await callAndNormalize(PRIMARY_GROQ_API_KEY);
  } catch {
    return callAndNormalize(SECONDARY_GROQ_API_KEY);
  }
};
