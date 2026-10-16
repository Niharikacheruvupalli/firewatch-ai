/**
 * FIREWATCH AI - Automated Unit Test Suite
 * Tests Validation Engine, Ranking Formulas, Haversine Distance, and Duplicate Detection.
 */

import { ObservationValidator } from '../js/engine/validator.js';
import { RankingEngine, DEFAULT_WEIGHTS } from '../js/engine/rankingEngine.js';
import { SAMPLE_FIRMS_CSV, CORRUPTED_TEST_CSV } from '../js/data/sampleFirmsData.js';

export class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.results = [];
  }

  addTest(name, fn) {
    this.tests.push({ name, fn });
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message || 'Assertion failed'}: expected "${expected}", received "${actual}"`);
    }
  }

  assertCloseTo(actual, expected, tolerance = 0.05, message) {
    if (Math.abs(actual - expected) > tolerance) {
      throw new Error(`${message || 'Assertion failed'}: expected ${actual} to be close to ${expected} (+/- ${tolerance})`);
    }
  }

  async runAll() {
    this.passed = 0;
    this.failed = 0;
    this.results = [];

    for (const test of this.tests) {
      const startTime = performance.now();
      try {
        await test.fn(this);
        const duration = Math.round(performance.now() - startTime);
        this.passed++;
        this.results.push({ name: test.name, status: 'PASS', duration, error: null });
      } catch (err) {
        const duration = Math.round(performance.now() - startTime);
        this.failed++;
        this.results.push({ name: test.name, status: 'FAIL', duration, error: err.message });
      }
    }

    return {
      total: this.tests.length,
      passed: this.passed,
      failed: this.failed,
      results: this.results
    };
  }
}

export function registerTestSuite(runner) {
  // 1. Validator Tests
  runner.addTest('Validator: Successfully parses and validates authentic FIRMS sample dataset', (t) => {
    const result = ObservationValidator.validateCSV(SAMPLE_FIRMS_CSV);
    t.assert(result.validRecords.length > 40, `Expected >40 valid records, got ${result.validRecords.length}`);
    t.assertEqual(result.invalidRecords.length, 0, 'Sample dataset should have 0 invalid records');
    t.assert(result.stats.totalRows > 40, 'Total rows should match input length');
  });

  runner.addTest('Validator: Flags out-of-bounds latitude (> 90.0°)', (t) => {
    const csv = `latitude,longitude,acq_date,acq_time,confidence,frp\n95.42,-121.5,2026-10-15,1200,85,150`;
    const result = ObservationValidator.validateCSV(csv);
    t.assertEqual(result.validRecords.length, 0, 'Should reject out-of-bounds latitude');
    t.assertEqual(result.invalidRecords.length, 1, 'Should record 1 invalid record');
    t.assert(result.invalidRecords[0].reasons[0].includes('out of valid bounds'), 'Reason should cite out of bounds');
  });

  runner.addTest('Validator: Flags out-of-bounds longitude (< -180.0°)', (t) => {
    const csv = `latitude,longitude,acq_date,acq_time,confidence,frp\n40.12,-210.5,2026-10-15,1200,85,150`;
    const result = ObservationValidator.validateCSV(csv);
    t.assertEqual(result.validRecords.length, 0, 'Should reject out-of-bounds longitude');
    t.assert(result.invalidRecords[0].reasons[0].includes('out of valid bounds'), 'Reason should cite out of bounds');
  });

  runner.addTest('Validator: Detects and flags duplicate observation strikes', (t) => {
    const csv = `latitude,longitude,acq_date,acq_time,satellite,confidence,frp\n40.8412,-121.5234,2026-10-15,2135,NOAA-20,high,345.8\n40.8412,-121.5234,2026-10-15,2135,NOAA-20,high,345.8`;
    const result = ObservationValidator.validateCSV(csv);
    t.assertEqual(result.validRecords.length, 1, 'First strike should be accepted');
    t.assertEqual(result.invalidRecords.length, 1, 'Second identical strike should be flagged as duplicate');
    t.assertEqual(result.invalidRecords[0].isDuplicate, true, 'isDuplicate flag should be true');
    t.assertEqual(result.stats.duplicatesCount, 1, 'Duplicate count statistic should increment');
  });

  runner.addTest('Validator: Rejects negative Fire Radiative Power (FRP)', (t) => {
    const csv = `latitude,longitude,acq_date,acq_time,confidence,frp\n40.12,-120.5,2026-10-15,1200,85,-50.0`;
    const result = ObservationValidator.validateCSV(csv);
    t.assertEqual(result.validRecords.length, 0, 'Should reject negative FRP');
    t.assert(result.invalidRecords[0].reasons[0].includes('cannot be negative'), 'Reason should cite negative FRP');
  });

  runner.addTest('Validator: Full stress-test audit log verification', (t) => {
    const result = ObservationValidator.validateCSV(CORRUPTED_TEST_CSV);
    t.assert(result.invalidRecords.length >= 6, `Expected >=6 rejected records in stress test, got ${result.invalidRecords.length}`);
    t.assert(result.stats.outOfBoundsCount >= 2, 'Should detect out-of-bounds records');
    t.assert(result.stats.missingFieldsCount >= 2, 'Should detect missing required fields');
    t.assert(result.stats.duplicatesCount >= 1, 'Should detect duplicates in test batch');
  });

  // 2. Ranking & Math Tests
  runner.addTest('Ranking: Distance calculation accurately computes geographic kilometers', (t) => {
    // San Francisco (37.7749, -122.4194) to Los Angeles (34.0522, -118.2437) ~ 559 km
    const dist = RankingEngine.haversineDistanceKm(37.7749, -122.4194, 34.0522, -118.2437);
    t.assertCloseTo(dist, 559, 10, 'Haversine distance between SF and LA should be ~559 km');
  });

  runner.addTest('Ranking: Priority scores are strictly bounded within [0, 100]', (t) => {
    const valid = ObservationValidator.validateCSV(SAMPLE_FIRMS_CSV).validRecords;
    const scored = RankingEngine.scoreRecords(valid, DEFAULT_WEIGHTS);
    t.assert(scored.length > 0, 'Should have scored records');
    scored.forEach(r => {
      t.assert(r.score >= 0 && r.score <= 100, `Score ${r.score} out of [0, 100] bounds`);
    });
  });

  runner.addTest('Ranking: High FRP observations score significantly higher in thermal radiance dimension', (t) => {
    const records = [
      { id: '1', latitude: 40.0, longitude: -120.0, acq_date: '2026-10-16', acq_time: '12:00', timestamp: 1729080000000, confidence_norm: 0.8, confidence_percent: 80, frp: 450 },
      { id: '2', latitude: 40.0, longitude: -120.0, acq_date: '2026-10-16', acq_time: '12:00', timestamp: 1729080000000, confidence_norm: 0.8, confidence_percent: 80, frp: 10 }
    ];
    const scored = RankingEngine.scoreRecords(records, DEFAULT_WEIGHTS);
    t.assert(scored[0].id === '1', 'High FRP record should rank first');
    t.assert(scored[0].score > scored[1].score, `Record 1 score (${scored[0].score}) should exceed Record 2 (${scored[1].score})`);
    t.assert(scored[0].factor_breakdown.frp.contribution > scored[1].factor_breakdown.frp.contribution, 'FRP contribution should be higher');
  });

  runner.addTest('Ranking: Repeat spatial detections increment repeat proximity factor', (t) => {
    // 3 observations clustered within 500m vs 1 isolated observation 200km away
    const records = [
      { id: 'c1', latitude: 40.8412, longitude: -121.5234, acq_date: '2026-10-16', acq_time: '12:00', timestamp: 1000, confidence_norm: 0.8, frp: 50 },
      { id: 'c2', latitude: 40.8415, longitude: -121.5230, acq_date: '2026-10-15', acq_time: '12:00', timestamp: 900, confidence_norm: 0.8, frp: 50 },
      { id: 'c3', latitude: 40.8410, longitude: -121.5238, acq_date: '2026-10-14', acq_time: '12:00', timestamp: 800, confidence_norm: 0.8, frp: 50 },
      { id: 'iso', latitude: 35.1200, longitude: -115.4000, acq_date: '2026-10-16', acq_time: '12:00', timestamp: 1000, confidence_norm: 0.8, frp: 50 }
    ];
    const scored = RankingEngine.scoreRecords(records, DEFAULT_WEIGHTS);
    const clusterRecord = scored.find(r => r.id === 'c1');
    const isolatedRecord = scored.find(r => r.id === 'iso');

    t.assertEqual(clusterRecord.repeat_count, 3, 'Cluster record should identify 3 observations in 1.5km');
    t.assertEqual(isolatedRecord.repeat_count, 1, 'Isolated record should have repeat count of 1');
    t.assert(clusterRecord.factor_breakdown.repeat.contribution > isolatedRecord.factor_breakdown.repeat.contribution, 'Cluster should receive repeat bonus');
  });

  runner.addTest('Ranking: Dynamic custom weights recalculate scores and normalize to 100%', (t) => {
    const valid = ObservationValidator.validateCSV(SAMPLE_FIRMS_CSV).validRecords;
    // Set FRP to 100% and all others to 0%
    const customWeights = { recency: 0, confidence: 0, frp: 100, repeat: 0 };
    const scored = RankingEngine.scoreRecords(valid, customWeights);
    // Highest FRP should be strictly ordered
    for (let i = 0; i < scored.length - 1; i++) {
      t.assert(scored[i].frp >= scored[i + 1].frp, 'Records should be ordered monotonically by FRP when FRP weight is 100%');
    }
  });
}
