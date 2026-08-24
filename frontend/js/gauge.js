// Renders the signature circular "instrument" gauge used on the landing page
// and inside dashboard cards. Pure SVG, no dependencies.
// pct: 0-100 value to show. zones let callers colour the arc by meaning
// (e.g. soil moisture vs. water-stress, where "high" is good or bad respectively).

function renderGauge({ pct, size = 180, stroke = 16, zones = [
  { upTo: 33, color: "#b8442f" },
  { upTo: 66, color: "#c98a2c" },
  { upTo: 100, color: "#2f7d5a" },
] }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const startAngle = -220; // degrees, leaves a gap at the bottom like a real dial
  const sweep = 260;

  const arcColor = (zones.find((z) => clamped <= z.upTo) || zones[zones.length - 1]).color;

  const polarToCartesian = (angleDeg) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    const cx = size / 2 + radius * Math.cos(rad);
    const cy = size / 2 + radius * Math.sin(rad);
    return [cx, cy];
  };

  const describeArc = (startDeg, endDeg) => {
    const [x1, y1] = polarToCartesian(startDeg);
    const [x2, y2] = polarToCartesian(endDeg);
    const largeArc = endDeg - startDeg <= 180 ? 0 : 1;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const trackPath = describeArc(startAngle, startAngle + sweep);
  const valueAngle = startAngle + (sweep * clamped) / 100;
  const valuePath = describeArc(startAngle, valueAngle);

  // Tick marks every 10%
  let ticks = "";
  for (let i = 0; i <= 10; i++) {
    const angle = startAngle + (sweep * i) / 10;
    const [x1, y1] = (() => {
      const rad = ((angle - 90) * Math.PI) / 180;
      return [size / 2 + (radius + stroke / 2 + 3) * Math.cos(rad), size / 2 + (radius + stroke / 2 + 3) * Math.sin(rad)];
    })();
    const [x2, y2] = (() => {
      const rad = ((angle - 90) * Math.PI) / 180;
      return [size / 2 + (radius + stroke / 2 + 9) * Math.cos(rad), size / 2 + (radius + stroke / 2 + 9) * Math.sin(rad)];
    })();
    ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#16211c" stroke-opacity="0.15" stroke-width="2"/>`;
  }

  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">
    ${ticks}
    <path d="${trackPath}" stroke="#ece3cb" stroke-width="${stroke}" stroke-linecap="round" fill="none"/>
    <path d="${valuePath}" stroke="${arcColor}" stroke-width="${stroke}" stroke-linecap="round" fill="none"/>
  </svg>`;
}
