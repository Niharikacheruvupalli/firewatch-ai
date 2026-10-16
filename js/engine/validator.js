/**
 * FIREWATCH AI - Satellite Observation Validation Engine
 * Implements strict NASA FIRMS validation criteria, error explanation logs, and duplicate detection.
 */

export class ObservationValidator {
  /**
   * Parse and validate raw CSV string using PapaParse.
   * @param {string} csvText - Raw CSV input text
   * @returns {Object} Validation result with validRecords, invalidRecords, warnings, statistics
   */
  static validateCSV(csvText) {
    if (!csvText || typeof csvText !== 'string' || !csvText.trim()) {
      return {
        validRecords: [],
        invalidRecords: [{
          rowNumber: 1,
          rawRecord: {},
          reasons: ['CSV input is empty or contains no content.']
        }],
        warnings: [],
        stats: {
          totalRows: 0,
          validCount: 0,
          invalidCount: 0,
          warningCount: 0,
          duplicatesCount: 0,
          outOfBoundsCount: 0,
          missingFieldsCount: 0,
          malformedCount: 0
        }
      };
    }

    // Use global Papa if present, else fallback simple parser
    let parseResult;
    if (typeof Papa !== 'undefined') {
      parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: 'greedy',
        dynamicTyping: false // keep raw strings for transparent validation
      });
    } else {
      parseResult = this.simpleCSVParse(csvText);
    }

    const rows = parseResult.data || [];
    const validRecords = [];
    const invalidRecords = [];
    const warnings = [];

    // Duplicate detection tracker
    const seenSignatures = new Map();

    let duplicatesCount = 0;
    let outOfBoundsCount = 0;
    let missingFieldsCount = 0;
    let malformedCount = 0;

    rows.forEach((row, index) => {
      const rowNumber = index + 2; // +1 for 0-index, +1 for header line
      const reasons = [];
      const rowWarnings = [];

      // Check for completely malformed or empty row
      const keys = Object.keys(row).filter(k => k && k.trim() !== '');
      if (keys.length < 2) {
        malformedCount++;
        invalidRecords.push({
          rowNumber,
          rawRecord: row,
          reasons: ['Malformed or truncated row: insufficient delimiter columns.'],
          isDuplicate: false
        });
        return;
      }

      // Case-insensitive key lookup helper
      const getVal = (...fieldNames) => {
        for (const name of fieldNames) {
          for (const key of keys) {
            if (key.trim().toLowerCase() === name.toLowerCase()) {
              const val = row[key];
              return val !== undefined && val !== null ? String(val).trim() : '';
            }
          }
        }
        return '';
      };

      const latStr = getVal('latitude', 'lat');
      const lonStr = getVal('longitude', 'lon', 'long');
      const dateStr = getVal('acq_date', 'date');
      const timeStr = getVal('acq_time', 'time');
      const confStr = getVal('confidence', 'conf');
      const frpStr = getVal('frp', 'power');
      const brightStr = getVal('brightness', 'bright_ti4', 'temp');
      const brightT31Str = getVal('bright_t31', 'bright_ti5');
      const satStr = getVal('satellite', 'sat') || 'Unknown';
      const instStr = getVal('instrument', 'inst') || 'VIIRS/MODIS';
      const daynightStr = getVal('daynight', 'dn') || 'U';

      // 1. Latitude validation
      let latitude = NaN;
      if (!latStr) {
        reasons.push('Missing required field: latitude');
        missingFieldsCount++;
      } else {
        latitude = parseFloat(latStr);
        if (isNaN(latitude)) {
          reasons.push(`Invalid latitude value "${latStr}": must be a valid float.`);
          malformedCount++;
        } else if (latitude < -90.0 || latitude > 90.0) {
          reasons.push(`Latitude ${latitude}° is out of valid bounds [-90.0, 90.0].`);
          outOfBoundsCount++;
        }
      }

      // 2. Longitude validation
      let longitude = NaN;
      if (!lonStr) {
        reasons.push('Missing required field: longitude');
        missingFieldsCount++;
      } else {
        longitude = parseFloat(lonStr);
        if (isNaN(longitude)) {
          reasons.push(`Invalid longitude value "${lonStr}": must be a valid float.`);
          malformedCount++;
        } else if (longitude < -180.0 || longitude > 180.0) {
          reasons.push(`Longitude ${longitude}° is out of valid bounds [-180.0, 180.0].`);
          outOfBoundsCount++;
        }
      }

      // 3. Acquisition Date validation
      let parsedDate = null;
      let isoDate = '';
      if (!dateStr) {
        reasons.push('Missing required field: acq_date');
        missingFieldsCount++;
      } else {
        // Support YYYY-MM-DD or standard Date parse
        const match = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (match) {
          const y = parseInt(match[1], 10);
          const m = parseInt(match[2], 10);
          const d = parseInt(match[3], 10);
          if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            isoDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            parsedDate = new Date(`${isoDate}T00:00:00Z`);
          } else {
            reasons.push(`Invalid calendar date values in "${dateStr}".`);
            malformedCount++;
          }
        } else {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) {
            reasons.push(`Malformed acquisition date format: "${dateStr}". Expected YYYY-MM-DD.`);
            malformedCount++;
          } else {
            isoDate = d.toISOString().split('T')[0];
            parsedDate = d;
          }
        }
      }

      // 4. Acquisition Time validation (e.g., "2135", "0240", "14:20")
      let formattedTime = '00:00';
      if (!timeStr) {
        rowWarnings.push('Missing acq_time; defaulted to 00:00 UTC.');
      } else {
        const cleanTime = timeStr.replace(/[^0-9]/g, '');
        if (cleanTime.length >= 1 && cleanTime.length <= 4) {
          const padded = cleanTime.padStart(4, '0');
          const hours = parseInt(padded.slice(0, 2), 10);
          const mins = parseInt(padded.slice(2, 4), 10);
          if (hours >= 0 && hours <= 23 && mins >= 0 && mins <= 59) {
            formattedTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
          } else {
            reasons.push(`Invalid acquisition time values: ${timeStr} (hours 0-23, mins 0-59).`);
            malformedCount++;
          }
        } else {
          reasons.push(`Malformed acquisition time format: "${timeStr}". Expected HHMM or HH:MM.`);
          malformedCount++;
        }
      }

      // 5. Fire Radiative Power (FRP) validation
      let frp = 0;
      let frpImputed = false;
      if (!frpStr) {
        rowWarnings.push('FRP attribute missing; defaulted to 5.0 MW baseline.');
        frp = 5.0;
        frpImputed = true;
      } else {
        const pFrp = parseFloat(frpStr);
        if (isNaN(pFrp)) {
          rowWarnings.push(`Non-numeric FRP "${frpStr}"; imputed to 5.0 MW baseline.`);
          frp = 5.0;
          frpImputed = true;
        } else if (pFrp < 0) {
          reasons.push(`FRP cannot be negative (${pFrp} MW).`);
          malformedCount++;
        } else {
          frp = pFrp;
        }
      }

      // 6. Confidence validation & normalization
      let confidenceNorm = 0.5; // normalized 0-1
      let confidenceRaw = confStr || 'nominal';
      let confidencePercent = 50;
      if (!confStr) {
        rowWarnings.push('Confidence missing; imputed as nominal (50%).');
      } else {
        const pConf = parseFloat(confStr);
        if (!isNaN(pConf)) {
          if (pConf < 0 || pConf > 100) {
            reasons.push(`Confidence percentage ${pConf}% outside valid range [0, 100].`);
            malformedCount++;
          } else {
            confidencePercent = pConf;
            confidenceNorm = pConf / 100;
          }
        } else {
          // Categorical mapping (NASA VIIRS uses 'l', 'n', 'h' or 'low', 'nominal', 'high')
          const lower = confStr.toLowerCase();
          if (lower === 'h' || lower === 'high') {
            confidenceNorm = 0.95;
            confidencePercent = 95;
          } else if (lower === 'n' || lower === 'nominal') {
            confidenceNorm = 0.65;
            confidencePercent = 65;
          } else if (lower === 'l' || lower === 'low') {
            confidenceNorm = 0.25;
            confidencePercent = 25;
          } else {
            rowWarnings.push(`Unrecognized categorical confidence "${confStr}"; defaulted to 50%.`);
            confidenceNorm = 0.5;
            confidencePercent = 50;
          }
        }
      }

      // 7. Brightness & Bright T31 validation
      const brightness = parseFloat(brightStr) || null;
      const brightT31 = parseFloat(brightT31Str) || null;

      // 8. Duplicate check
      let isDuplicate = false;
      if (!isNaN(latitude) && !isNaN(longitude) && isoDate) {
        const signature = `${latitude.toFixed(4)}_${longitude.toFixed(4)}_${isoDate}_${formattedTime}_${satStr}`;
        if (seenSignatures.has(signature)) {
          isDuplicate = true;
          duplicatesCount++;
          const prevRow = seenSignatures.get(signature);
          reasons.push(`Duplicate observation detected. Exactly matches coordinates, satellite, and timestamp of row #${prevRow}.`);
        } else {
          seenSignatures.set(signature, rowNumber);
        }
      }

      // Compile Record Result
      if (reasons.length > 0) {
        invalidRecords.push({
          rowNumber,
          rawRecord: row,
          reasons,
          isDuplicate
        });
      } else {
        // Construct clean timestamp
        const timestampMs = new Date(`${isoDate}T${formattedTime}:00Z`).getTime();

        const validItem = {
          id: `firms_${rowNumber}_${Math.random().toString(36).substring(2, 7)}`,
          rowNumber,
          latitude,
          longitude,
          acq_date: isoDate,
          acq_time: formattedTime,
          timestamp: timestampMs,
          confidence_raw: confidenceRaw,
          confidence_percent: confidencePercent,
          confidence_norm: confidenceNorm,
          frp: frp,
          frp_imputed: frpImputed,
          brightness: brightness,
          bright_t31: brightT31,
          satellite: satStr,
          instrument: instStr,
          daynight: daynightStr.toUpperCase().startsWith('D') ? 'Day' : 'Night',
          raw: row,
          warnings: rowWarnings
        };

        if (rowWarnings.length > 0) {
          warnings.push({
            rowNumber,
            warnings: rowWarnings,
            id: validItem.id
          });
        }

        validRecords.push(validItem);
      }
    });

    return {
      validRecords,
      invalidRecords,
      warnings,
      stats: {
        totalRows: rows.length,
        validCount: validRecords.length,
        invalidCount: invalidRecords.length,
        warningCount: warnings.length,
        duplicatesCount,
        outOfBoundsCount,
        missingFieldsCount,
        malformedCount
      }
    };
  }

  /**
   * Simple CSV fallback parser if PapaParse is not loaded
   */
  static simpleCSVParse(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) return { data: [] };
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = parts[idx] !== undefined ? parts[idx] : '';
      });
      data.push(obj);
    }
    return { data };
  }
}
