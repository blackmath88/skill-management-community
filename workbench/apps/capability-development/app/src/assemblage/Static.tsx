import { geometry } from './geometry'
import { PALETTES, part, poses, type Composition, type Vec } from './model'
export function StaticAssemblage({
  composition,
  selected,
  azimuth,
  onSelect,
}: {
  composition: Composition
  selected: string
  azimuth: number
  onSelect(id: string): void
}) {
  const transforms = poses(composition)
  const sx = Math.sin(azimuth),
    cz = Math.cos(azimuth)
  const project = ([x, y, z]: Vec) => [
    360 + (x * cz - z * sx) * 93,
    400 + (x * sx * 0.47 + z * cz * 0.47 - y * 0.88) * 93,
  ]
  const faces = composition.pieces
    .flatMap((p) => {
      const pose = transforms.get(p.id)!
      const sign = pose.angle % 360 === 0 ? 1 : -1
      const g = geometry(p.partId)
      const vertices = g.vertices.map(([x, y, z]): Vec => [
        x * sign + pose.at[0],
        y + pose.at[1],
        z * sign + pose.at[2],
      ])
      return g.faces.flatMap((f, i) => {
        const points = f.map((j) => vertices[j]!)
        const a = points[0]!,
          b = points[1]!,
          c = points[2]!
        const u = b.map((v, j) => v - a[j]!),
          v = c.map((val, j) => val - a[j]!)
        const n = [
          u[1]! * v[2]! - u[2]! * v[1]!,
          u[2]! * v[0]! - u[0]! * v[2]!,
          u[0]! * v[1]! - u[1]! * v[0]!,
        ]
        const len = Math.hypot(...n) || 1
        if (n[0]! * sx + n[1]! * 0.5 + n[2]! * cz <= 0) return []
        const light = (n[0]! * -0.4 + n[1]! * 0.8 + n[2]! * 0.45) / len
        return [
          {
            id: p.id,
            key: `${p.id}-${i}`,
            points: points.map((v) => project(v).join(',')).join(' '),
            depth: points.reduce((s, v) => s + v[0] * sx + v[2] * cz + v[1] * 0.5, 0) / points.length,
            color: PALETTES[composition.palette].colors[part(p.partId).color],
            shade: 0.17 - light * 0.15,
          },
        ]
      })
    })
    .sort((a, b) => a.depth - b.depth)
  return (
    <svg
      className="assemblage-static"
      viewBox="0 0 720 500"
      role="img"
      aria-label="Your faceted assemblage. Piece selection and all editing controls follow below."
    >
      <defs>
        <filter id="ground-soft">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <ellipse cx="360" cy="417" rx="220" ry="29" fill="#675d4a" opacity=".16" filter="url(#ground-soft)" />
      {faces.map((f) => (
        <g key={f.key} onClick={() => onSelect(f.id)}>
          <polygon
            points={f.points}
            fill={f.color}
            stroke={selected === f.id ? '#3b493e' : f.color}
            strokeWidth={selected === f.id ? 1.1 : 0.4}
          />
          <polygon points={f.points} fill="#181d17" opacity={Math.max(0, f.shade)} />
        </g>
      ))}
      {composition.markers
        .filter((m) => m.visible && transforms.has(m.instanceId))
        .map((m) => {
          const p = composition.pieces.find((p) => p.id === m.instanceId)!
          const pose = transforms.get(p.id)!
          const [x, y] = project([
            pose.at[0],
            pose.at[1] + part(p.partId).size[1] * 0.75,
            pose.at[2] + part(p.partId).size[2] / 2,
          ])
          return (
            <text
              key={m.id}
              x={x}
              y={y}
              onClick={() => onSelect(m.id)}
              fill="#f5e9c6"
              fontSize="17"
              textAnchor="middle"
            >
              {m.motif === 'loop' ? '∞' : m.motif === 'route' ? '↱' : 'Ⅱ'}
            </text>
          )
        })}
    </svg>
  )
}
