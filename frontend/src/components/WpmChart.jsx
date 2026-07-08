import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function WpmChart({ data }) {
  if (!data || data.length === 0) {
    return <p style={{ color: 'var(--sub-color)' }}>Complete a few tests to see your progress here.</p>;
  }

  const chartData = data.map((d, i) => ({
    index: i + 1,
    wpm: d.wpm,
    accuracy: d.accuracy
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
        <XAxis dataKey="index" stroke="var(--sub-color)" tick={{ fontSize: 12 }} label={{ value: 'Test #', position: 'insideBottom', offset: -2, fill: 'var(--sub-color)', fontSize: 12 }} />
        <YAxis stroke="var(--sub-color)" tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{ background: 'var(--panel-color)', border: 'none', borderRadius: 8, color: 'var(--text-color)' }}
        />
        <Line type="monotone" dataKey="wpm" stroke="var(--main-color)" strokeWidth={2} dot={false} name="WPM" />
        <Line type="monotone" dataKey="accuracy" stroke="var(--sub-color)" strokeWidth={2} dot={false} name="Accuracy %" />
      </LineChart>
    </ResponsiveContainer>
  );
}
