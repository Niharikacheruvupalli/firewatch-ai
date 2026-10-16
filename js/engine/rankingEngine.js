/**
 * FIREWATCH AI - Explainable Heuristic Priority Ranking Engine
 * Calculates transparent 0-100 scores based on Recency, Confidence, FRP, and Repeat Proximity.
 */

export const DEFAULT_WEIGHTS = {
  recency: 30,     // 30%
  confidence: 25,  // 25%
  frp: 25,         // 25%
  repeat: 20       // 20%
};

export class RankingEngine {
  /**
   * Calculate Haversine distance between two coordinates in kilometers.
   */
  static haversineDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Pre-compute repeat detection counts for all valid records within a spatial radius (default 1.5 km).
   * @param {Array} records - Array of validated records
   * @param {number} radiusKm - Spatial clustering radius in kilometers
   */
  static computeSpatialClusters(records, radiusKm = 1.5) {
    const n = records.length;
    const repeatCounts = new Array(n).fill(1);
    const nearbyRecordsMap = new Map();

    for (let i = 0; i < n; i++) {
      nearbyRecordsMap.set(records[i].id, []);
    }

    for (let i = 0; i < n; i++) {
      const r1 = records[i];
      for (let j = i + 1; j < n; j++) {
        const r2 = records[j];
        const dist = this.haversineDistanceKm(r1.latitude, r1.longitude, r2.latitude, r2.longitude);
        if (dist <= radiusKm) {
          repeatCounts[i]++;
          repeatCounts[j]++;
          nearbyRecordsMap.get(r1.id).push({ id: r2.id, distKm: Math.round(dist * 100) / 100, row: r2.rowNumber });
          nearbyRecordsMap.get(r2.id).push({ id: r1.id, distKm: Math.round(dist * 100) / 100, row: r1.rowNumber });
        }
      }
    }

    return { repeatCounts, nearbyRecordsMap };
  }

  /**
   * Process and score all valid records using specified weights.
   * @param {Array} records - Validated records
   * @param {Object} weights - { recency: 30, confidence: 25, frp: 25, repeat: 20 }
   * @param {Object} options - Custom normalization tuning options
   * @returns {Array} Scored, sorted records with transparent breakdown
   */
  static scoreRecords(records, weights = DEFAULT_WEIGHTS, options = {}) {
    if (!records || records.length === 0) return [];

    // Ensure weights sum to 1.0
    const sumW = (weights.recency || 0) + (weights.confidence || 0) + (weights.frp || 0) + (weights.repeat || 0);
    const normW = {
      recency: sumW > 0 ? (weights.recency || 0) / sumW : 0.3,
      confidence: sumW > 0 ? (weights.confidence || 0) / sumW : 0.25,
      frp: sumW > 0 ? (weights.frp || 0) / sumW : 0.25,
      repeat: sumW > 0 ? (weights.repeat || 0) / sumW : 0.20
    };

    // Find temporal bounds
    let maxTimestamp = -Infinity;
    let minTimestamp = Infinity;
    records.forEach(r => {
      if (r.timestamp) {
        if (r.timestamp > maxTimestamp) maxTimestamp = r.timestamp;
        if (r.timestamp < minTimestamp) minTimestamp = r.timestamp;
      }
    });

    const timeSpanMs = maxTimestamp > minTimestamp ? (maxTimestamp - minTimestamp) : (24 * 3600 * 1000);
    // Reference horizon: either timeSpan or 7 days minimum to prevent sharp degradation on small ranges
    const maxHorizonMs = Math.max(timeSpanMs, 5 * 24 * 3600 * 1000);

    // Compute spatial clusters
    const { repeatCounts, nearbyRecordsMap } = this.computeSpatialClusters(records, options.radiusKm || 1.5);

    // FRP reference for log normalization: 300 MW (typical severe wildfire crown threshold)
    const frpRef = options.frpRef || 300.0;
    const logFrpRef = Math.log(1 + frpRef);

    const scoredRecords = records.map((record, index) => {
      // 1. Recency Normalization [0, 1]
      // Newer observations score closer to 1.0
      let recencyNorm = 1.0;
      let elapsedHours = 0;
      if (record.timestamp && maxTimestamp > -Infinity) {
        const deltaMs = Math.max(0, maxTimestamp - record.timestamp);
        elapsedHours = Math.round((deltaMs / (3600 * 1000)) * 10) / 10;
        recencyNorm = Math.max(0, 1.0 - (deltaMs / maxHorizonMs));
      }

      // 2. Confidence Normalization [0, 1]
      const confNorm = Math.min(1.0, Math.max(0, record.confidence_norm ?? 0.5));

      // 3. FRP Normalization [0, 1] with soft log-scaling
      const rawFrp = Math.max(0, record.frp || 0);
      const frpNorm = Math.min(1.0, Math.log(1 + rawFrp) / logFrpRef);

      // 4. Repeat Proximity Normalization [0, 1]
      // 1 detection = 0.0, 2 = 0.25, 3 = 0.5, 4 = 0.75, 5+ = 1.0
      const count = repeatCounts[index];
      const repeatNorm = Math.min(1.0, Math.max(0, (count - 1) / 4.0));

      // Factor Contributions (out of 100)
      const recencyContrib = normW.recency * recencyNorm * 100;
      const confContrib = normW.confidence * confNorm * 100;
      const frpContrib = normW.frp * frpNorm * 100;
      const repeatContrib = normW.repeat * repeatNorm * 100;

      const rawScore = recencyContrib + confContrib + frpContrib + repeatContrib;
      const finalScore = Math.round(Math.min(100, Math.max(0, rawScore)) * 10) / 10;

      // Category assignment
      let priorityCategory = 'Low';
      let priorityColor = '#94A3B8'; // Slate/subtle
      let priorityClass = 'priority-low';
      if (finalScore >= 70.0) {
        priorityCategory = 'High';
        priorityColor = '#EF4444'; // Red
        priorityClass = 'priority-high';
      } else if (finalScore >= 40.0) {
        priorityCategory = 'Medium';
        priorityColor = '#F59E0B'; // Amber
        priorityClass = 'priority-medium';
      }

      // Generate explainable narrative summary
      const narrativeParts = [];
      if (recencyNorm >= 0.85) narrativeParts.push(`Recently detected (${elapsedHours}h ago relative to latest pass)`);
      if (confNorm >= 0.8) narrativeParts.push(`High satellite detection confidence (${record.confidence_percent}%)`);
      if (rawFrp >= 150) narrativeParts.push(`Intense thermal radiance (${rawFrp} MW)`);
      else if (rawFrp >= 50) narrativeParts.push(`Moderate thermal radiance (${rawFrp} MW)`);
      if (count > 1) narrativeParts.push(`${count} repeat detections clustered within 1.5 km`);

      const narrative = narrativeParts.length > 0 
        ? narrativeParts.join(' • ') 
        : `Baseline thermal signature with standard confidence (${record.confidence_percent}%) and low FRP (${rawFrp} MW).`;

      const nearby = nearbyRecordsMap.get(record.id) || [];

      return {
        ...record,
        repeat_count: count,
        nearby_detections: nearby,
        score: finalScore,
        priority_category: priorityCategory,
        priority_color: priorityColor,
        priority_class: priorityClass,
        factor_breakdown: {
          recency: {
            raw: `${elapsedHours} hrs elapsed`,
            norm: Math.round(recencyNorm * 1000) / 1000,
            weightPercent: Math.round(normW.recency * 100),
            contribution: Math.round(recencyContrib * 10) / 10
          },
          confidence: {
            raw: `${record.confidence_percent}% (${record.confidence_raw})`,
            norm: Math.round(confNorm * 1000) / 1000,
            weightPercent: Math.round(normW.confidence * 100),
            contribution: Math.round(confContrib * 10) / 10
          },
          frp: {
            raw: `${rawFrp} MW ${record.frp_imputed ? '(imputed)' : ''}`,
            norm: Math.round(frpNorm * 1000) / 1000,
            weightPercent: Math.round(normW.frp * 100),
            contribution: Math.round(frpContrib * 10) / 10
          },
          repeat: {
            raw: `${count} detections within 1.5 km`,
            norm: Math.round(repeatNorm * 1000) / 1000,
            weightPercent: Math.round(normW.repeat * 100),
            contribution: Math.round(repeatContrib * 10) / 10
          }
        },
        narrative
      };
    });

    // Default sort by priority score descending
    scoredRecords.sort((a, b) => b.score - a.score);

    return scoredRecords;
  }
}
