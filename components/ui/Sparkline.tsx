/** Tiny area sparkline. Green if last >= first, else red. Ported from mockup. */
export function Sparkline({
  data,
  width = 72,
  height = 24,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  if (!data || data.length < 2) {
    return <svg width={width} height={height} />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const X = (i: number) => (i * width) / (data.length - 1);
  const Y = (v: number) => 2 + (1 - (v - min) / (max - min || 1)) * (height - 4);
  const up = data[data.length - 1] >= data[0];
  const color = up ? "#2ED3B7" : "#FB2C36";
  let p = "";
  data.forEach((v, i) => {
    p += (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1) + " ";
  });
  const gid = `sg-${width}-${min.toFixed(0)}-${max.toFixed(0)}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${p}L${width} ${height}L0 ${height}Z`} fill={`url(#${gid})`} />
      <path
        d={p}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}
