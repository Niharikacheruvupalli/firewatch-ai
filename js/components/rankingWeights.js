/**
 * FIREWATCH AI - Explainable Ranking Methodology & Interactive Weights Configurator
 * Allows live adjusting of weights, ensures 100% normalization, and provides explicit mathematical documentation.
 */

import { DEFAULT_WEIGHTS } from '../engine/rankingEngine.js';

export class RankingWeightsComponent {
  constructor(appState, onWeightsChanged) {
    this.appState = appState;
    this.onWeightsChanged = onWeightsChanged;
    this.weights = { ...(appState.weights || DEFAULT_WEIGHTS) };
  }

  render(container) {
    const w = this.weights;
    const total = (w.recency || 0) + (w.confidence || 0) + (w.frp || 0) + (w.repeat || 0);

    let html = `
      <div class="space-y-6">
        <!-- Interactive Weight Tuning Card -->
        <div class="p-6 rounded-xl bg-[#0F172A] border border-[#1E293B] shadow-xl space-y-6">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 class="text-base font-semibold text-white flex items-center gap-2">
                <i data-lucide="sliders" class="w-5 h-5 text-orange-500"></i>
                Priority Score Weight Configuration
              </h3>
              <p class="text-xs text-slate-400 mt-1">
                Customize relative importance of triage dimensions. The system recalculates all observation scores immediately.
              </p>
            </div>

            <!-- Total Sum Indicator -->
            <div class="flex items-center space-x-3">
              <div class="px-3 py-1.5 rounded-lg border font-mono text-xs flex items-center gap-2 ${
                total === 100 ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800' : 'bg-amber-950/60 text-amber-400 border-amber-800'
              }">
                <span>Total Weight:</span>
                <strong class="text-sm font-bold">${total}%</strong>
                ${total === 100 ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : '<i data-lucide="alert-circle" class="w-3.5 h-3.5"></i>'}
              </div>

              <button id="reset-weights-btn" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition">
                Reset Defaults (30/25/25/20)
              </button>
            </div>
          </div>

          <!-- Sliders Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- 1. Recency -->
            <div class="p-4 rounded-xl bg-[#070B14] border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs font-semibold text-slate-200">1. Observation Recency</span>
                  <p class="text-[11px] text-slate-400">Decay over elapsed time from newest satellite pass</p>
                </div>
                <span id="val-recency" class="text-base font-bold font-mono text-blue-400">${w.recency}%</span>
              </div>
              <input type="range" id="slider-recency" min="0" max="60" step="5" value="${w.recency}" class="w-full cursor-pointer" />
              <div class="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0% (Disabled)</span>
                <span>Default: 30%</span>
                <span>60% (Dominant)</span>
              </div>
            </div>

            <!-- 2. Confidence -->
            <div class="p-4 rounded-xl bg-[#070B14] border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs font-semibold text-slate-200">2. Detection Confidence</span>
                  <p class="text-[11px] text-slate-400">Satellite radiometric certainty (MODIS % or VIIRS High/Nominal)</p>
                </div>
                <span id="val-conf" class="text-base font-bold font-mono text-emerald-400">${w.confidence}%</span>
              </div>
              <input type="range" id="slider-conf" min="0" max="60" step="5" value="${w.confidence}" class="w-full cursor-pointer" />
              <div class="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0%</span>
                <span>Default: 25%</span>
                <span>60%</span>
              </div>
            </div>

            <!-- 3. FRP -->
            <div class="p-4 rounded-xl bg-[#070B14] border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs font-semibold text-slate-200">3. Thermal Radiance (FRP)</span>
                  <p class="text-[11px] text-slate-400">Log-normalized Fire Radiative Power (MW)</p>
                </div>
                <span id="val-frp" class="text-base font-bold font-mono text-orange-400">${w.frp}%</span>
              </div>
              <input type="range" id="slider-frp" min="0" max="60" step="5" value="${w.frp}" class="w-full cursor-pointer" />
              <div class="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0%</span>
                <span>Default: 25%</span>
                <span>60%</span>
              </div>
            </div>

            <!-- 4. Repeat Proximity -->
            <div class="p-4 rounded-xl bg-[#070B14] border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs font-semibold text-slate-200">4. Repeat Spatial Detections</span>
                  <p class="text-[11px] text-slate-400">Heat persistence within 1.5 km Haversine radius</p>
                </div>
                <span id="val-repeat" class="text-base font-bold font-mono text-red-400">${w.repeat}%</span>
              </div>
              <input type="range" id="slider-repeat" min="0" max="60" step="5" value="${w.repeat}" class="w-full cursor-pointer" />
              <div class="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0%</span>
                <span>Default: 20%</span>
                <span>60%</span>
              </div>
            </div>
          </div>

          ${total !== 100 ? `
            <div class="p-3 rounded-lg bg-amber-950/40 border border-amber-900/60 text-xs text-amber-300 flex items-center justify-between">
              <span>Weights currently sum to ${total}%. The engine automatically proportionally normalizes to 100% during score computation.</span>
              <button id="auto-balance-btn" class="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs transition">
                Auto-Balance to 100%
              </button>
            </div>
          ` : ''}
        </div>

        <!-- Comprehensive Explainability & Normalization Documentation -->
        <div class="p-6 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-6">
          <div class="border-b border-slate-800 pb-3">
            <h3 class="text-sm font-semibold text-white uppercase tracking-wider">Explainable Normalization Formula</h3>
            <p class="text-xs text-slate-400 mt-1">Mathematical specification of all 4 normalized input factors.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
            <!-- Recency Spec -->
            <div class="p-4 rounded-xl bg-[#070B14] border border-slate-800 space-y-2">
              <div class="flex items-center gap-2 text-blue-400 font-semibold">
                <i data-lucide="clock" class="w-4 h-4"></i>
                <span>Dimension 1: Observation Recency</span>
              </div>
              <div class="p-2.5 rounded bg-slate-900 font-mono text-[11px] text-slate-300">
                S_recency = max(0, 1 - (&Delta;t / T_max))
              </div>
              <p class="text-slate-400 leading-relaxed font-sans">
                Where &Delta;t is the elapsed milliseconds from the latest satellite pass in the dataset, and T_max is the dataset temporal horizon (minimum 5 days). The latest overpasses score 1.0; older passes decay linearly toward 0.0.
              </p>
            </div>

            <!-- Confidence Spec -->
            <div class="p-4 rounded-xl bg-[#070B14] border border-slate-800 space-y-2">
              <div class="flex items-center gap-2 text-emerald-400 font-semibold">
                <i data-lucide="check-circle-2" class="w-4 h-4"></i>
                <span>Dimension 2: Detection Confidence</span>
              </div>
              <div class="p-2.5 rounded bg-slate-900 font-mono text-[11px] text-slate-300">
                S_conf = (confidence_percent / 100)
              </div>
              <p class="text-slate-400 leading-relaxed font-sans">
                MODIS provides numeric 0–100%. VIIRS categorical confidences are mapped systematically: High &rarr; 0.95 (95%), Nominal &rarr; 0.65 (65%), Low &rarr; 0.25 (25%). Missing values are explicitly imputed at nominal baseline 0.50 with an audit warning.
              </p>
            </div>

            <!-- FRP Spec -->
            <div class="p-4 rounded-xl bg-[#070B14] border border-slate-800 space-y-2">
              <div class="flex items-center gap-2 text-orange-400 font-semibold">
                <i data-lucide="flame" class="w-4 h-4"></i>
                <span>Dimension 3: Thermal Radiance (FRP)</span>
              </div>
              <div class="p-2.5 rounded bg-slate-900 font-mono text-[11px] text-slate-300">
                S_frp = min(1.0, ln(1 + FRP) / ln(1 + FRP_ref))
              </div>
              <p class="text-slate-400 leading-relaxed font-sans">
                FRP measures thermal radiant power in Megawatts (MW). Soft-log scaling prevents extreme outlier crown fires (>500 MW) from skewing the triage queue while appropriately weighting small spot burns (5–20 MW) vs. heavy active fronts (>150 MW). Reference FRP_ref = 300 MW.
              </p>
            </div>

            <!-- Repeat Clustering Spec -->
            <div class="p-4 rounded-xl bg-[#070B14] border border-slate-800 space-y-2">
              <div class="flex items-center gap-2 text-red-400 font-semibold">
                <i data-lucide="layers" class="w-4 h-4"></i>
                <span>Dimension 4: Spatial Repeat Detections</span>
              </div>
              <div class="p-2.5 rounded bg-slate-900 font-mono text-[11px] text-slate-300">
                S_repeat = min(1.0, (N_nearby - 1) / 4)
              </div>
              <p class="text-slate-400 leading-relaxed font-sans">
                Identifies persistent thermal clusters by computing pairwise Haversine distances (&le; 1.5 km radius) across all observation passes. Single isolated pixel = 0.0; 2 detections = 0.25; 5+ detections = 1.0 (indicating persistent active fire fronts).
              </p>
            </div>
          </div>

          <!-- Total Priority Formula -->
          <div class="p-4 rounded-xl bg-gradient-to-r from-orange-950/40 to-slate-900 border border-orange-900/50 space-y-2">
            <h4 class="text-xs font-semibold text-orange-400 uppercase tracking-wider">Composite Priority Score</h4>
            <div class="p-3 rounded bg-black/40 font-mono text-xs text-white">
              Score = [ (w_recency &times; S_recency) + (w_conf &times; S_conf) + (w_frp &times; S_frp) + (w_repeat &times; S_repeat) ] &times; 100
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div class="p-2 rounded bg-red-950/40 border border-red-900/40 text-red-300">
                <strong>High Review Priority (&ge; 70)</strong>: Urgent analyst review queue.
              </div>
              <div class="p-2 rounded bg-amber-950/40 border border-amber-900/40 text-amber-300">
                <strong>Medium Review Priority (40–69)</strong>: Secondary monitoring queue.
              </div>
              <div class="p-2 rounded bg-slate-800/40 border border-slate-700/40 text-slate-300">
                <strong>Low Review Priority (&lt; 40)</strong>: Routine background anomalies.
              </div>
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
  }

  attachEventListeners() {
    const bindSlider = (id, key, valId) => {
      const slider = document.getElementById(id);
      if (slider) {
        slider.oninput = (e) => {
          this.weights[key] = parseInt(e.target.value, 10);
          document.getElementById(valId).innerText = `${this.weights[key]}%`;
          this.onWeightsChanged(this.weights);
          this.render(document.getElementById('main-content-view'));
        };
      }
    };

    bindSlider('slider-recency', 'recency', 'val-recency');
    bindSlider('slider-conf', 'confidence', 'val-conf');
    bindSlider('slider-frp', 'frp', 'val-frp');
    bindSlider('slider-repeat', 'repeat', 'val-repeat');

    const resetBtn = document.getElementById('reset-weights-btn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        this.weights = { ...DEFAULT_WEIGHTS };
        this.onWeightsChanged(this.weights);
        this.render(document.getElementById('main-content-view'));
      };
    }

    const autoBalanceBtn = document.getElementById('auto-balance-btn');
    if (autoBalanceBtn) {
      autoBalanceBtn.onclick = () => {
        const sum = (this.weights.recency || 0) + (this.weights.confidence || 0) + (this.weights.frp || 0) + (this.weights.repeat || 0);
        if (sum > 0) {
          this.weights.recency = Math.round((this.weights.recency / sum) * 100);
          this.weights.confidence = Math.round((this.weights.confidence / sum) * 100);
          this.weights.frp = Math.round((this.weights.frp / sum) * 100);
          this.weights.repeat = 100 - (this.weights.recency + this.weights.confidence + this.weights.frp);
        } else {
          this.weights = { ...DEFAULT_WEIGHTS };
        }
        this.onWeightsChanged(this.weights);
        this.render(document.getElementById('main-content-view'));
      };
    }
  }
}
