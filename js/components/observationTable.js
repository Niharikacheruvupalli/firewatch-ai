/**
 * FIREWATCH AI - Ranked Observation Table & Detail Inspection Drawer
 * Full-featured grid with search, multi-column sorting, pagination, and transparent score inspection.
 */

import { ExportUtils } from '../engine/exportUtils.js';

export class ObservationTableComponent {
  constructor(appState) {
    this.appState = appState;
    this.searchQuery = '';
    this.priorityFilter = 'all';
    this.satelliteFilter = 'all';
    this.sortField = 'score';
    this.sortDirection = 'desc';
    this.currentPage = 1;
    this.pageSize = 15;
    this.activeInspectionRecord = null;
  }

  render(container) {
    const scored = this.appState.scoredRecords || [];
    const satellites = [...new Set(scored.map(r => r.satellite).filter(Boolean))];

    // Filter
    let filtered = scored.filter(record => {
      if (this.priorityFilter !== 'all' && record.priority_category !== this.priorityFilter) return false;
      if (this.satelliteFilter !== 'all' && record.satellite !== this.satelliteFilter) return false;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const str = `${record.latitude} ${record.longitude} ${record.acq_date} ${record.acq_time} ${record.satellite} ${record.priority_category} ${record.narrative}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let vA = a[this.sortField];
      let vB = b[this.sortField];

      if (this.sortField === 'coordinates') {
        vA = a.latitude;
        vB = b.latitude;
      }

      if (vA === undefined || vA === null) vA = '';
      if (vB === undefined || vB === null) vB = '';

      if (typeof vA === 'string') {
        const comp = vA.localeCompare(vB);
        return this.sortDirection === 'asc' ? comp : -comp;
      } else {
        return this.sortDirection === 'asc' ? (vA - vB) : (vB - vA);
      }
    });

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.pageSize));
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const pagedRecords = filtered.slice(startIndex, startIndex + this.pageSize);

    let html = `
      <div class="space-y-4">
        <!-- Search & Control Header -->
        <div class="p-4 rounded-xl bg-[#0F172A] border border-[#1E293B] flex flex-wrap items-center justify-between gap-4">
          <!-- Search input -->
          <div class="relative flex-1 min-w-[240px]">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-3"></i>
            <input
              type="text"
              id="table-search-input"
              value="${this.searchQuery}"
              placeholder="Search by coordinates, date, satellite, or keyword..."
              class="w-full bg-[#1E293B] text-slate-200 pl-9 pr-4 py-2 rounded-lg text-xs border border-slate-700 focus:outline-none focus:border-orange-500 placeholder-slate-500"
            />
          </div>

          <!-- Quick Filters -->
          <div class="flex flex-wrap items-center gap-2.5 text-xs">
            <select id="table-filter-priority" class="bg-[#1E293B] text-slate-200 border border-slate-700 rounded-lg px-2.5 py-2 text-xs focus:outline-none">
              <option value="all">All Priorities</option>
              <option value="High" ${this.priorityFilter === 'High' ? 'selected' : ''}>High Priority</option>
              <option value="Medium" ${this.priorityFilter === 'Medium' ? 'selected' : ''}>Medium Priority</option>
              <option value="Low" ${this.priorityFilter === 'Low' ? 'selected' : ''}>Low Priority</option>
            </select>

            <select id="table-filter-satellite" class="bg-[#1E293B] text-slate-200 border border-slate-700 rounded-lg px-2.5 py-2 text-xs focus:outline-none">
              <option value="all">All Satellites</option>
              ${satellites.map(sat => `<option value="${sat}" ${this.satelliteFilter === sat ? 'selected' : ''}>${sat}</option>`).join('')}
            </select>

            <!-- Export Filtered CSV Button -->
            <button id="table-export-btn" class="px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium text-xs flex items-center gap-1.5 shadow transition">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <!-- Table Grid Container -->
        <div class="rounded-xl bg-[#0F172A] border border-[#1E293B] overflow-hidden shadow-xl">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-[#131C31] text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th class="py-3 px-4 cursor-pointer hover:text-white" onclick="window.firewatchApp.sortTable('score')">
                    <div class="flex items-center gap-1">
                      <span>Priority Score</span>
                      ${this.renderSortIcon('score')}
                    </div>
                  </th>
                  <th class="py-3 px-3 cursor-pointer hover:text-white" onclick="window.firewatchApp.sortTable('priority_category')">
                    <div class="flex items-center gap-1">
                      <span>Category</span>
                      ${this.renderSortIcon('priority_category')}
                    </div>
                  </th>
                  <th class="py-3 px-3 cursor-pointer hover:text-white" onclick="window.firewatchApp.sortTable('acq_date')">
                    <div class="flex items-center gap-1">
                      <span>Acquisition Date/Time</span>
                      ${this.renderSortIcon('acq_date')}
                    </div>
                  </th>
                  <th class="py-3 px-3 cursor-pointer hover:text-white" onclick="window.firewatchApp.sortTable('coordinates')">
                    <div class="flex items-center gap-1">
                      <span>Coordinates</span>
                      ${this.renderSortIcon('coordinates')}
                    </div>
                  </th>
                  <th class="py-3 px-3 cursor-pointer hover:text-white" onclick="window.firewatchApp.sortTable('confidence_percent')">
                    <div class="flex items-center gap-1">
                      <span>Confidence</span>
                      ${this.renderSortIcon('confidence_percent')}
                    </div>
                  </th>
                  <th class="py-3 px-3 cursor-pointer hover:text-white" onclick="window.firewatchApp.sortTable('frp')">
                    <div class="flex items-center gap-1">
                      <span>FRP (MW)</span>
                      ${this.renderSortIcon('frp')}
                    </div>
                  </th>
                  <th class="py-3 px-3 cursor-pointer hover:text-white" onclick="window.firewatchApp.sortTable('brightness')">
                    <div class="flex items-center gap-1">
                      <span>Brightness</span>
                      ${this.renderSortIcon('brightness')}
                    </div>
                  </th>
                  <th class="py-3 px-3 cursor-pointer hover:text-white" onclick="window.firewatchApp.sortTable('repeat_count')">
                    <div class="flex items-center gap-1">
                      <span>Repeats (1.5km)</span>
                      ${this.renderSortIcon('repeat_count')}
                    </div>
                  </th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 font-mono text-slate-300">
                ${pagedRecords.length > 0 ? pagedRecords.map(r => `
                  <tr class="hover:bg-slate-800/40 transition cursor-pointer" onclick="window.firewatchApp.inspectRecord('${r.id}')">
                    <!-- Score -->
                    <td class="py-3.5 px-4">
                      <div class="flex items-center gap-2.5">
                        <span class="font-bold text-sm text-white">${r.score}</span>
                        <div class="w-14 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div class="h-full rounded-full" style="width: ${r.score}%; background-color: ${r.priority_color}"></div>
                        </div>
                      </div>
                    </td>

                    <!-- Category -->
                    <td class="py-3.5 px-3">
                      <span class="px-2 py-0.5 rounded text-[11px] font-semibold badge-${r.priority_class}">
                        ${r.priority_category}
                      </span>
                    </td>

                    <!-- Timestamp -->
                    <td class="py-3.5 px-3 font-sans">
                      <div class="font-medium text-slate-200">${r.acq_date} <span class="text-slate-400 font-mono text-[11px]">${r.acq_time}</span></div>
                      <div class="text-[11px] text-slate-400">${r.satellite} • ${r.daynight}</div>
                    </td>

                    <!-- Coordinates -->
                    <td class="py-3.5 px-3 text-slate-300">
                      ${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}
                    </td>

                    <!-- Confidence -->
                    <td class="py-3.5 px-3">
                      <div class="flex items-center gap-1.5">
                        <span class="font-semibold text-slate-200">${r.confidence_percent}%</span>
                        <span class="text-[10px] text-slate-500 uppercase">(${r.confidence_raw})</span>
                      </div>
                    </td>

                    <!-- FRP -->
                    <td class="py-3.5 px-3 font-semibold ${r.frp >= 150 ? 'text-orange-400 font-bold' : 'text-slate-200'}">
                      ${r.frp} MW
                    </td>

                    <!-- Brightness -->
                    <td class="py-3.5 px-3 text-slate-400">
                      ${r.brightness ? `${r.brightness} K` : '—'}
                    </td>

                    <!-- Repeat Count -->
                    <td class="py-3.5 px-3">
                      <span class="px-2 py-0.5 rounded text-xs ${r.repeat_count > 1 ? 'bg-orange-950/60 text-orange-400 border border-orange-800/50 font-bold' : 'text-slate-500'}">
                        ${r.repeat_count}x
                      </span>
                    </td>

                    <!-- Actions -->
                    <td class="py-3.5 px-4 text-right font-sans" onclick="event.stopPropagation()">
                      <button onclick="window.firewatchApp.inspectRecord('${r.id}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition border border-slate-700">
                        Details
                      </button>
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="9" class="py-12 text-center text-slate-500 font-sans">
                      <i data-lucide="filter-x" class="w-8 h-8 mx-auto mb-2 text-slate-600"></i>
                      <p>No observations match your current filter or search criteria.</p>
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div class="p-3.5 bg-[#0A0F1D] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div class="text-slate-400 font-mono">
              Showing ${filtered.length > 0 ? startIndex + 1 : 0}–${Math.min(filtered.length, startIndex + this.pageSize)} of <strong class="text-white">${filtered.length}</strong> observations
            </div>

            <div class="flex items-center space-x-2">
              <button
                ${this.currentPage === 1 ? 'disabled' : ''}
                onclick="window.firewatchApp.changePage(${this.currentPage - 1})"
                class="px-2.5 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition"
              >
                Previous
              </button>
              <span class="text-slate-400 font-mono text-[11px] px-2">Page ${this.currentPage} of ${totalPages}</span>
              <button
                ${this.currentPage >= totalPages ? 'disabled' : ''}
                onclick="window.firewatchApp.changePage(${this.currentPage + 1})"
                class="px-2.5 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <!-- Detail Inspection Drawer (Slide-over Modal) -->
        ${this.renderDetailDrawer()}
      </div>
    `;

    container.innerHTML = html;

    if (window.lucide) {
      window.lucide.createIcons();
    }

    this.attachEventListeners(filtered);
  }

  renderSortIcon(field) {
    if (this.sortField !== field) {
      return `<i data-lucide="chevrons-up-down" class="w-3.5 h-3.5 text-slate-600"></i>`;
    }
    return this.sortDirection === 'asc'
      ? `<i data-lucide="chevron-up" class="w-3.5 h-3.5 text-orange-400"></i>`
      : `<i data-lucide="chevron-down" class="w-3.5 h-3.5 text-orange-400"></i>`;
  }

  renderDetailDrawer() {
    if (!this.activeInspectionRecord) return '';
    const r = this.activeInspectionRecord;
    const fb = r.factor_breakdown || {};

    return `
      <div class="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end" onclick="window.firewatchApp.closeInspection()">
        <div class="w-full max-w-lg bg-[#0F172A] border-l border-[#1E293B] h-full overflow-y-auto p-6 space-y-6 shadow-2xl animate-in slide-in-from-right duration-200" onclick="event.stopPropagation()">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-slate-800 pb-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg font-mono" style="background-color: ${r.priority_color}22; color: ${r.priority_color}; border: 1px solid ${r.priority_color}55">
                ${r.score}
              </div>
              <div>
                <h3 class="text-base font-semibold text-white">Observation Inspection</h3>
                <span class="text-xs font-mono text-slate-400">ID: ${r.id} (Row #${r.rowNumber})</span>
              </div>
            </div>
            <button onclick="window.firewatchApp.closeInspection()" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <!-- Priority Status Banner -->
          <div class="p-4 rounded-xl border flex items-center justify-between" style="background-color: ${r.priority_color}11; border-color: ${r.priority_color}44">
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider block" style="color: ${r.priority_color}">Review Urgency Tier</span>
              <span class="text-lg font-bold text-white">${r.priority_category} Priority Triage</span>
            </div>
            <span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold badge-${r.priority_class}">
              Score: ${r.score} / 100
            </span>
          </div>

          <!-- Plain-English Narrative -->
          <div class="p-4 rounded-xl bg-[#131C31] border border-slate-800">
            <h4 class="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <i data-lucide="sparkles" class="w-3.5 h-3.5 text-orange-400"></i>
              Algorithmic Explanation
            </h4>
            <p class="text-xs text-slate-300 leading-relaxed font-sans">
              ${r.narrative}
            </p>
          </div>

          <!-- Explainable Factor Breakdown (Progress Bars) -->
          <div class="space-y-4 p-4 rounded-xl bg-[#0A0F1D] border border-slate-800">
            <h4 class="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Factor Contributions</span>
              <span class="font-mono text-[11px] text-slate-500">Weight &times; Normalized = Pts</span>
            </h4>

            <!-- Recency -->
            <div class="space-y-1 text-xs">
              <div class="flex justify-between items-center text-slate-300">
                <span class="font-medium">1. Recency (${fb.recency?.weightPercent || 30}%)</span>
                <span class="font-mono font-semibold text-white">+${fb.recency?.contribution || 0} pts</span>
              </div>
              <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-blue-500 h-full rounded-full" style="width: ${(fb.recency?.norm || 0) * 100}%"></div>
              </div>
              <div class="text-[10px] text-slate-400 font-mono flex justify-between">
                <span>Observed: ${fb.recency?.raw || ''}</span>
                <span>Norm: ${fb.recency?.norm || 0}</span>
              </div>
            </div>

            <!-- Confidence -->
            <div class="space-y-1 text-xs">
              <div class="flex justify-between items-center text-slate-300">
                <span class="font-medium">2. Detection Confidence (${fb.confidence?.weightPercent || 25}%)</span>
                <span class="font-mono font-semibold text-white">+${fb.confidence?.contribution || 0} pts</span>
              </div>
              <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-emerald-500 h-full rounded-full" style="width: ${(fb.confidence?.norm || 0) * 100}%"></div>
              </div>
              <div class="text-[10px] text-slate-400 font-mono flex justify-between">
                <span>Certainty: ${fb.confidence?.raw || ''}</span>
                <span>Norm: ${fb.confidence?.norm || 0}</span>
              </div>
            </div>

            <!-- FRP -->
            <div class="space-y-1 text-xs">
              <div class="flex justify-between items-center text-slate-300">
                <span class="font-medium">3. Thermal Radiance / FRP (${fb.frp?.weightPercent || 25}%)</span>
                <span class="font-mono font-semibold text-white">+${fb.frp?.contribution || 0} pts</span>
              </div>
              <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-orange-500 h-full rounded-full" style="width: ${(fb.frp?.norm || 0) * 100}%"></div>
              </div>
              <div class="text-[10px] text-slate-400 font-mono flex justify-between">
                <span>Radiance: ${fb.frp?.raw || ''}</span>
                <span>Norm: ${fb.frp?.norm || 0}</span>
              </div>
            </div>

            <!-- Repeat Clustering -->
            <div class="space-y-1 text-xs">
              <div class="flex justify-between items-center text-slate-300">
                <span class="font-medium">4. Repeat Proximity (${fb.repeat?.weightPercent || 20}%)</span>
                <span class="font-mono font-semibold text-white">+${fb.repeat?.contribution || 0} pts</span>
              </div>
              <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-red-500 h-full rounded-full" style="width: ${(fb.repeat?.norm || 0) * 100}%"></div>
              </div>
              <div class="text-[10px] text-slate-400 font-mono flex justify-between">
                <span>Proximity: ${fb.repeat?.raw || ''}</span>
                <span>Norm: ${fb.repeat?.norm || 0}</span>
              </div>
            </div>
          </div>

          <!-- Raw NASA FIRMS Observation Attributes -->
          <div class="p-4 rounded-xl bg-[#131C31] border border-slate-800 space-y-3">
            <h4 class="text-xs font-semibold text-slate-300 uppercase tracking-wider">Raw Satellite Telemetry</h4>
            <div class="grid grid-cols-2 gap-2 text-xs font-mono">
              <div class="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span class="text-slate-500 text-[10px] block">LATITUDE</span>
                <span class="text-white">${r.latitude.toFixed(5)}&deg;</span>
              </div>
              <div class="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span class="text-slate-500 text-[10px] block">LONGITUDE</span>
                <span class="text-white">${r.longitude.toFixed(5)}&deg;</span>
              </div>
              <div class="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span class="text-slate-500 text-[10px] block">ACQUISITION DATE</span>
                <span class="text-white">${r.acq_date}</span>
              </div>
              <div class="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span class="text-slate-500 text-[10px] block">ACQUISITION TIME</span>
                <span class="text-white">${r.acq_time} UTC</span>
              </div>
              <div class="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span class="text-slate-500 text-[10px] block">SATELLITE / SENSOR</span>
                <span class="text-white">${r.satellite} (${r.instrument})</span>
              </div>
              <div class="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span class="text-slate-500 text-[10px] block">DAY / NIGHT</span>
                <span class="text-white">${r.daynight}</span>
              </div>
              <div class="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span class="text-slate-500 text-[10px] block">BRIGHTNESS (T4)</span>
                <span class="text-white">${r.brightness ? `${r.brightness} K` : 'N/A'}</span>
              </div>
              <div class="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span class="text-slate-500 text-[10px] block">BRIGHTNESS (T31)</span>
                <span class="text-white">${r.bright_t31 ? `${r.bright_t31} K` : 'N/A'}</span>
              </div>
            </div>
          </div>

          <!-- Bottom Action: Jump to Map -->
          <div class="pt-2 flex items-center space-x-3">
            <button onclick="window.firewatchApp.viewOnMap(${r.latitude}, ${r.longitude})" class="flex-1 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow transition">
              <i data-lucide="map-pin" class="w-4 h-4"></i>
              <span>Locate on Fire Map</span>
            </button>
            <button onclick="window.firewatchApp.closeInspection()" class="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition">
              Close
            </button>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners(filteredRecords) {
    const searchInput = document.getElementById('table-search-input');
    if (searchInput) {
      searchInput.oninput = (e) => {
        this.searchQuery = e.target.value;
        this.currentPage = 1;
        this.render(document.getElementById('main-content-view'));
      };
    }

    const prioritySelect = document.getElementById('table-filter-priority');
    if (prioritySelect) {
      prioritySelect.onchange = (e) => {
        this.priorityFilter = e.target.value;
        this.currentPage = 1;
        this.render(document.getElementById('main-content-view'));
      };
    }

    const satSelect = document.getElementById('table-filter-satellite');
    if (satSelect) {
      satSelect.onchange = (e) => {
        this.satelliteFilter = e.target.value;
        this.currentPage = 1;
        this.render(document.getElementById('main-content-view'));
      };
    }

    const exportBtn = document.getElementById('table-export-btn');
    if (exportBtn) {
      exportBtn.onclick = () => {
        ExportUtils.exportObservationsToCSV(filteredRecords, 'firewatch_filtered_observations.csv');
      };
    }
  }

  openInspection(recordId) {
    const record = this.appState.scoredRecords?.find(r => r.id === recordId);
    if (record) {
      this.activeInspectionRecord = record;
      this.render(document.getElementById('main-content-view'));
    }
  }

  closeInspection() {
    this.activeInspectionRecord = null;
    this.render(document.getElementById('main-content-view'));
  }

  sortTable(field) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'desc';
    }
    this.render(document.getElementById('main-content-view'));
  }

  changePage(page) {
    this.currentPage = page;
    this.render(document.getElementById('main-content-view'));
  }
}
