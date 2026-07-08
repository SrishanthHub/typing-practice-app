const ROWS = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m']
];

export default function Heatmap({ errorMap }) {
  const max = Math.max(1, ...Object.values(errorMap || {}));

  function colorFor(key) {
    const count = errorMap?.[key] || 0;
    if (count === 0) return 'rgba(255,255,255,0.06)';
    const intensity = Math.min(1, count / max);
    // interpolate from sub-color-ish to full error red
    const alpha = 0.25 + intensity * 0.75;
    return `rgba(202, 71, 84, ${alpha})`;
  }

  if (!errorMap || Object.keys(errorMap).length === 0) {
    return <p style={{ color: 'var(--sub-color)' }}>No mistakes recorded yet — keep practicing!</p>;
  }

  return (
    <div>
      {ROWS.map((row, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'center', marginLeft: i * 12 }}>
          {row.map((key) => (
            <div
              key={key}
              className="heatmap-key"
              style={{ background: colorFor(key) }}
              title={`${key}: ${errorMap?.[key] || 0} mistakes`}
            >
              {key}
            </div>
          ))}
        </div>
      ))}
      <p style={{ textAlign: 'center', color: 'var(--sub-color)', fontSize: '0.8rem', marginTop: 10 }}>
        Darker = more mistakes on that letter
      </p>
    </div>
  );
}
