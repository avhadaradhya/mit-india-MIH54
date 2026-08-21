# Product Requirements Document (PRD)
## Project: AI-Driven Crop Price Forecasting & Market Routing App (PSE09)
**Code Name:** MandiRoute AI / KrishiNiti

### 1. Product Overview
**Problem Statement:** Farmers lose significant income due to post-harvest price crashes and a lack of localized market intelligence. They often sell at the nearest mandi at distress prices, unaware that a mandi 50km away might offer a significantly higher margin even after factoring in transport costs.
**Objective:** Deliver a highly accessible tool that predicts crop prices 7-14 days in advance and optimizes the selling location by calculating the *true net profit* (Selling Price - Transportation Cost).

### 2. Target Audience
*   **Primary Users:** Small to medium-scale farmers in India (Tier 2/Tier 3 regions).
*   **Secondary Users:** Farmer Producer Organizations (FPOs) managing bulk logistics, and local transport aggregators.

### 3. Core Features (MVP Scope for Hackathon)
1.  **Time-Series Price Predictor (The "Hold or Sell" Engine):**
    *   Predicts prices for 3-5 major crops (e.g., Onion, Tomato, Wheat) 7-14 days ahead using Agmarknet & IMD weather data.
    *   Outputs a simple, binary "Hold" or "Sell Today" recommendation based on the forecast.
2.  **Net Profit Routing Engine (The Differentiator):**
    *   User inputs crop volume (in quintals) and current location.
    *   System queries top 3 mandis within a 100km radius.
    *   Calculates estimated transport cost (distance × standard per-km truck rate).
    *   Returns the *Net Profit* for each mandi, ranking them by actual money-in-pocket, not just raw selling price.
3.  **Omnichannel Alerts (WhatsApp Integration):**
    *   Farmers can subscribe to peak price alerts for their crop via a WhatsApp bot.
4.  **Vernacular UI:**
    *   Clean, icon-heavy React frontend with language support (Hindi, Marathi, English) designed for low-literacy users.

### 4. Technical Architecture & Stack
*   **Design & Prototyping:** Figma (for high-fidelity UI/UX flows).
*   **Frontend:** React.js, Tailwind CSS (Mobile-first progressive web app).
*   **Backend API & Routing:** Java Spring Boot or Python FastAPI.
*   **Database:** MySQL (for user profiles, saved routes, and cached mandi coordinates).
*   **Machine Learning:** Python (Prophet or XGBoost) deployed as a microservice for price forecasting.
*   **External APIs:** 
    *   Google Maps Distance Matrix API (for precise transport routing).
    *   Twilio / Meta WhatsApp API (for alerts).
    *   Agmarknet & IMD (Ingested via scheduled chron jobs).

---

## Strategic Implementation Plan (48-Hour Roadmap)

### Phase 1: Data Ingestion & Setup (Hours 0-6)
*   **Task 1:** Set up the GitHub repository and project boards. 
*   **Task 2:** Build initial UI mockups in Figma to lock down the user flow.
*   **Task 3:** Write a Python script to scrape/download the latest Agmarknet CSVs and clean the data. Setup the MySQL schema to store mandi locations, historical prices, and user data.

### Phase 2: Predictive Modeling (Hours 6-18)
*   **Task 1:** Train a time-series model (e.g., Facebook Prophet) on historical Agmarknet data + IMD weather overlays for 2 specific crops (e.g., Onion in Maharashtra).
*   **Task 2:** Expose this model via a simple REST endpoint (`/api/forecast?crop=onion&mandi=pune`).
*   **Task 3:** Setup basic React scaffolding and connect to the database.

### Phase 3: The Routing Engine & Frontend (Hours 18-36)
*   **Task 1:** Build the core logic: `Profit = (Predicted Price * Volume) - (Distance * Freight Rate)`.
*   **Task 2:** Integrate Google Maps API to calculate the driving distance between the user's GPS ping and the surrounding mandis.
*   **Task 3:** Build the React frontend. Focus on a massive, intuitive "Check My Price" button and a card-based layout showing the Top 3 Mandis.

### Phase 4: Alerts & Polish (Hours 36-42)
*   **Task 1:** Integrate Twilio WhatsApp API. Allow users to register their phone number to receive a "Price Peak Alert".
*   **Task 2:** Refine the UI, ensure mobile responsiveness.

### Phase 5: Pitch Prep (Hours 42-48)
*   **Task 1:** Freeze code. Deploy the frontend (Vercel) and backend (Render/Railway).
*   **Task 2:** Prepare demo data. (Ensure you have a compelling case where a mandi further away yields higher profit to show the judges).

---

## Uniqueness & Differentiators (How to Win)
Most teams will simply plot a graph of future prices. To win, you must solve the *complete* problem:
1.  **The Net-Profit Focus:** Highlight that highest price ≠ highest profit. Deducting transit costs dynamically makes your tool instantly actionable.
2.  **The "No-App" Approach:** Emphasize the WhatsApp bot integration. Tell judges: "Farmers don't download apps. We bring the ML directly to their WhatsApp."
3.  **UI/UX Brilliance:** Use a traffic-light system. Green for "Sell", Red for "Hold". Remove complex charts and replace them with simple, bold financial numbers.

---

## Real-World Feasibility & Scalability

### Feasibility
*   **Data Availability:** High. Agmarknet provides daily prices, and IMD provides open weather data. 
*   **Tech Constraints:** The main bottleneck is real-time transport costs. For the MVP, a static freight rate (e.g., ₹20/km/ton) is perfectly acceptable and highly realistic.
*   **Adoption:** By offering the service via SMS/WhatsApp rather than a heavy mobile app, the friction to adoption is virtually zero.

### Scalability (100 -> 10,000 -> 1M Users)
*   **Infrastructure:** The heavy lifting (ML training) is done offline periodically (e.g., weekly model retrains). Inference is lightweight. The MySQL database handles user profiles and fast querying of cached results.
*   **Geographic Expansion:** Scaling simply requires ingesting more state-level APMC datasets into the training pipeline.
*   **Logistics Network:** As it scales, the platform can integrate real-time bidding from logistics APIs (like Porter/Rivigo) for exact transport costs.

---

## Business Model & Monetization

1.  **B2C Freemium (For Farmers/FPOs):**
    *   *Free Tier:* Basic 3-day price trends for local mandis.
    *   *Premium (₹99/month):* 14-day forecasts, net-profit routing to 100km radius, and unlimited WhatsApp alerts. FPOs can purchase bulk licenses.
2.  **B2B Data Monetization (Agri-Input Companies):**
    *   Anonymized data on which crops farmers are holding or moving can be sold to fertilizer/seed companies for supply chain planning.
3.  **Lead Generation (Logistics Providers):**
    *   Integrate a "Book Transport" button directly in the app. Take a 2-5% commission for routing the farmer's freight to local truck aggregators.
