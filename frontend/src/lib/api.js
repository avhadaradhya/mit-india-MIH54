const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

export async function getFilters() {
  const response = await fetch(`${BASE_URL}/filters/`);
  if (!response.ok) throw new Error('Failed to fetch filters');
  return response.json();
}

export async function getHistory(state, district, market, commodity, days = 30) {
  const params = new URLSearchParams({ state, district, market, commodity, days });
  const response = await fetch(`${BASE_URL}/history?${params}`);
  if (!response.ok) throw new Error('Failed to fetch history');
  return response.json();
}

export async function getCropRecommendation(district, quantity = 50, lang = 'en') {
  const response = await fetch(`${BASE_URL}/roadmap/crop-recommendation?district=${encodeURIComponent(district)}&quantity=${quantity}&lang=${lang}`);
  if (!response.ok) throw new Error('Failed to fetch crop recommendation');
  return response.json();
}

export async function getForecast(commodity, district, market, horizon = 14) {
  const response = await fetch(`${BASE_URL}/forecast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commodity, district, market, horizon }),
  });
  if (!response.ok) throw new Error('Failed to fetch forecast');
  return response.json();
}

export async function getRecommendation(commodity, district, market) {
  const params = new URLSearchParams({ commodity, district, market });
  const response = await fetch(`${BASE_URL}/recommendation?${params}`);
  if (!response.ok) throw new Error('Failed to fetch recommendation');
  return response.json();
}

export async function getExplanation(recommendationJson, lang = 'en') {
  const response = await fetch(`${BASE_URL}/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recommendation_json: recommendationJson, lang })
  });
  if (!response.ok) throw new Error('Failed to fetch explanation');
  const data = await response.json();
  return data.explanation;
}

export async function getCalculateExplanation(routingData, lang = 'en') {
  const response = await fetch(`${BASE_URL}/calculate-explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...routingData, lang })
  });
  if (!response.ok) throw new Error('Failed to fetch calculate explanation');
  const data = await response.json();
  return data.explanation;
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

export async function getRoadmap(crop, location) {
  const params = new URLSearchParams({ crop, location });
  const response = await fetch(`${BASE_URL}/routing/roadmap?${params}`);
  if (!response.ok) throw new Error('Failed to fetch roadmap');
  return response.json();
}

export async function subscribeAlerts(phone, state, district, commodity, lang) {
  const response = await fetch(`${BASE_URL}/alerts/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, state, district, commodity, lang })
  });
  if (!response.ok) throw new Error('Failed to subscribe');
  return response.json();
}

export async function simulateAlerts(phone, state, district, commodity, lang) {
  const response = await fetch(`${BASE_URL}/alerts/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, state, district, commodity, lang })
  });
  if (!response.ok) throw new Error('Failed to simulate alert');
  return response.json();
}

export async function getETLReport() {
  const response = await fetch(`${BASE_URL}/etl-report`);
  if (!response.ok) throw new Error('Failed to fetch ETL report');
  return response.json();
}
