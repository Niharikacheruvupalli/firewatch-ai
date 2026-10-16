/**
 * FIREWATCH AI - Data Export Utilities
 * Generates formatted CSV and JSON downloads for processed observations and validation audits.
 */

export class ExportUtils {
  /**
   * Triggers a browser download of text data as a file.
   */
  static triggerDownload(content, filename, mimeType = 'text/csv;charset=utf-8;') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Export scored observations to CSV with explainable triage metrics.
   */
  static exportObservationsToCSV(records, filename = 'firewatch_triaged_observations.csv') {
    if (!records || records.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = [
      'id',
      'row_number',
      'latitude',
      'longitude',
      'acq_date',
      'acq_time',
      'satellite',
      'instrument',
      'daynight',
      'confidence_percent',
      'confidence_raw',
      'frp_mw',
      'brightness_k',
      'bright_t31_k',
      'repeat_count_1_5km',
      'priority_score',
      'priority_category',
      'recency_contribution',
      'confidence_contribution',
      'frp_contribution',
      'repeat_contribution',
      'ranking_explanation'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
    };

    const lines = [headers.join(',')];

    records.forEach(r => {
      const fb = r.factor_breakdown || {};
      const row = [
        r.id,
        r.rowNumber,
        r.latitude,
        r.longitude,
        r.acq_date,
        r.acq_time,
        r.satellite,
        r.instrument,
        r.daynight,
        r.confidence_percent,
        r.confidence_raw,
        r.frp,
        r.brightness || '',
        r.bright_t31 || '',
        r.repeat_count || 1,
        r.score,
        r.priority_category,
        fb.recency?.contribution || 0,
        fb.confidence?.contribution || 0,
        fb.frp?.contribution || 0,
        fb.repeat?.contribution || 0,
        r.narrative || ''
      ];
      lines.push(row.map(escapeCsv).join(','));
    });

    this.triggerDownload(lines.join('\r\n'), filename);
  }

  /**
   * Export comprehensive Validation Audit Report as CSV or JSON.
   */
  static exportValidationAudit(validationResult, format = 'csv') {
    const { stats, invalidRecords, warnings } = validationResult;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (format === 'json') {
      const jsonContent = JSON.stringify({
        system: 'FIREWATCH AI - Satellite Observation Validation Engine',
        generatedAt: new Date().toISOString(),
        summaryStatistics: stats,
        invalidRecords: invalidRecords.map(inv => ({
          rowNumber: inv.rowNumber,
          reasons: inv.reasons,
          isDuplicate: inv.isDuplicate,
          rawValues: inv.rawRecord
        })),
        warnings
      }, null, 2);

      this.triggerDownload(jsonContent, `firewatch_validation_audit_${timestamp}.json`, 'application/json');
      return;
    }

    // CSV format
    const headers = ['row_number', 'status', 'failure_reasons', 'is_duplicate', 'raw_record_snippet'];
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
    };

    const lines = [headers.join(',')];

    invalidRecords.forEach(inv => {
      const snippet = Object.entries(inv.rawRecord || {})
        .map(([k, v]) => `${k}:${v}`)
        .join('; ');

      lines.push([
        inv.rowNumber,
        'REJECTED',
        inv.reasons.join(' | '),
        inv.isDuplicate ? 'YES' : 'NO',
        snippet
      ].map(escapeCsv).join(','));
    });

    this.triggerDownload(lines.join('\r\n'), `firewatch_validation_audit_${timestamp}.csv`);
  }
}
