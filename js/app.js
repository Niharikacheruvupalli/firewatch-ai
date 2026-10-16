/**
 * FIREWATCH AI - Core Application Controller
 * Coordinates dataset state, priority re-scoring, sidebar routing, and view lifecycles.
 */

import { ObservationValidator } from './engine/validator.js';
import { RankingEngine, DEFAULT_WEIGHTS } from './engine/rankingEngine.js';
import { SAMPLE_FIRMS_CSV } from './data/sampleFirmsData.js';

import { SidebarComponent } from './components/sidebar.js';
import { OverviewComponent } from './components/overview.js';
import { FireMapComponent } from './components/fireMap.js';
import { ObservationTableComponent } from './components/observationTable.js';
import { DataImportComponent } from './components/dataImport.js';
import { RankingWeightsComponent } from './components/rankingWeights.js';
import { DisclaimerModalComponent } from './components/disclaimerModal.js';

class FirewatchApp {
  constructor() {
    this.state = {
      currentTab: 'overview',
      datasetName: 'NASA FIRMS California Complex (Sample)',
      validationResult: null,
      scoredRecords: [],
      weights: { ...DEFAULT_WEIGHTS }
    };

    // Components
    this.sidebar = new SidebarComponent(this.state, (tab) => this.navigateTo(tab));
    this.overview = new OverviewComponent(this.state);
    this.fireMap = new FireMapComponent(this.state);
    this.obsTable = new ObservationTableComponent(this.state);
    this.dataImport = new DataImportComponent(this.state, (res, name) => this.loadDataset(res, name));
    this.rankingWeights = new RankingWeightsComponent(this.state, (weights) => this.updateWeights(weights));
    this.disclaimer = new DisclaimerModalComponent();
  }

  init() {
    // Ingest sample NASA FIRMS data on startup
    const initialValidation = ObservationValidator.validateCSV(SAMPLE_FIRMS_CSV);
    this.loadDataset(initialValidation, 'NASA FIRMS California Complex (Sample)');

    // Render initial layout
    this.sidebar.render();
    this.renderCurrentView();

    // Mobile nav toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
      mobileMenuBtn.onclick = () => this.toggleMobileMenu();
    }
  }

  loadDataset(validationResult, datasetName) {
    this.state.validationResult = validationResult;
    this.state.datasetName = datasetName;

    // Run explainable scoring on valid records
    this.state.scoredRecords = RankingEngine.scoreRecords(
      validationResult.validRecords,
      this.state.weights
    );

    // Refresh UI
    this.sidebar.render();
    this.renderCurrentView();

    // Dispatch custom event for telemetry if needed
    console.log(`[FIREWATCH AI] Ingested ${validationResult.stats.totalRows} rows: ${validationResult.stats.validCount} valid, ${validationResult.stats.invalidCount} flagged.`);
  }

  updateWeights(newWeights) {
    this.state.weights = { ...newWeights };
    if (this.state.validationResult?.validRecords) {
      this.state.scoredRecords = RankingEngine.scoreRecords(
        this.state.validationResult.validRecords,
        this.state.weights
      );
    }
    // Update active view and sidebar counters
    this.sidebar.render();
    this.renderCurrentView();
  }

  navigateTo(tabId) {
    this.state.currentTab = tabId;
    this.sidebar.render();
    this.renderCurrentView();

    // Update title bar
    const titleEl = document.getElementById('header-view-title');
    if (titleEl) {
      const titles = {
        overview: 'Environmental Intelligence Overview',
        map: 'Active Satellite Thermal Anomaly Map',
        observations: 'Ranked Observations Triage Grid',
        import: 'NASA FIRMS Data Ingestion & Audit',
        methodology: 'Heuristic Ranking Methodology',
        about: 'Analyst Guidance & Safety Advisory'
      };
      titleEl.innerText = titles[tabId] || 'Dashboard';
    }

    // Close mobile menu if open
    const mobileDrawer = document.getElementById('mobile-drawer');
    if (mobileDrawer && !mobileDrawer.classList.contains('hidden')) {
      mobileDrawer.classList.add('hidden');
    }
  }

  renderCurrentView() {
    const container = document.getElementById('main-content-view');
    if (!container) return;

    switch (this.state.currentTab) {
      case 'overview':
        this.overview.render(container);
        break;
      case 'map':
        this.fireMap.render(container);
        break;
      case 'observations':
        this.obsTable.render(container);
        break;
      case 'import':
        this.dataImport.render(container);
        break;
      case 'methodology':
        this.rankingWeights.render(container);
        break;
      case 'about':
        this.disclaimer.render(container);
        break;
      default:
        this.overview.render(container);
    }
  }

  inspectRecord(recordId) {
    if (this.state.currentTab !== 'observations') {
      this.navigateTo('observations');
    }
    this.obsTable.openInspection(recordId);
  }

  closeInspection() {
    this.obsTable.closeInspection();
  }

  viewOnMap(lat, lon) {
    this.closeInspection();
    this.navigateTo('map');
    setTimeout(() => {
      this.fireMap.flyToCoordinates(lat, lon, 12);
    }, 300);
  }

  sortTable(field) {
    this.obsTable.sortTable(field);
  }

  changePage(page) {
    this.obsTable.changePage(page);
  }

  setImportTab(tab) {
    this.dataImport.activeTab = tab;
    this.dataImport.render(document.getElementById('main-content-view'));
  }

  toggleMobileMenu() {
    const mobileDrawer = document.getElementById('mobile-drawer');
    if (mobileDrawer) {
      mobileDrawer.classList.toggle('hidden');
    }
  }
}

// Global bootstrap
document.addEventListener('DOMContentLoaded', () => {
  window.firewatchApp = new FirewatchApp();
  window.firewatchApp.init();
});
