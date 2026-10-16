/**
 * FIREWATCH AI - Responsive Collapsible Sidebar Navigation Component
 */

export class SidebarComponent {
  constructor(appState, onNavigate) {
    this.appState = appState;
    this.onNavigate = onNavigate;
    this.isCollapsed = false;
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.render();
  }

  render() {
    const container = document.getElementById('sidebar-container');
    if (!container) return;

    const currentTab = this.appState.currentTab || 'overview';
    const totalObs = this.appState.scoredRecords?.length || 0;
    const highPriorityCount = this.appState.scoredRecords?.filter(r => r.priority_category === 'High').length || 0;
    const isDatasetReady = totalObs > 0;

    const navItems = [
      { id: 'overview', label: 'Overview', icon: 'layout-dashboard', badge: null },
      { id: 'map', label: 'Active Fire Map', icon: 'map', badge: totalObs > 0 ? `${totalObs}` : null, badgeColor: 'bg-blue-900/60 text-blue-300' },
      { id: 'observations', label: 'Observations Table', icon: 'table-properties', badge: highPriorityCount > 0 ? `${highPriorityCount} High` : null, badgeColor: 'bg-red-900/60 text-red-300' },
      { id: 'import', label: 'Data Import & Audit', icon: 'upload-cloud', badge: this.appState.validationResult?.stats?.invalidCount > 0 ? `${this.appState.validationResult.stats.invalidCount} Err` : null, badgeColor: 'bg-amber-900/60 text-amber-300' },
      { id: 'methodology', label: 'Ranking Weights', icon: 'sliders', badge: null },
      { id: 'about', label: 'About & Safety', icon: 'shield-alert', badge: null }
    ];

    container.className = `fixed inset-y-0 left-0 z-40 bg-[#0A0F1D] border-r border-[#1E293B] flex flex-col justify-between sidebar-transition ${
      this.isCollapsed ? 'w-20' : 'w-64'
    } max-md:hidden`;

    let html = `
      <!-- Brand & Collapse Header -->
      <div>
        <div class="h-16 flex items-center justify-between px-4 border-b border-[#1E293B]">
          <div class="flex items-center space-x-3 overflow-hidden cursor-pointer" onclick="window.firewatchApp.navigateTo('overview')">
            <div class="w-10 h-10 rounded-lg bg-gradient-to-tr from-amber-600 via-orange-600 to-red-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-950/40">
              <i data-lucide="flame" class="w-6 h-6 text-white"></i>
            </div>
            ${!this.isCollapsed ? `
              <div class="flex flex-col">
                <span class="font-bold text-base tracking-wider text-white">FIREWATCH <span class="text-orange-500 font-extrabold">AI</span></span>
                <span class="text-[10px] text-slate-400 tracking-wider uppercase font-mono">Satellite Triage</span>
              </div>
            ` : ''}
          </div>
          <button id="sidebar-toggle-btn" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <i data-lucide="${this.isCollapsed ? 'chevron-right' : 'chevron-left'}" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Navigation Links -->
        <nav class="p-3 space-y-1.5 mt-2">
    `;

    navItems.forEach(item => {
      const active = currentTab === item.id;
      html += `
        <button
          onclick="window.firewatchApp.navigateTo('${item.id}')"
          class="w-full flex items-center ${this.isCollapsed ? 'justify-center px-0' : 'justify-between px-3'} py-2.5 rounded-lg text-sm font-medium transition ${
            active 
              ? 'bg-gradient-to-r from-orange-600/20 to-transparent text-orange-400 border-l-4 border-orange-500' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#131C31]'
          }"
          title="${item.label}"
        >
          <div class="flex items-center space-x-3">
            <i data-lucide="${item.icon}" class="w-5 h-5 flex-shrink-0 ${active ? 'text-orange-500' : 'text-slate-400'}"></i>
            ${!this.isCollapsed ? `<span>${item.label}</span>` : ''}
          </div>
          ${!this.isCollapsed && item.badge ? `
            <span class="px-2 py-0.5 rounded-full text-xs font-mono font-medium ${item.badgeColor || 'bg-slate-800 text-slate-300'}">
              ${item.badge}
            </span>
          ` : ''}
        </button>
      `;
    });

    html += `
        </nav>
      </div>

      <!-- Footer / Telemetry Status -->
      <div class="p-3 border-t border-[#1E293B] bg-[#070B14]">
        ${!this.isCollapsed ? `
          <div class="p-2.5 rounded-lg bg-[#0F172A] border border-[#1E293B] text-xs">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-slate-400 font-mono text-[11px]">NASA FIRMS FEED</span>
              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${isDatasetReady ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}">
                <span class="w-1.5 h-1.5 rounded-full ${isDatasetReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'} mr-1"></span>
                ${isDatasetReady ? 'LOADED' : 'IDLE'}
              </span>
            </div>
            <div class="text-[11px] text-slate-400 truncate">
              Dataset: <span class="text-slate-200 font-mono">${this.appState.datasetName || 'Sample FIRMS'}</span>
            </div>
            <div class="text-[10px] text-slate-500 mt-1">
              Analyst Decision Support System
            </div>
          </div>
        ` : `
          <div class="flex justify-center py-2" title="Status: ${isDatasetReady ? 'Active Dataset' : 'Idle'}">
            <span class="w-2.5 h-2.5 rounded-full ${isDatasetReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"></span>
          </div>
        `}
      </div>
    `;

    container.innerHTML = html;

    // Attach toggle handler
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    if (toggleBtn) {
      toggleBtn.onclick = () => this.toggleCollapse();
    }

    // Refresh icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
}
