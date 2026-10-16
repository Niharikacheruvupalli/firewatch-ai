/**
 * FIREWATCH AI - About, System Architecture & Safety Disclaimers Component
 * Details technical limitations of satellite thermal sensors and explicit analyst guidance.
 */

export class DisclaimerModalComponent {
  render(container) {
    let html = `
      <div class="space-y-6 max-w-4xl mx-auto">
        <!-- Safety Alert Header -->
        <div class="p-6 rounded-xl bg-gradient-to-r from-red-950/70 via-slate-900 to-slate-900 border border-red-900/60 shadow-2xl">
          <div class="flex items-start space-x-4">
            <div class="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center flex-shrink-0 text-red-400">
              <i data-lucide="shield-alert" class="w-6 h-6"></i>
            </div>
            <div>
              <h2 class="text-lg font-bold text-white">Analyst Decision-Support Advisory & Safety Notice</h2>
              <p class="text-xs text-red-200 mt-1 leading-relaxed">
                FIREWATCH AI is strictly an analyst triage and prioritization tool for satellite-derived thermal radiance data. 
                It is <strong>NOT an operational emergency response system</strong> and does not replace certified public safety agencies.
              </p>
            </div>
          </div>
        </div>

        <!-- 5 Core Operational Limitations -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <!-- Limitation 1 -->
          <div class="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-2">
            <div class="flex items-center gap-2 text-amber-400 font-semibold">
              <i data-lucide="sun" class="w-4 h-4"></i>
              <span>1. Thermal Anomalies &ne; Confirmed Wildfires</span>
            </div>
            <p class="text-slate-400 leading-relaxed font-sans">
              Satellite radiometers detect middle-infrared and thermal infrared radiation anomalies. Non-wildfire sources including agricultural burn-offs, industrial gas flaring, geothermal vents, solar glint from water surfaces, and metal rooftops can trigger false positive anomalies.
            </p>
          </div>

          <!-- Limitation 2 -->
          <div class="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-2">
            <div class="flex items-center gap-2 text-blue-400 font-semibold">
              <i data-lucide="cloud-rain" class="w-4 h-4"></i>
              <span>2. Cloud & Smoke Occlusion</span>
            </div>
            <p class="text-slate-400 leading-relaxed font-sans">
              Thick cloud decks, coastal fog, and heavy pyrocumulus smoke columns absorb thermal radiance, preventing sensors from detecting ground fires. <strong>Absence of a detection does NOT prove an area is safe.</strong>
            </p>
          </div>

          <!-- Limitation 3 -->
          <div class="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-2">
            <div class="flex items-center gap-2 text-purple-400 font-semibold">
              <i data-lucide="clock" class="w-4 h-4"></i>
              <span>3. Orbit Timing & Latency</span>
            </div>
            <p class="text-slate-400 leading-relaxed font-sans">
              Polar-orbiting spacecraft (Suomi-NPP, NOAA-20, NOAA-21, Terra, Aqua) typically pass overhead only twice per 24-hour cycle per instrument. Ground station downlink, calibration, and atmospheric correction introduce unavoidable latency of 30–180 minutes.
            </p>
          </div>

          <!-- Limitation 4 -->
          <div class="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-2">
            <div class="flex items-center gap-2 text-emerald-400 font-semibold">
              <i data-lucide="sparkles" class="w-4 h-4"></i>
              <span>4. Explainable Heuristic, Not a Prediction</span>
            </div>
            <p class="text-slate-400 leading-relaxed font-sans">
              The 0–100 Priority Score is a transparent mathematical triage heuristic designed to order analyst review queues. It is <strong>not a certified probabilistic fire spread or perimeter prediction model</strong>.
            </p>
          </div>
        </div>

        <!-- Official Sources & Human Verification -->
        <div class="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-4">
          <h3 class="text-sm font-semibold text-white">Official Environmental Intelligence References</h3>
          <p class="text-xs text-slate-400 leading-relaxed font-sans">
            For operational life-safety decisions, evacuations, and official fire perimeters, always consult verified national command centers:
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <a href="https://firms.modaps.eosdis.nasa.gov/" target="_blank" rel="noopener noreferrer" class="p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-orange-500 transition group flex flex-col justify-between">
              <div>
                <span class="text-orange-400 font-bold font-mono group-hover:underline">NASA FIRMS</span>
                <p class="text-[11px] text-slate-400 mt-1">MODIS & VIIRS Near Real-Time Active Fire Global Data.</p>
              </div>
              <div class="text-[10px] text-orange-400 mt-2 flex items-center gap-1 font-mono">
                <span>firms.modaps.eosdis.nasa.gov</span>
                <i data-lucide="external-link" class="w-3 h-3"></i>
              </div>
            </a>

            <a href="https://www.nifc.gov/" target="_blank" rel="noopener noreferrer" class="p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-orange-500 transition group flex flex-col justify-between">
              <div>
                <span class="text-blue-400 font-bold font-mono group-hover:underline">National Interagency Fire Center (NIFC)</span>
                <p class="text-[11px] text-slate-400 mt-1">Official US incident situation reports and command dispatches.</p>
              </div>
              <div class="text-[10px] text-blue-400 mt-2 flex items-center gap-1 font-mono">
                <span>nifc.gov</span>
                <i data-lucide="external-link" class="w-3 h-3"></i>
              </div>
            </a>

            <a href="https://inciweb.wildfire.gov/" target="_blank" rel="noopener noreferrer" class="p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-orange-500 transition group flex flex-col justify-between">
              <div>
                <span class="text-red-400 font-bold font-mono group-hover:underline">InciWeb Incident Information</span>
                <p class="text-[11px] text-slate-400 mt-1">Interagency all-risk incident public alerts and evacuations.</p>
              </div>
              <div class="text-[10px] text-red-400 mt-2 flex items-center gap-1 font-mono">
                <span>inciweb.wildfire.gov</span>
                <i data-lucide="external-link" class="w-3 h-3"></i>
              </div>
            </a>
          </div>
        </div>

        <!-- System Architecture & Security -->
        <div class="p-5 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-3 text-xs text-slate-300">
          <h3 class="text-sm font-semibold text-white">Application Architecture & Privacy</h3>
          <p class="text-slate-400 font-sans leading-relaxed">
            FIREWATCH AI is designed with client-side zero-trust data protection. Ingested satellite CSV observations and priority calculations execute entirely within the local browser environment. No telemetry or proprietary geographic coordinates are transmitted to unauthorized third-party servers.
          </p>
        </div>
      </div>
    `;

    container.innerHTML = html;

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
}
