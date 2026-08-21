const BASE_URL = 'http://127.0.0.1:8000/api';

export async function getFilters() {
  const response = await fetch(`${BASE_URL}/filters/`);
  if (!response.ok) throw new Error('Failed to fetch filters');
  return response.json();
}

export async function getHistory(state, district, market, commodity, days = 30) {
  const url = `${BASE_URL}/history?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&market=${encodeURIComponent(market)}&commodity=${encodeURIComponent(commodity)}&days=${days}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch history');
  return response.json();
}

export async function getForecast(commodity, district, market) {
  const response = await fetch(`${BASE_URL}/forecast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commodity, district, market })
  });
  if (!response.ok) throw new Error('Failed to fetch forecast');
  return response.json();
}

export async function getRecommendation(commodity, district, market) {
  const url = `${BASE_URL}/recommendation?commodity=${encodeURIComponent(commodity)}&district=${encodeURIComponent(district)}&market=${encodeURIComponent(market)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch recommendation');
  return response.json();
}

export async function getExplanation(recommendationJson, lang) {
  const response = await fetch(`${BASE_URL}/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recommendation_json: recommendationJson, lang })
  });
  if (!response.ok) throw new Error('Failed to fetch explanation');
  return response.json();
}

export async function getRouting(lat, lon, commodity, quantity) {
  const response = await fetch(`${BASE_URL}/routing/best-market`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lon, commodity, quantity })
  });
  if (!response.ok) throw new Error('Failed to fetch routing');
  return response.json();
}

export async function subscribAlerts(phone, state, district, commodity, lang) {
  const response = await fetch(`${BASE_URL}/alerts/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, state, district, commodity, lang })
  });
  if (!response.ok) throw new Error('Failed to subscribe to alerts');
  return response.json();
}

export async function getETLReport() {
  const response = await fetch(`${BASE_URL}/etl-report`);
  if (!response.ok) throw new Error('Failed to fetch ETL report');
  return response.json();
}

export async function getRoadmap(crop, location) {
  const url = `${BASE_URL}/routing/roadmap/?crop=${encodeURIComponent(crop.toLowerCase())}&location=${encodeURIComponent(location.toLowerCase())}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch roadmap: ${response.statusText}`);
  }
  const data = await response.json();

  const iconTypes = ["Sprout", "CloudSun", "Warehouse", "TrendingUp"];
  const phaseTypes = ["Seed Variety", "Weather & Sowing Window", "Storage Strategy", "Target Peak Window"];

  const mappedSteps = data.steps.map((s, idx) => ({
    phase: phaseTypes[idx] || s.title,
    title: s.title,
    summary: s.summary,
    details: s.detail,
    icon: iconTypes[idx] || "Sprout"
  }));

  const perishable = data.steps.find(s => s.step === 3)?.perishable || false;

  return {
    perishable,
    steps: mappedSteps
  };
}

