const BASE_URL = 'http://127.0.0.1:8000/api';

// By default, if VITE_USE_MOCK is not set or is 'true', we use mock data.
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

// Helper to delay simulation of loading states
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function getForecast(crop, mandi) {
  if (USE_MOCK) {
    await delay(600); // simulate network latency
    let basePrice = 2000;
    if (crop === 'Tomato') basePrice = 1500;
    else if (crop === 'Wheat') basePrice = 2200;
    else if (crop === 'Soybean') basePrice = 3800;
    else if (crop === 'Onion') basePrice = 2400;

    const prices = [];
    const today = new Date();
    
    // 7 days of history (indices 0 to 6)
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      // Add slight upward or downward trend with variation
      const factor = (6 - i) * 15 + Math.sin(6 - i) * 25;
      prices.push({
        date: dateStr,
        price: Math.round(basePrice + factor),
        is_forecast: false
      });
    }

    const currentPrice = prices[prices.length - 1].price;

    // 14 days forecast
    const isHold = crop === 'Onion' || crop === 'Soybean';
    const holdDays = isHold ? (crop === 'Onion' ? 8 : 12) : 0;
    
    let peakPrice = currentPrice;

    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      
      let price = currentPrice;
      if (isHold) {
        // Price rises and peaks at holdDays
        if (i <= holdDays) {
          price = Math.round(currentPrice + (i * (crop === 'Onion' ? 55 : 45)) + Math.sin(i) * 15);
        } else {
          const peak = currentPrice + (holdDays * (crop === 'Onion' ? 55 : 45));
          price = Math.round(peak - ((i - holdDays) * 30));
        }
      } else {
        // Price falls slightly
        price = Math.round(currentPrice - (i * 25) + Math.cos(i) * 20);
      }

      if (price > peakPrice) {
        peakPrice = price;
      }

      prices.push({
        date: dateStr,
        price: price,
        is_forecast: true
      });
    }

    const jump = peakPrice - currentPrice;
    const decision = isHold && jump > 100 ? 'HOLD' : 'SELL';

    return {
      crop,
      mandi: mandi || 'Pune Mandi',
      recommendation: {
        decision,
        hold_days: decision === 'HOLD' ? holdDays : 0,
        current_price: currentPrice,
        predicted_peak_price: peakPrice,
        predicted_jump: Math.max(0, jump)
      },
      prices
    };
  }

  const response = await fetch(`${BASE_URL}/forecast/?crop=${encodeURIComponent(crop)}&mandi=${encodeURIComponent(mandi)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch forecast: ${response.statusText}`);
  }
  return await response.json();
}

export async function getRouting(crop, quintals, location) {
  if (USE_MOCK) {
    await delay(700); // simulate network latency
    let basePrice = 2200;
    if (crop === 'Tomato') basePrice = 1400;
    else if (crop === 'Wheat') basePrice = 2100;
    else if (crop === 'Soybean') basePrice = 3900;
    else if (crop === 'Onion') basePrice = 2300;

    const locationDistanceOffset = {
      'Pune': { 'Pune Mandi': 15, 'Mumbai Mandi': 150, 'Nashik Mandi': 210, 'Solapur Mandi': 250, 'Ahmednagar Mandi': 120 },
      'Solapur': { 'Solapur Mandi': 10, 'Pune Mandi': 250, 'Mumbai Mandi': 390, 'Nashik Mandi': 360, 'Ahmednagar Mandi': 220 },
      'Nashik': { 'Nashik Mandi': 12, 'Pune Mandi': 210, 'Mumbai Mandi': 170, 'Ahmednagar Mandi': 140, 'Solapur Mandi': 360 },
      'Ahmednagar': { 'Ahmednagar Mandi': 15, 'Pune Mandi': 120, 'Nashik Mandi': 140, 'Solapur Mandi': 220, 'Mumbai Mandi': 270 }
    };

    const distances = locationDistanceOffset[location] || locationDistanceOffset['Pune'];
    
    const allMandis = Object.keys(distances).map(name => {
      const dist = distances[name];
      let priceOffset = 0;
      if (name === 'Mumbai Mandi') priceOffset = 250;
      else if (name === 'Pune Mandi') priceOffset = 50;
      else if (name === 'Solapur Mandi') priceOffset = -100;
      else if (name === 'Nashik Mandi') priceOffset = 0;
      else if (name === 'Ahmednagar Mandi') priceOffset = -50;

      const rawRate = basePrice + priceOffset;
      // Transport cost is proportional to distance and volume (quintals)
      // Standard rate: Rs. 3 per km per quintal
      const transportCost = Math.round(dist * 3 * quintals);
      // Mandi fee is 1.5% of gross sales
      const mandiFee = Math.round((rawRate * quintals) * 0.015);
      const netProfit = (rawRate * quintals) - transportCost - mandiFee;

      return {
        mandi_name: name,
        distance: dist,
        raw_rate: rawRate,
        transport_cost: transportCost,
        mandi_fee: mandiFee,
        net_profit: netProfit,
        is_top_recommendation: false
      };
    });

    // Sort by net profit descending
    allMandis.sort((a, b) => b.net_profit - a.net_profit);
    
    // Select top 3 mandis and highlight the first one
    const selectedMandis = allMandis.slice(0, 3);
    if (selectedMandis.length > 0) {
      selectedMandis[0].is_top_recommendation = true;
    }

    return selectedMandis;
  }

  const response = await fetch(`${BASE_URL}/routing/?crop=${encodeURIComponent(crop)}&quintals=${quintals}&location=${encodeURIComponent(location)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch routing: ${response.statusText}`);
  }
  return await response.json();
}

export async function getRoadmap(crop, location) {
  if (USE_MOCK) {
    await delay(500); // simulate network latency
    const perishable = crop === 'Tomato' || crop === 'Onion';

    const steps = [
      {
        phase: 'Seed Variety',
        title: crop === 'Onion' ? 'Bhima Kiran / N-2-4-1' :
               crop === 'Tomato' ? 'Abhinav Hybrid / Pusa' :
               crop === 'Wheat' ? 'GW-322 / Lok-1' : 'KDS-344 / JS-335',
        summary: crop === 'Onion' ? 'Pink/red varieties with high shelf life.' :
                 crop === 'Tomato' ? 'Heat-tolerant and blight-resistant hybrids.' :
                 crop === 'Wheat' ? 'Rust-resistant and early maturing varieties.' :
                 'High-germination seeds with leaf blight resistance.',
        details: crop === 'Onion' ? 'Bhima Kiran yields 12-15 tons/acre and stores for up to 6 months. Maintain seed rate of 3 kg/acre, raising nursery bed for 6-8 weeks.' :
                 crop === 'Tomato' ? 'Abhinav hybrids tolerate high moisture, ensuring firm skins for long transit. Treat seeds with Trichoderma viride to prevent damping off.' :
                 crop === 'Wheat' ? 'GW-322 yields well under timely irrigation. Protect with Azotobacter seed treatment.' :
                 'KDS-344 is highly resistant to root rot. Sow at 3-5 cm depth with Rhizobium culture.',
        icon: 'Sprout'
      },
      {
        phase: 'Weather & Sowing Window',
        title: crop === 'Onion' ? 'October - November Sowing' :
               crop === 'Tomato' ? 'August Nursery, October Transplanting' :
               crop === 'Wheat' ? 'November Peak Window' : 'June - July Sowing',
        summary: crop === 'Onion' ? 'Transplant seedlings when temp drops below 28°C.' :
                 crop === 'Tomato' ? 'Transplant into ridges and furrows on cloudy days.' :
                 crop === 'Wheat' ? 'Sow between Nov 10-25 to optimize winter grain filling.' :
                 'Sow after receiving first major monsoon shower (75mm).',
        details: crop === 'Onion' ? 'Onions require 15-25°C. Delayed transplanting reduces bulb sizes. Keep soil moist but avoid waterlogging.' :
                 crop === 'Tomato' ? 'Optimal temp 20-30°C. Protect seedling nursery with net mesh. Transplant on raised beds.' :
                 crop === 'Wheat' ? 'Early winter chill induces maximum tillering. Delaying sowing beyond mid-December reduces yields by 30-40 kg per day per acre.' :
                 'Requires continuous soil moisture. Check drainage channels to avoid root water saturation during heavy rains.',
        icon: 'CloudSun'
      },
      {
        phase: 'Storage Strategy',
        title: crop === 'Onion' ? 'Ventilated Kanda Chawl' :
               crop === 'Tomato' ? 'Short Holding / Cold Chain' :
               crop === 'Wheat' ? 'Dry Airtight Metal Silos' : 'Hermetic Storage Bags',
        summary: perishable ? 'Perishable crop: requires high ventilation/cold storage.' : 'Storage Buffer OK: can store safely for months.',
        details: crop === 'Onion' ? 'Store bulbs in dry, double-row ventilated bamboo structures (Kanda Chawl). Ensure air circulation from all sides. Sort rotting bulbs weekly.' :
                 crop === 'Tomato' ? 'Extremely perishable! Store Green-Mature tomatoes at 12-15°C for max 10 days. Package in clean, ventilated plastic crates.' :
                 crop === 'Wheat' ? 'Dry seeds below 12% moisture. Store in clean gunny bags on wooden pallets or airtight containers. Guard against weevils.' :
                 'Ensure seeds are dried below 9% moisture. Store in heavy poly-lined bags to block ambient humidity and prevent fungal mold.',
        icon: 'Warehouse'
      },
      {
        phase: 'Target Peak Window',
        title: crop === 'Onion' ? 'September - October Shortage Peak' :
               crop === 'Tomato' ? 'Late November Supply Deficit' :
               crop === 'Wheat' ? 'January - February Off-season Peak' : 'November - December Processing Demand',
        summary: crop === 'Onion' ? 'Aim for storage release during late autumn scarcity.' :
                 crop === 'Tomato' ? 'Short shelf life; track daily mandi prices to capture spikes.' :
                 crop === 'Wheat' ? 'Hold and sell post-monsoon stock in early winter.' :
                 'Sell during high crusher and extraction mill demand.',
        details: crop === 'Onion' ? 'Historical data shows market onion prices rise by 30-65% during autumn months. Releasing storage stock now yields maximum returns.' :
                 crop === 'Tomato' ? 'Tomato prices fluctuate hourly. Do not hold; check routing optimizer to identify high-rate mandis nearby.' :
                 crop === 'Wheat' ? 'Demand spikes right before spring harvests. Selling stocks in early winter avoids market crashes.' :
                 'Industrial soybean buyers offer higher rates for clean, low-moisture bulk loads in late autumn.',
        icon: 'TrendingUp'
      }
    ];

    return {
      perishable,
      steps
    };
  }

  const response = await fetch(`${BASE_URL}/roadmap/?crop=${encodeURIComponent(crop)}&location=${encodeURIComponent(location)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch roadmap: ${response.statusText}`);
  }
  return await response.json();
}
