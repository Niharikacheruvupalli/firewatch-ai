/**
 * FIREWATCH AI - Interactive Fire Map Component
 * Implements Leaflet map with CartoDB Dark Matter tiles, marker clustering, priority-based thermal pins, and real-time filtering.
 */

export class FireMapComponent {
  constructor(appState) {
    this.appState = appState;
    this.map = null;
    this.clusterGroup = null;
    this.filters = {
      priority: 'all',
      satellite: 'all',
      minFrp: 0,
      minConfidence: 0,
      dateRange: 'all'
    };
  }

  destroyMap() {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.clusterGroup = null;
    }
  }

  render(container) {
    this.destroyMap();

    const scored = this.appState.scoredRecords || [];
    const satellites = [...new Set(scored.map(r => r.satellite).filter(Boolean))];

    let html = `
      <div class="space-y-4">
        <!-- Map Control Bar & Filters -->
        <div class="p-4 rounded-xl bg-[#0F172A] border border-[#1E293B] flex flex-wrap items-center justify-between gap-4">
          <div class="flex flex-wrap items-center gap-3 text-xs">
            <!-- Priority Filter -->
            <div class="flex items-center space-x-1.5">
              <span class="text-slate-400 font-medium">Priority:</span>
              <select id="map-filter-priority" class="bg-[#1E293B] text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-500">
                <option value="all">All Priorities (${scored.length})</option>
                <option value="High">High Priority Only</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>

            <!-- Satellite Filter -->
            <div class="flex items-center space-x-1.5">
              <span class="text-slate-400 font-medium">Satellite:</span>
              <select id="map-filter-sat" class="bg-[#1E293B] text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-500">
                <option value="all">All Sensors</option>
                ${satellites.map(sat => `<option value="${sat}">${sat}</option>`).join('')}
              </select>
            </div>

            <!-- Min FRP Slider -->
            <div class="flex items-center space-x-2">
              <span class="text-slate-400 font-medium">Min FRP:</span>
              <input type="range" id="map-filter-frp" min="0" max="300" step="10" value="${this.filters.minFrp}" class="w-20 cursor-pointer" />
              <span id="map-filter-frp-val" class="font-mono text-orange-400 min-w-[50px]">${this.filters.minFrp} MW</span>
            </div>

            <!-- Min Confidence Slider -->
            <div class="flex items-center space-x-2">
              <span class="text-slate-400 font-medium">Min Conf:</span>
              <input type="range" id="map-filter-conf" min="0" max="100" step="5" value="${this.filters.minConfidence}" class="w-20 cursor-pointer" />
              <span id="map-filter-conf-val" class="font-mono text-emerald-400 min-w-[40px]">${this.filters.minConfidence}%</span>
            </div>
          </div>

          <!-- Quick Stats / Reset Button -->
          <div class="flex items-center space-x-2.5">
            <span id="map-visible-count" class="text-xs font-mono text-slate-400">
              Showing: <strong class="text-white">${scored.length}</strong> detections
            </span>
            <button id="map-reset-btn" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition">
              Reset Filters
            </button>
          </div>
        </div>

        <!-- Map Container & Thermal Anomaly Disclaimer Overlay -->
        <div class="relative w-full h-[640px] rounded-xl overflow-hidden border border-[#1E293B] bg-[#070B14] shadow-2xl">
          <div id="leaflet-map" class="w-full h-full z-10"></div>

          <!-- Bottom Floating Disclaimer Tag -->
          <div class="absolute bottom-4 left-4 z-20 max-w-md p-3 rounded-lg bg-[#0F172A]/90 backdrop-blur border border-amber-900/60 shadow-xl text-[11px] text-slate-300 pointer-events-auto">
            <div class="flex items-center gap-1.5 font-semibold text-amber-400 mb-0.5">
              <i data-lucide="shield-alert" class="w-4 h-4 flex-shrink-0"></i>
              <span>Thermal Anomaly Verification Notice</span>
            </div>
            <p class="text-slate-400 leading-snug">
              Map plots satellite-detected thermal radiance anomalies (MODIS/VIIRS), <strong class="text-slate-200">not verified wildfires</strong>. Cloud cover and orbit revisit intervals impact coverage.
            </p>
          </div>

          <!-- Legend Overlay -->
          <div class="absolute top-4 right-4 z-20 p-3 rounded-lg bg-[#0F172A]/90 backdrop-blur border border-[#1E293B] shadow-xl text-xs space-y-1.5 pointer-events-auto">
            <div class="font-semibold text-slate-300 text-[11px] uppercase tracking-wider mb-1">Review Priority</div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-[#EF4444] shadow-[0_0_8px_#EF4444]"></span>
              <span class="text-slate-300 text-[11px]">High (&ge; 70)</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-[#F59E0B] shadow-[0_0_6px_#F59E0B]"></span>
              <span class="text-slate-300 text-[11px]">Medium (40–69)</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-[#64748B]"></span>
              <span class="text-slate-400 text-[11px]">Low (&lt; 40)</span>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    if (window.lucide) {
      window.lucide.createIcons();
    }

    this.attachEventListeners();
    this.initMap(scored);
  }

  attachEventListeners() {
    const pSel = document.getElementById('map-filter-priority');
    if (pSel) pSel.onchange = (e) => { this.filters.priority = e.target.value; this.updateMarkers(); };

    const sSel = document.getElementById('map-filter-sat');
    if (sSel) sSel.onchange = (e) => { this.filters.satellite = e.target.value; this.updateMarkers(); };

    const frpSlider = document.getElementById('map-filter-frp');
    if (frpSlider) {
      frpSlider.oninput = (e) => {
        this.filters.minFrp = parseFloat(e.target.value);
        document.getElementById('map-filter-frp-val').innerText = `${this.filters.minFrp} MW`;
        this.updateMarkers();
      };
    }

    const confSlider = document.getElementById('map-filter-conf');
    if (confSlider) {
      confSlider.oninput = (e) => {
        this.filters.minConfidence = parseFloat(e.target.value);
        document.getElementById('map-filter-conf-val').innerText = `${this.filters.minConfidence}%`;
        this.updateMarkers();
      };
    }

    const resetBtn = document.getElementById('map-reset-btn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        this.filters = { priority: 'all', satellite: 'all', minFrp: 0, minConfidence: 0, dateRange: 'all' };
        if (pSel) pSel.value = 'all';
        if (sSel) sSel.value = 'all';
        if (frpSlider) { frpSlider.value = 0; document.getElementById('map-filter-frp-val').innerText = '0 MW'; }
        if (confSlider) { confSlider.value = 0; document.getElementById('map-filter-conf-val').innerText = '0%'; }
        this.updateMarkers();
      };
    }
  }

  initMap(records) {
    const mapEl = document.getElementById('leaflet-map');
    if (!mapEl || typeof L === 'undefined') return;

    // Default center (Western North America wildfire corridor)
    let initialCenter = [40.5, -120.0];
    let initialZoom = 6;

    if (records.length > 0) {
      const avgLat = records.reduce((acc, r) => acc + r.latitude, 0) / records.length;
      const avgLon = records.reduce((acc, r) => acc + r.longitude, 0) / records.length;
      initialCenter = [avgLat, avgLon];
    }

    this.map = L.map('leaflet-map', {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: true,
      attributionControl: true
    });

    // Dark Matter Tiles (CartoDB) - perfect for night/dark navy fire intelligence
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);

    // Marker cluster setup if L.markerClusterGroup is available
    if (typeof L.markerClusterGroup === 'function') {
      this.clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          let cClass = 'marker-cluster-fire-small';
          let size = 36;
          if (count > 15) {
            cClass = 'marker-cluster-fire-large';
            size = 48;
          } else if (count > 5) {
            cClass = 'marker-cluster-fire-medium';
            size = 42;
          }

          return L.divIcon({
            html: `<div class="marker-cluster-fire ${cClass}" style="width:${size}px; height:${size}px;">${count}</div>`,
            className: 'custom-cluster-icon',
            iconSize: L.point(size, size)
          });
        }
      });
      this.map.addLayer(this.clusterGroup);
    }

    this.updateMarkers();

    // Ensure map bounds align properly after rendering
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
        if (records.length > 0) {
          const bounds = L.latLngBounds(records.map(r => [r.latitude, r.longitude]));
          if (bounds.isValid()) {
            this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
          }
        }
      }
    }, 200);
  }

  updateMarkers() {
    if (!this.map) return;

    const scored = this.appState.scoredRecords || [];
    const filtered = scored.filter(r => {
      if (this.filters.priority !== 'all' && r.priority_category !== this.filters.priority) return false;
      if (this.filters.satellite !== 'all' && r.satellite !== this.filters.satellite) return false;
      if (r.frp < this.filters.minFrp) return false;
      if (r.confidence_percent < this.filters.minConfidence) return false;
      return true;
    });

    // Update count display
    const countEl = document.getElementById('map-visible-count');
    if (countEl) {
      countEl.innerHTML = `Showing: <strong class="text-white">${filtered.length}</strong> of ${scored.length} detections`;
    }

    // Clear existing markers
    if (this.clusterGroup) {
      this.clusterGroup.clearLayers();
    } else {
      // Clear manual layer markers if cluster group not available
      this.map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
          this.map.removeLayer(layer);
        }
      });
    }

    // Plot filtered records
    filtered.forEach(record => {
      const pinClass = record.priority_category.toLowerCase();
      const customIcon = L.divIcon({
        className: 'custom-fire-marker',
        html: `
          <div class="fire-marker-pin ${pinClass}" title="Score: ${record.score} (${record.priority_category})">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
            </svg>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
      });

      const marker = L.marker([record.latitude, record.longitude], { icon: customIcon });

      // Popup Content
      const popupHtml = `
        <div class="p-2 space-y-2 font-sans min-w-[240px]">
          <div class="flex items-center justify-between border-b border-slate-700/80 pb-2">
            <div>
              <span class="text-xs font-semibold text-white">Thermal Anomaly</span>
              <div class="text-[10px] text-slate-400 font-mono">${record.latitude.toFixed(4)}, ${record.longitude.toFixed(4)}</div>
            </div>
            <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold badge-${record.priority_class}">
              ${record.score} • ${record.priority_category}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-slate-300">
            <div>
              <span class="text-slate-400 text-[10px] block">TIMESTAMP (UTC)</span>
              <span>${record.acq_date} ${record.acq_time}</span>
            </div>
            <div>
              <span class="text-slate-400 text-[10px] block">SATELLITE</span>
              <span>${record.satellite} (${record.daynight})</span>
            </div>
            <div>
              <span class="text-slate-400 text-[10px] block">FRP (RADIANCE)</span>
              <span class="${record.frp >= 150 ? 'text-orange-400 font-bold' : 'text-slate-200'}">${record.frp} MW</span>
            </div>
            <div>
              <span class="text-slate-400 text-[10px] block">CONFIDENCE</span>
              <span>${record.confidence_percent}% (${record.confidence_raw})</span>
            </div>
          </div>

          <div class="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 leading-snug">
            ${record.narrative}
          </div>

          <button onclick="window.firewatchApp.inspectRecord('${record.id}')" class="w-full mt-1 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition text-center shadow">
            Inspect Full Triage Breakdown
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 300 });

      if (this.clusterGroup) {
        this.clusterGroup.addLayer(marker);
      } else {
        marker.addTo(this.map);
      }
    });
  }

  flyToCoordinates(lat, lon, zoom = 12) {
    if (this.map) {
      this.map.flyTo([lat, lon], zoom, { duration: 1.2 });
    }
  }
}
