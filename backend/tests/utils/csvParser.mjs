/**
 * Helper utility to parse CSV formatted test data into JSON objects.
 */
export function parseCSV(csvContent) {
  if (!csvContent || typeof csvContent !== "string") return [];
  
  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    const row = {};
    headers.forEach((header, idx) => {
      let val = values[idx] !== undefined ? values[idx] : "";
      // Type conversions
      if (val === "true") val = true;
      else if (val === "false") val = false;
      else if (val === "null") val = null;
      else if (val !== "" && !isNaN(val) && !val.includes("-") && !val.includes("/")) {
        // Keep string if phone number or date format
        if (!val.startsWith("0") || val.length === 1) {
          val = Number(val);
        }
      }
      row[header] = val;
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
