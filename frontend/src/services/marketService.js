const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

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
  const prompt = `You are an Indian agricultural market price expert.
Provide current approximate wholesale mandi prices for ${commodity}
in ${district}, ${state}, India.

Based on current market trends in 2026, provide realistic price data.
Return ONLY a valid JSON array with 5-8 entries, no markdown, no explanation:

[
  {
    "commodity": "${commodity}",
    "variety": "variety name",
    "market": "market/mandi name in ${district}",
    "state": "${state}",
    "district": "${district}",
    "min_price": 1800,
    "max_price": 2200,
    "modal_price": 2000,
    "unit": "per quintal",
    "date": "23-03-2026"
  }
]

Include 3-5 different varieties or nearby markets.
Use realistic 2026 Indian mandi prices in INR per quintal.
If commodity not found in that region suggest nearest available market.`;

  try {
    return await callGroq(PRIMARY_GROQ_API_KEY, prompt);
  } catch {
    return callGroq(SECONDARY_GROQ_API_KEY, prompt);
  }
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
