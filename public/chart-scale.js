// Curves contain sorted { time, value } points, with missing measurements removed.
export function visibleMaximum(curves, markers, first, last, markerPadding = 0) {
  let maximum = 0;
  for (const points of curves) {
    let low = 0, high = points.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (points[middle].time < first) low = middle + 1;
      else high = middle;
    }
    // Include the visible parts of segments crossing either viewport boundary,
    // even when a long polling pause leaves no point inside the viewport.
    for (let i = Math.max(0, low - 1); i < points.length; i++) {
      const point = points[i], next = points[i + 1];
      if (point.time > last) break;
      if (point.time >= first) maximum = Math.max(maximum, point.value);
      if (!next || next.time < first || next.time === point.time) continue;
      for (const boundary of [first, last]) {
        if (point.time <= boundary && next.time >= boundary) {
          const value = point.value + (next.value - point.value) * (boundary - point.time) / (next.time - point.time);
          maximum = Math.max(maximum, value);
        }
      }
    }
  }
  for (const point of markers) if (point.time >= first - markerPadding && point.time <= last + markerPadding) maximum = Math.max(maximum, point.value);
  return maximum;
}

export function axisMaximum(curves, markers, first, last, markerPadding = 0) {
  // Two percentage points of headroom, rounded up in steps of five.
  // Keep the 5% reference readable, including when all series are switched off.
  return Math.min(100, Math.max(10, Math.ceil((visibleMaximum(curves, markers, first, last, markerPadding) + 2) / 5) * 5));
}
