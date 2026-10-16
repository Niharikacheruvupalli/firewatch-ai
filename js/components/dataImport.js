/**
 * FIREWATCH AI - Data Import & Validation Audit Component
 * Provides CSV drag-and-drop ingestion, NASA FIRMS format guides, validation audit log, and export actions.
 */

import { ObservationValidator } from '../engine/validator.js';
import { ExportUtils } from '../engine/exportUtils.js';
import { SAMPLE_FIRMS_CSV, CORRUPTED_TEST_CSV } from '../data/sampleFirmsData.js';

export class DataImportComponent {
  constructor(appState, onDatasetLoaded) {
    this.appState = appState;
    this.onDatasetLoaded = onDatasetLoaded;
    this.activeTab = 'upload'; // 'upload' | 'audit' | 'schema'
  }

  render(container) {
    const valResult = this.appState.validationResult || {
      stats: { totalRows: 0, validCount: 0, invalidCount: 0, duplicatesCount: 0, outOfBoundsCount: 0, missingFieldsCount: 0, malformedCount: 0 },
      invalidRecords: [],
      warnings: []
    };
    const stats = valResult.stats;

    let html = `
      <div class="space-y-6">
        <!-- Sub-navigation tabs -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center space-x-3">
            <button
              onclick="window.firewatchApp.setImportTab('upload')"
              class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${this.activeTab === 'upload' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900'}"
            >
              CSV File Ingestion
            </button>
            <button
              onclick="window.firewatchApp.setImportTab('audit')"
              class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${this.activeTab === 'audit' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900'}"
            >
              <span>Validation Audit Log</span>
              ${stats.invalidCount > 0 ? `
                <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold">${stats.invalidCount}</span>
              ` : ''}
            </button>
            <button
              onclick="window.firewatchApp.setImportTab('schema')"
              class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${this.activeTab === 'schema' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900'}"
            >
              NASA FIRMS Format Specification
            </button>
          </div>

          <!-- Quick FIRMS link -->
          <a
            href="https://firms.modaps.eosdis.nasa.gov/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs text-orange-400 hover:underline flex items-center gap-1 font-mono"
          >
            <span>NASA FIRMS Portal</span>
            <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
          </a>
        </div>

        ${this.renderActiveTabContent(valResult, stats)}
      </div>
    `;

    container.innerHTML = html;

    if (window.lucide) {
      window.lucide.createIcons();
    }

    this.attachEventListeners();
  }

  renderActiveTabContent(valResult, stats) {
    if (this.activeTab === 'audit') {
      return this.renderAuditLog(valResult, stats);
    }
    if (this.activeTab === 'schema') {
      return this.renderSchemaSpec();
    }
    return this.renderUploadZone(stats);
  }

  renderUploadZone(stats) {
    return `
      <!-- Drag & Drop Zone -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-4">
          <div
            id="csv-dropzone"
            class="p-8 border-2 border-dashed border-slate-700 hover:border-orange-500/80 bg-[#0F172A] rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition group"
          >
            <input type="file" id="csv-file-input" accept=".csv,text/csv" class="hidden" />
            <div class="w-14 h-14 rounded-full bg-slate-800 text-orange-400 group-hover:scale-110 flex items-center justify-center transition shadow-lg mb-3">
              <i data-lucide="upload-cloud" class="w-7 h-7"></i>
            </div>
            <h3 class="text-sm font-semibold text-white">Upload NASA FIRMS CSV Observations</h3>
            <p class="text-xs text-slate-400 mt-1 max-w-sm">
              Drag and drop your satellite fire CSV file here, or click to browse files from your computer.
            </p>
            <span class="mt-3 px-3 py-1 rounded-full text-[11px] font-mono bg-slate-800/80 text-slate-300 border border-slate-700">
              Supports VIIRS (S-NPP, NOAA-20/21) & MODIS (Terra/Aqua)
            </span>
          </div>

          <!-- Fast Preset Loaders -->
          <div class="p-4 rounded-xl bg-[#0F172A] border border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 class="text-xs font-semibold text-slate-200">Pre-bundled Sample Datasets</h4>
              <p class="text-[11px] text-slate-400">Evaluate immediately without generating custom NASA API tokens.</p>
            </div>
            <div class="flex items-center space-x-2.5">
              <button id="load-sample-btn" class="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow transition flex items-center gap-1.5">
                <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
                <span>Load Active Wildfire Sample (50 Obs)</span>
              </button>
              <button id="load-corrupted-btn" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-900/40 text-xs font-medium transition flex items-center gap-1.5">
                <i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i>
                <span>Load Validation Stress Test</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Ingestion Status & Download Sidecards -->
        <div class="space-y-4">
          <div class="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-4">
            <h4 class="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <i data-lucide="shield-check" class="w-4 h-4 text-emerald-400"></i>
              Current Dataset Audit Status
            </h4>

            <div class="space-y-2 text-xs font-mono">
              <div class="flex justify-between py-1 border-b border-slate-800">
                <span class="text-slate-400">Total Rows:</span>
                <span class="text-white font-bold">${stats.totalRows}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-slate-800">
                <span class="text-slate-400">Valid Ingested:</span>
                <span class="text-emerald-400 font-bold">${stats.validCount}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-slate-800">
                <span class="text-slate-400">Flagged / Rejected:</span>
                <span class="text-amber-400 font-bold">${stats.invalidCount}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-slate-800">
                <span class="text-slate-400">Duplicates Detected:</span>
                <span class="text-slate-300">${stats.duplicatesCount || 0}</span>
              </div>
            </div>

            <!-- Export Buttons -->
            <div class="pt-2 space-y-2">
              <button id="download-valid-btn" class="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center justify-center gap-2">
                <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5 text-emerald-400"></i>
                <span>Download Triaged CSV</span>
              </button>
              <button id="download-audit-btn" class="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center justify-center gap-2">
                <i data-lucide="file-text" class="w-3.5 h-3.5 text-amber-400"></i>
                <span>Download Validation Audit (CSV)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderAuditLog(valResult, stats) {
    const invalidRecords = valResult.invalidRecords || [];

    return `
      <div class="space-y-4">
        <!-- Audit Stats Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div class="p-3.5 rounded-lg bg-[#0F172A] border border-[#1E293B]">
            <span class="text-[10px] text-slate-400 uppercase font-mono">Out of Bounds Coordinates</span>
            <div class="text-xl font-bold font-mono text-red-400">${stats.outOfBoundsCount || 0}</div>
          </div>
          <div class="p-3.5 rounded-lg bg-[#0F172A] border border-[#1E293B]">
            <span class="text-[10px] text-slate-400 uppercase font-mono">Missing Required Fields</span>
            <div class="text-xl font-bold font-mono text-amber-400">${stats.missingFieldsCount || 0}</div>
          </div>
          <div class="p-3.5 rounded-lg bg-[#0F172A] border border-[#1E293B]">
            <span class="text-[10px] text-slate-400 uppercase font-mono">Malformed / Corrupted Rows</span>
            <div class="text-xl font-bold font-mono text-yellow-400">${stats.malformedCount || 0}</div>
          </div>
          <div class="p-3.5 rounded-lg bg-[#0F172A] border border-[#1E293B]">
            <span class="text-[10px] text-slate-400 uppercase font-mono">Duplicate Strikes</span>
            <div class="text-xl font-bold font-mono text-purple-400">${stats.duplicatesCount || 0}</div>
          </div>
        </div>

        <!-- Invalid Records Table -->
        <div class="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B]">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-semibold text-white">Rejected Records Detailed Audit</h3>
              <p class="text-xs text-slate-400">Records are never discarded silently; all rejection reasons are documented below.</p>
            </div>
            <button id="download-audit-btn-2" class="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
              <span>Export Audit Report</span>
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs font-mono">
              <thead class="bg-slate-900 text-slate-400 text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th class="py-2.5 px-3">Row #</th>
                  <th class="py-2.5 px-3">Status</th>
                  <th class="py-2.5 px-3">Failure Reason(s)</th>
                  <th class="py-2.5 px-3">Raw Record Data</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 text-slate-300">
                ${invalidRecords.length > 0 ? invalidRecords.map(inv => `
                  <tr class="hover:bg-slate-800/30">
                    <td class="py-3 px-3 text-slate-400">Row ${inv.rowNumber}</td>
                    <td class="py-3 px-3">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${inv.isDuplicate ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-red-950 text-red-300 border border-red-800'}">
                        ${inv.isDuplicate ? 'DUPLICATE' : 'REJECTED'}
                      </span>
                    </td>
                    <td class="py-3 px-3 text-amber-300 font-sans text-xs">
                      <ul class="list-disc list-inside space-y-0.5">
                        ${inv.reasons.map(r => `<li>${r}</li>`).join('')}
                      </ul>
                    </td>
                    <td class="py-3 px-3 text-slate-400 text-[11px] max-w-xs truncate">
                      ${JSON.stringify(inv.rawRecord)}
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="4" class="py-8 text-center text-slate-500 font-sans">
                      <i data-lucide="check-circle" class="w-6 h-6 mx-auto mb-1 text-emerald-500"></i>
                      All ingested records passed data validation without any integrity rejections!
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  renderSchemaSpec() {
    return `
      <div class="p-6 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-6">
        <div>
          <h3 class="text-base font-semibold text-white">Supported NASA FIRMS Schema Fields</h3>
          <p class="text-xs text-slate-400 mt-1">FIREWATCH AI validates standard NASA active fire CSV headers.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div class="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
            <span class="text-orange-400 font-bold block mb-1">latitude &amp; longitude</span>
            <span class="text-slate-300 text-xs font-sans block">Center of satellite thermal pixel. Must be valid geographic coordinates: Lat [-90, +90], Lon [-180, +180].</span>
          </div>

          <div class="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
            <span class="text-orange-400 font-bold block mb-1">acq_date &amp; acq_time</span>
            <span class="text-slate-300 text-xs font-sans block">Acquisition date (YYYY-MM-DD) and UTC acquisition time (HHMM 4-digit or HH:MM).</span>
          </div>

          <div class="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
            <span class="text-orange-400 font-bold block mb-1">confidence</span>
            <span class="text-slate-300 text-xs font-sans block">Detection confidence: 0–100% (MODIS) or categorical 'l', 'n', 'h' (VIIRS Low, Nominal, High).</span>
          </div>

          <div class="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
            <span class="text-orange-400 font-bold block mb-1">frp (Fire Radiative Power)</span>
            <span class="text-slate-300 text-xs font-sans block">Radiative heat output in Megawatts (MW). Used as key thermal intensity metric. Non-negative.</span>
          </div>

          <div class="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
            <span class="text-orange-400 font-bold block mb-1">brightness / bright_t31</span>
            <span class="text-slate-300 text-xs font-sans block">Brightness temperature in Kelvin (T4/I4 channel and T31/I5 channel).</span>
          </div>

          <div class="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
            <span class="text-orange-400 font-bold block mb-1">satellite, instrument, daynight</span>
            <span class="text-slate-300 text-xs font-sans block">Platform identifiers (e.g. NOAA-20, Suomi-NPP, Terra) and day ('D') or night ('N') observation flag.</span>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const dropzone = document.getElementById('csv-dropzone');
    const fileInput = document.getElementById('csv-file-input');

    if (dropzone && fileInput) {
      dropzone.onclick = () => fileInput.click();

      dropzone.ondragover = (e) => {
        e.preventDefault();
        dropzone.classList.add('border-orange-500');
      };

      dropzone.ondragleave = () => {
        dropzone.classList.remove('border-orange-500');
      };

      dropzone.ondrop = (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-orange-500');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.handleFile(e.dataTransfer.files[0]);
        }
      };

      fileInput.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleFile(e.target.files[0]);
        }
      };
    }

    const sampleBtn = document.getElementById('load-sample-btn');
    if (sampleBtn) {
      sampleBtn.onclick = () => {
        this.processCSV(SAMPLE_FIRMS_CSV, 'NASA FIRMS California Complex (Sample)');
      };
    }

    const corruptedBtn = document.getElementById('load-corrupted-btn');
    if (corruptedBtn) {
      corruptedBtn.onclick = () => {
        this.processCSV(CORRUPTED_TEST_CSV, 'Validation Stress Test Dataset');
        this.activeTab = 'audit';
        this.render(document.getElementById('main-content-view'));
      };
    }

    const validDownloadBtn = document.getElementById('download-valid-btn');
    if (validDownloadBtn) {
      validDownloadBtn.onclick = () => {
        ExportUtils.exportObservationsToCSV(this.appState.scoredRecords);
      };
    }

    const auditDownloadBtn = document.getElementById('download-audit-btn');
    if (auditDownloadBtn) {
      auditDownloadBtn.onclick = () => {
        if (this.appState.validationResult) {
          ExportUtils.exportValidationAudit(this.appState.validationResult, 'csv');
        }
      };
    }

    const auditDownloadBtn2 = document.getElementById('download-audit-btn-2');
    if (auditDownloadBtn2) {
      auditDownloadBtn2.onclick = () => {
        if (this.appState.validationResult) {
          ExportUtils.exportValidationAudit(this.appState.validationResult, 'csv');
        }
      };
    }
  }

  handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.processCSV(e.target.result, file.name);
    };
    reader.readAsText(file);
  }

  processCSV(csvText, datasetName) {
    const validationResult = ObservationValidator.validateCSV(csvText);
    this.onDatasetLoaded(validationResult, datasetName);
  }
}
