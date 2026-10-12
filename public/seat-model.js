// Conditional scenarios, never an official forecast. Rules/provenance come
// from the server's reviewed jurisdiction registry.
export function apportion(votes, total, method = 'sainte-lague') {
  if (!Number.isInteger(total) || total < 1 || total > 1000 || !['sainte-lague', 'dhondt', 'hare'].includes(method)) throw new Error('Ungültiges Sitzmodell');
  if (!votes.length || votes.some(p => !Number.isFinite(p.value) || p.value <= 0) || new Set(votes.map(p => p.id)).size !== votes.length) throw new Error('Ungültige Stimmen');
  const rows = votes.map(p => ({ ...p, seats: 0 })); let tied = false;
  if (method === 'hare') {
    const sum = rows.reduce((s, p) => s + p.value, 0);
    for (const p of rows) { const quota = p.value / sum * total; p.seats = Math.floor(quota); p.remainder = quota - p.seats; }
    const ordered = [...rows].sort((a, b) => b.remainder - a.remainder || b.value - a.value || a.id.localeCompare(b.id));
    const extra = total - rows.reduce((s, p) => s + p.seats, 0);
    if (extra && ordered[extra] && Math.abs(ordered[extra - 1].remainder - ordered[extra].remainder) < 1e-10) tied = true;
    for (let i = 0; i < extra; i++) ordered[i].seats++;
    return { rows: rows.map(({ remainder, ...p }) => p), tied };
  }
  for (let n = 0; n < total; n++) {
    const quotient = p => p.value / (method === 'dhondt' ? p.seats + 1 : 2 * p.seats + 1);
    const sorted = [...rows].sort((a, b) => quotient(b) - quotient(a) || b.value - a.value || a.id.localeCompare(b.id));
    if (n === total - 1 && sorted[1] && Math.abs(quotient(sorted[0]) - quotient(sorted[1])) < 1e-10) tied = true;
    sorted[0].seats++;
  }
  return { rows, tied };
}

export function projectSeats(data, rule, mode = 'poll', exceptions = []) {
  if (!rule || rule.type === 'gap') return { status: 'gap', reason: rule?.reason || 'Für dieses Wahlgebiet fehlt ein geprüftes Sitzmodell.' };
  const observation = mode === 'average' ? data.points.at(-1) : data.latestPoll;
  if (!observation) return { status: 'gap', reason: 'Keine aktuelle Umfrage verfügbar.' };
  const values = Object.fromEntries(Object.entries(observation.values).map(([id, v]) => [id, mode === 'average' ? v?.value ?? null : v]));
  const known = data.parties.filter(p => p.kind !== 'response-group' && Number.isFinite(values[p.id])).map(p => ({ ...p, value: values[p.id] }));
  const reportedSum = known.reduce((s, p) => s + p.value, 0);
  let denominator = 100;
  if (rule.type === 'barcelona') {
    if (['bcn-undecided', 'bcn-abstention', 'bcn-blank', 'bcn-other'].some(id => !Number.isFinite(values[id]))) return { status: 'gap', reason: 'Antwortgruppen für die Bezugsgröße fehlen.' };
    // Blank/null are published together. All are provisionally treated as
    // valid blank ballots: a conservative, explicit threshold assumption.
    denominator = reportedSum + values['bcn-blank'] + values['bcn-other'];
    if (values['bcn-other'] / denominator * 100 >= rule.threshold) return { status: 'gap', reason: '„Andere Parteien“ könnten die Sperrklausel erreichen. Ihre einzelnen Anteile fehlen.' };
  }
  if (!(denominator > 0) || reportedSum <= 0 || reportedSum > 100.5) return { status: 'gap', reason: 'Die berichteten Parteianteile ergeben keine verwendbare Bezugsgröße.' };
  const eligible = known.filter(p => p.value > 0 && (p.value / denominator * 100 >= rule.threshold - 1e-10 || rule.exceptions?.includes(p.id) || (rule.type === 'bundestag' || rule.directException) && exceptions.includes(p.id)));
  if (!eligible.length) return { status: 'gap', reason: 'Keine ausgewiesene Partei erreicht die angenommene Sperrklausel.' };
  const rows = known.map(p => ({ ...p, seats: 0 })); let tied = false;
  for (const district of rule.districts || [rule.seats]) {
    const seats = typeof district === 'number' ? district : district.seats;
    let allocation = apportion(eligible, seats, rule.method);
    if (rule.majorityGuarantee) {
      const base = rule.majorityGuarantee === 'all' ? denominator : eligible.reduce((s, p) => s + p.value, 0);
      const winner = eligible.find(p => p.value > base / 2);
      const minimum = Math.floor(seats / 2) + 1;
      if (winner && allocation.rows.find(p => p.id === winner.id).seats < minimum) {
        if (rule.majorityGuarantee === 'additional') {
          const row = allocation.rows.find(p => p.id === winner.id); let size = seats;
          while (row.seats <= Math.floor(size / 2)) { row.seats++; size++; }
        } else if (rule.method === 'hare') {
          // Statutory pre-allocation of one remainder seat, using the
          // original quotas (no renormalisation of the other parties).
          const sum = eligible.reduce((s, p) => s + p.value, 0);
          const forced = eligible.map(p => { const quota = p.value / sum * seats; return { ...p, seats: Math.floor(quota), remainder: quota - Math.floor(quota) }; });
          forced.find(p => p.id === winner.id).seats++;
          const extra = seats - forced.reduce((s, p) => s + p.seats, 0);
          const others = forced.filter(p => p.id !== winner.id).sort((a, b) => b.remainder - a.remainder || b.value - a.value || a.id.localeCompare(b.id));
          const tie = extra > 0 && others[extra] && Math.abs(others[extra - 1].remainder - others[extra].remainder) < 1e-10;
          for (let i = 0; i < extra; i++) others[i].seats++;
          allocation = { rows: forced.map(({ remainder, ...p }) => p), tied: Boolean(tie) };
        } else {
          const other = eligible.filter(p => p.id !== winner.id);
          const rest = seats === minimum ? { rows: other.map(p => ({ ...p, seats: 0 })), tied: false } : apportion(other, seats - minimum, rule.method);
          allocation = { rows: eligible.map(p => ({ ...p, seats: p.id === winner.id ? minimum : rest.rows.find(r => r.id === p.id).seats })), tied: rest.tied };
        }
      }
    }
    tied ||= allocation.tied;
    for (const party of allocation.rows) rows.find(p => p.id === party.id).seats += party.seats;
  }
  const total = rows.reduce((s, p) => s + p.seats, 0);
  return { status: 'model', rows, tied, total, baseTotal: rule.seats, majority: Math.floor(total / 2) + 1, denominator, date: observation.date, missing: data.parties.filter(p => p.kind !== 'response-group' && !Number.isFinite(values[p.id])).map(p => p.label) };
}

export function coalition(result, ids) {
  if (result.status !== 'model') return null;
  const selected = new Set(ids), seats = result.rows.filter(p => selected.has(p.id)).reduce((s, p) => s + p.seats, 0);
  return { seats, majority: seats >= result.majority, needed: Math.max(0, result.majority - seats) };
}
