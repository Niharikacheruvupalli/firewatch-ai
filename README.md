# FIREWATCH AI — Satellite-Derived Active Fire Triage Dashboard

> **Environmental Intelligence & Analyst Decision Support System**  
> Ingests NASA FIRMS satellite thermal anomaly observations, applies comprehensive data validation, visualizes detections on an interactive Leaflet map with clustering, and ranks observations using explainable priority heuristics.

---

## 1. Quick Start

### Option A: 1-Click Launch (Recommended on Windows)
Simply double-click:
```cmd
serve.bat
```
or run in PowerShell:
```powershell
.\serve.ps1
```
This starts a zero-dependency local static web server on `http://localhost:3000` and automatically launches your browser.

### Option B: Standalone File Launch
Double-click `index.html` to open directly in any modern browser (Chrome, Edge, Firefox, Safari).

### Option C: Python HTTP Server (if Python is installed)
```bash
python -m http.server 3000
```

---

## 2. Core Capabilities

### Dashboard Overview
- **Dynamic Metric Cards**: Ingested observations, valid records, rejected rows with audit traces, and high-priority review queue.
- **Interactive Visualizations**:
  - Review Priority Category breakdown (Doughnut).
  - Radiometric Detection Confidence distribution (Bar).
  - Satellite Overpass Timeline (Line).

### Data Ingestion & Integrity Validation
- Validates standard NASA FIRMS CSV attributes: `latitude`, `longitude`, `acq_date`, `acq_time`, `confidence`, `frp`, `brightness`, `bright_t31`, `satellite`, `instrument`, `daynight`.
- **Integrity Boundary Checks**:
  - Latitude: $[-90.0^\circ, +90.0^\circ]$
  - Longitude: $[-180.0^\circ, +180.0^\circ]$
  - Calendar Dates: strict ISO $YYYY-MM-DD$ parsing.
  - Acquisition Times: $HHMM$ 4-digit formatting ($00:00$ to $23:59$).
  - Fire Radiative Power (FRP): non-negative MW values.
  - Duplicate Detection: flags identical coordinates, satellite passes, and timestamps.
- **Never Silently Discards Records**: Generates a row-by-row Validation Audit Log detailing every rejection reason.
- **Exports**: Download Triaged CSV with score contributions or export the Validation Audit Report as CSV/JSON.
- **Sample Datasets Included**:
  - *Active Wildfire Complex*: 50 authentic VIIRS and MODIS records.
  - *Validation Stress Test*: Corrupted records (out-of-bounds coords, corrupted dates, negative FRP, duplicate strikes).

### Interactive Fire Map
- **CartoDB Dark Matter Tiles**: Optimized for thermal radiance contrast in dark navy interface.
- **Dynamic Marker Clustering**: Groups nearby detections; expands automatically on zoom.
- **Custom Glowing Pins**: Red pulsing markers for High Priority ($\ge 70$), Amber for Medium ($40-69$), and Slate for Low ($< 40$).
- **Live Filtering**: Filter by Priority Urgency, Satellite Sensor, Minimum FRP, and Confidence percentage.
- **Inspection Popups**: Quick telemetry summaries with 1-click jump to full triage inspection.

### Explainable Heuristic Priority Scoring
A transparent 0–100 composite triage score with user-configurable weights:
$$\text{Score} = \left[ w_{\text{recency}} \cdot S_{\text{recency}} + w_{\text{conf}} \cdot S_{\text{conf}} + w_{\text{frp}} \cdot S_{\text{frp}} + w_{\text{repeat}} \cdot S_{\text{repeat}} \right] \times 100$$

| Dimension | Default Weight | Normalization Formula | Description |
| :--- | :--- | :--- | :--- |
| **Recency** | **30%** | $S_{\text{recency}} = \max(0, 1 - \frac{\Delta t}{T_{\max}})$ | Linear decay over elapsed hours from newest satellite pass. |
| **Confidence** | **25%** | $S_{\text{conf}} = \frac{\text{conf}}{100}$ | MODIS 0–100%. VIIRS categorical: High=0.95, Nominal=0.65, Low=0.25. |
| **Thermal Radiance (FRP)** | **25%** | $S_{\text{frp}} = \min(1.0, \frac{\ln(1 + \text{FRP})}{\ln(1 + \text{FRP}_{\text{ref}})})$ | Soft log-scaling with reference $300\text{ MW}$ (prevents extreme outlier skew). |
| **Repeat Proximity** | **20%** | $S_{\text{repeat}} = \min(1.0, \frac{N_{\text{nearby}} - 1}{4})$ | Haversine clustering within $1.5\text{ km}$ radius. Single=0, 5+=1.0. |

- **Missing Values**: Imputed to nominal baselines ($5.0\text{ MW}$ FRP, $50\%$ confidence) with explicit warnings recorded in the inspection report.
- **Interactive Tuning**: Live sliders with auto-balancing to ensure total weights always equal 100%.

### Ranked Observations Table & Detail Inspection
- Multi-column sortable, searchable, filterable data grid.
- Slide-over inspection drawer with factor progress bars, exact mathematical formulas, and raw satellite telemetry.
- Direct "Locate on Fire Map" fly-to action.

---

## 3. Running Automated Tests

### Option A: In-Browser Test Suite
Open `tests/test_runner.html` in your browser, or click the **"Run Tests"** button in the dashboard top navigation bar.

### Option B: Terminal PowerShell Suite
Run:
```powershell
powershell -ExecutionPolicy Bypass -File tests/run_tests.ps1
```

---

## 4. Safety & Operational Limitations

1. **Satellite Detections &ne; Confirmed Wildfires**: Middle-infrared radiometers detect heat anomalies. Non-wildfire sources (industrial gas flaring, agricultural burns, geothermal vents, solar reflection) can trigger false positives.
2. **Cloud & Smoke Limitations**: Thick cloud cover and pyrocumulus smoke columns absorb infrared radiance. **Absence of detection does not guarantee an area is fire-free.**
3. **Orbit Timing**: Polar satellites revisit locations 1–2 times daily per sensor, introducing data latency of 30–180 minutes.
4. **Heuristic Ranking**: The 0–100 score is an analyst queue-ordering heuristic, not an operational fire spread prediction model.
5. **No Direct Emergency Dispatching**: Always cross-reference with official incident command agencies (e.g. InciWeb, NIFC, CAL FIRE).

---

## 5. External Data Source
NASA Fire Information for Resource Management System (FIRMS):  
https://firms.modaps.eosdis.nasa.gov/
