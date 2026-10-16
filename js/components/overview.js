/**
 * FIREWATCH AI - Dashboard Overview Component
 * Renders summary metrics cards, priority category distributions, confidence breakdown, and timeline charts.
 */

export class OverviewComponent {
  constructor(appState) {
    this.appState = appState;
    this.charts = {};
  }

  destroyCharts() {
    Object.keys(this.charts).forEach(key => {
      if (this.charts[key]) {
        try {
          this.charts[key].destroy();
        } catch (e) {
          console.warn('Error destroying chart:', e);
        }
      }
    });
    this.charts = {};
  }

  render(container) {
    this.destroyCharts();

    const scored = this.appState.scoredRecords || [];
    const stats = this.appState.validationResult?.stats || {
      totalRows: 0,
      validCount: 0,
      invalidCount: 0,
      warningCount: 0
    };

    const highPriority = scored.filter(r => r.priority_category === 'High');
    const medPriority = scored.filter(r => r.priority_category === 'Medium');
    const lowPriority = scored.filter(r => r.priority_category === 'Low');

    const avgFrp = scored.length > 0 
      ? Math.round((scored.reduce((acc, r) => acc + (r.frp || 0), 0) / scored.length) * 10) / 10 
      : 0;

    const maxFrp = scored.length > 0 
      ? Math.round(Math.max(...scored.map(r => r.frp || 0)) * 10) / 10 
      : 0;

    let html = `
      <div class="space-y-6">
        <!-- Top Advisory Banner -->
        <div class="p-4 rounded-xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-900 border border-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center space-x-3.5">
            <div class="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0 text-blue-400">
              <i data-lucide="info" class="w-5 h-5"></i>
            </div>
            <div>
              <h4 class="text-sm font-semibold text-slate-100 flex items-center gap-2">
                Satellite Thermal Anomaly Triage Mode
                <span class="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-950 text-blue-300 border border-blue-800">NASA FIRMS Ingestion</span>
              </h4>
              <p class="text-xs text-slate-400 mt-0.5">
                Thermal pixels are algorithmic detections, not confirmed ground wildfires. Review priority scores are transparent heuristics.
              </p>
            </div>
          </div>
          <div class="flex items-center space-x-2.5 flex-shrink-0">
            <button onclick="window.firewatchApp.navigateTo('map')" class="px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-orange-950/30 transition">
              <i data-lucide="map" class="w-4 h-4"></i>
              <span>Launch Fire Map</span>
            </button>
            <button onclick="window.firewatchApp.navigateTo('import')" class="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center space-x-2 transition">
              <i data-lucide="upload" class="w-4 h-4"></i>
              <span>Import New CSV</span>
            </button>
          </div>
        </div>

        <!-- 4 Core Metric Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Total Imported -->
          <div class="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] hover:border-slate-700 transition flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Ingested</span>
              <div class="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center">
                <i data-lucide="database" class="w-4 h-4"></i>
              </div>
            </div>
            <div class="mt-4">
              <div class="text-3xl font-bold font-mono text-white">${stats.totalRows}</div>
              <div class="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <span class="text-slate-300">${this.appState.datasetName || 'Default FIRMS'}</span>
              </div>
            </div>
          </div>

          <!-- Valid Records -->
          <div class="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] hover:border-emerald-900/50 transition flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Valid Records</span>
              <div class="w-8 h-8 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800 flex items-center justify-center">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
              </div>
            </div>
            <div class="mt-4">
              <div class="text-3xl font-bold font-mono text-emerald-400">${stats.validCount}</div>
              <div class="text-xs text-slate-400 mt-1">
                ${stats.totalRows > 0 ? Math.round((stats.validCount / stats.totalRows) * 100) : 0}% passing integrity rules
              </div>
            </div>
          </div>

          <!-- Invalid Records -->
          <div class="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] hover:border-amber-900/50 transition flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-amber-400 uppercase tracking-wider">Invalid / Flagged</span>
              <div class="w-8 h-8 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800 flex items-center justify-center">
                <i data-lucide="alert-triangle" class="w-4 h-4"></i>
              </div>
            </div>
            <div class="mt-4">
              <div class="text-3xl font-bold font-mono ${stats.invalidCount > 0 ? 'text-amber-400' : 'text-slate-400'}">${stats.invalidCount}</div>
              <div class="text-xs text-slate-400 mt-1 flex items-center justify-between">
                <span>${stats.duplicatesCount || 0} duplicates</span>
                ${stats.invalidCount > 0 ? `
                  <button onclick="window.firewatchApp.navigateTo('import')" class="text-amber-400 hover:underline text-[11px] font-medium">Audit Log</button>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- High-Priority Observations -->
          <div class="p-5 rounded-xl bg-gradient-to-b from-[#181124] to-[#0F172A] border border-red-900/40 hover:border-red-600/60 transition flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-red-400 uppercase tracking-wider">High Review Priority</span>
              <div class="w-8 h-8 rounded-lg bg-red-950/80 text-red-400 border border-red-800 flex items-center justify-center shadow-md shadow-red-950/50">
                <i data-lucide="flame" class="w-4 h-4 animate-pulse"></i>
              </div>
            </div>
            <div class="mt-4">
              <div class="text-3xl font-bold font-mono text-red-400">${highPriority.length}</div>
              <div class="text-xs text-slate-400 mt-1 flex items-center justify-between">
                <span>Score &ge; 70 threshold</span>
                <span class="text-slate-300 font-mono">Max FRP: ${maxFrp} MW</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Priority Distribution -->
          <div class="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] flex flex-col justify-between">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-sm font-semibold text-white">Priority Categories</h3>
                <p class="text-xs text-slate-400">Heuristic review urgency tiers</p>
              </div>
              <span class="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300">
                ${scored.length} records
              </span>
            </div>
            <div class="relative h-56 flex items-center justify-center">
              ${scored.length > 0 ? `
                <canvas id="chart-priority"></canvas>
              ` : `
                <div class="text-slate-500 text-xs text-center">No observation data loaded</div>
              `}
            </div>
            <div class="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800 text-center">
              <div class="p-1.5 rounded bg-red-950/30 border border-red-900/30">
                <div class="text-[11px] text-red-400 font-semibold">High</div>
                <div class="text-base font-bold font-mono text-white">${highPriority.length}</div>
              </div>
              <div class="p-1.5 rounded bg-amber-950/30 border border-amber-900/30">
                <div class="text-[11px] text-amber-400 font-semibold">Medium</div>
                <div class="text-base font-bold font-mono text-white">${medPriority.length}</div>
              </div>
              <div class="p-1.5 rounded bg-slate-800/40 border border-slate-700/40">
                <div class="text-[11px] text-slate-400 font-semibold">Low</div>
                <div class="text-base font-bold font-mono text-white">${lowPriority.length}</div>
              </div>
            </div>
          </div>

          <!-- Confidence Breakdown -->
          <div class="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] flex flex-col justify-between">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-sm font-semibold text-white">Detection Confidence</h3>
                <p class="text-xs text-slate-400">Satellite radiometric certainty</p>
              </div>
              <span class="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300">VIIRS & MODIS</span>
            </div>
            <div class="relative h-56 flex items-center justify-center">
              ${scored.length > 0 ? `
                <canvas id="chart-confidence"></canvas>
              ` : `
                <div class="text-slate-500 text-xs text-center">No observation data loaded</div>
              `}
            </div>
            <div class="flex items-center justify-between mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
              <span>Avg Radiance: <strong class="text-slate-200 font-mono">${avgFrp} MW</strong></span>
              <span>Top Satellite: <strong class="text-slate-200 font-mono">${this.getTopSatellite(scored)}</strong></span>
            </div>
          </div>

          <!-- Timeline: Observations Over Time -->
          <div class="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] flex flex-col justify-between">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-sm font-semibold text-white">Acquisitions Over Time</h3>
                <p class="text-xs text-slate-400">Daily overpass frequency</p>
              </div>
              <span class="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300">Overpasses</span>
            </div>
            <div class="relative h-56 flex items-center justify-center">
              ${scored.length > 0 ? `
                <canvas id="chart-timeline"></canvas>
              ` : `
                <div class="text-slate-500 text-xs text-center">No observation data loaded</div>
              `}
            </div>
            <div class="flex items-center justify-between mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
              <span>Earliest: <strong class="text-slate-200 font-mono">${this.getDateRange(scored).earliest}</strong></span>
              <span>Latest: <strong class="text-slate-200 font-mono">${this.getDateRange(scored).latest}</strong></span>
            </div>
          </div>
        </div>

        <!-- Top Triage Highlights Preview Table -->
        <div class="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B]">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-base font-semibold text-white flex items-center gap-2">
                <i data-lucide="alert-octagon" class="w-4 h-4 text-orange-500"></i>
                Immediate Review Queue (Top Priority Detections)
              </h3>
              <p class="text-xs text-slate-400">Ranked by explainable multi-factor algorithm</p>
            </div>
            <button onclick="window.firewatchApp.navigateTo('observations')" class="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1 transition">
              <span>View All ${scored.length} Records</span>
              <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="text-slate-400 bg-slate-900/80 font-mono uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th class="py-3 px-3">Priority Score</th>
                  <th class="py-3 px-3">Category</th>
                  <th class="py-3 px-3">Acquisition</th>
                  <th class="py-3 px-3">Coordinates</th>
                  <th class="py-3 px-3">FRP</th>
                  <th class="py-3 px-3">Confidence</th>
                  <th class="py-3 px-3">Repeat Nearby</th>
                  <th class="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 font-mono text-slate-300">
                ${scored.slice(0, 5).map(r => `
                  <tr class="hover:bg-slate-800/40 transition">
                    <td class="py-3 px-3">
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-sm text-white">${r.score}</span>
                        <div class="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div class="h-full rounded-full" style="width: ${r.score}%; background-color: ${r.priority_color}"></div>
                        </div>
                      </div>
                    </td>
                    <td class="py-3 px-3">
                      <span class="px-2 py-0.5 rounded text-[11px] font-medium badge-${r.priority_class}">
                        ${r.priority_category}
                      </span>
                    </td>
                    <td class="py-3 px-3 font-sans">
                      <div class="font-medium text-slate-200">${r.acq_date}</div>
                      <div class="text-[11px] text-slate-400">${r.acq_time} UTC (${r.satellite})</div>
                    </td>
                    <td class="py-3 px-3">
                      ${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}
                    </td>
                    <td class="py-3 px-3 font-semibold ${r.frp >= 150 ? 'text-orange-400' : 'text-slate-300'}">
                      ${r.frp} MW
                    </td>
                    <td class="py-3 px-3">
                      ${r.confidence_percent}%
                    </td>
                    <td class="py-3 px-3">
                      <span class="px-1.5 py-0.5 rounded ${r.repeat_count > 1 ? 'bg-orange-950/60 text-orange-400 border border-orange-800/50' : 'text-slate-400'}">
                        ${r.repeat_count}x
                      </span>
                    </td>
                    <td class="py-3 px-3 text-right font-sans">
                      <button onclick="window.firewatchApp.inspectRecord('${r.id}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition border border-slate-700">
                        Inspect
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    if (window.lucide) {
      window.lucide.createIcons();
    }

    if (scored.length > 0 && typeof Chart !== 'undefined') {
      this.initCharts(scored);
    }
  }

  getTopSatellite(records) {
    if (!records.length) return 'N/A';
    const counts = {};
    records.forEach(r => {
      counts[r.satellite] = (counts[r.satellite] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  getDateRange(records) {
    if (!records.length) return { earliest: 'N/A', latest: 'N/A' };
    const dates = records.map(r => r.acq_date).filter(Boolean).sort();
    return {
      earliest: dates[0] || 'N/A',
      latest: dates[dates.length - 1] || 'N/A'
    };
  }

  initCharts(records) {
    // 1. Priority Doughnut Chart
    const highCount = records.filter(r => r.priority_category === 'High').length;
    const medCount = records.filter(r => r.priority_category === 'Medium').length;
    const lowCount = records.filter(r => r.priority_category === 'Low').length;

    const ctxPriority = document.getElementById('chart-priority');
    if (ctxPriority) {
      this.charts.priority = new Chart(ctxPriority, {
        type: 'doughnut',
        data: {
          labels: ['High Priority', 'Medium Priority', 'Low Priority'],
          datasets: [{
            data: [highCount, medCount, lowCount],
            backgroundColor: ['#EF4444', '#F59E0B', '#64748B'],
            borderColor: '#0F172A',
            borderWidth: 2,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#94A3B8',
                font: { size: 11, family: 'Inter' },
                boxWidth: 12
              }
            }
          },
          cutout: '68%'
        }
      });
    }

    // 2. Confidence Bar Chart
    const highConf = records.filter(r => r.confidence_percent >= 80).length;
    const medConf = records.filter(r => r.confidence_percent >= 50 && r.confidence_percent < 80).length;
    const lowConf = records.filter(r => r.confidence_percent < 50).length;

    const ctxConf = document.getElementById('chart-confidence');
    if (ctxConf) {
      this.charts.confidence = new Chart(ctxConf, {
        type: 'bar',
        data: {
          labels: ['High (≥80%)', 'Nominal (50-79%)', 'Low (<50%)'],
          datasets: [{
            label: 'Detections',
            data: [highConf, medConf, lowConf],
            backgroundColor: ['#10B981', '#38BDF8', '#64748B'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              ticks: { color: '#94A3B8', font: { size: 10 } },
              grid: { display: false }
            },
            y: {
              ticks: { color: '#94A3B8', font: { size: 10 } },
              grid: { color: '#1E293B' }
            }
          }
        }
      });
    }

    // 3. Observations Timeline Line Chart
    const dayCounts = {};
    records.forEach(r => {
      if (r.acq_date) {
        dayCounts[r.acq_date] = (dayCounts[r.acq_date] || 0) + 1;
      }
    });
    const sortedDays = Object.keys(dayCounts).sort();

    const ctxTime = document.getElementById('chart-timeline');
    if (ctxTime) {
      this.charts.timeline = new Chart(ctxTime, {
        type: 'line',
        data: {
          labels: sortedDays.map(d => d.slice(5)), // MM-DD
          datasets: [{
            label: 'Detections',
            data: sortedDays.map(d => dayCounts[d]),
            borderColor: '#F97316',
            backgroundColor: 'rgba(249, 115, 22, 0.15)',
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointBackgroundColor: '#F97316',
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              ticks: { color: '#94A3B8', font: { size: 10 } },
              grid: { display: false }
            },
            y: {
              ticks: { color: '#94A3B8', font: { size: 10 }, stepSize: 1 },
              grid: { color: '#1E293B' }
            }
          }
        }
      });
    }
  }
}
