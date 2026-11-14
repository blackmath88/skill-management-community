/**
 * One sheet, drawn in its own coordinates, as it is made.
 *
 * On the skill tree a sheet's making says where it stands, and each step is one checkable thing:
 *
 *   outline      a wire outline in its place          nothing said, nothing recorded
 *   claimed      primed, unpainted                    the person placed themselves; no records
 *   explored     painted                              applied in writing to a real situation
 *   rehearsed    one engraved line                    rehearsed and reflected on
 *   tried        two lines and a pierced hole         tried for real, once
 *   repeated     an inlaid ring                       tried for real more than once
 *   transferred  a second, smaller pendant            tried in more than one setting
 *
 * Detail accumulates and is never taken away. Size and colour do not change with it, so a richer
 * sheet is a more worked one, not a bigger or brighter one. The outline of something the person
 * is building towards is drawn firmer than one they are not.
 */
import type { MobileShape } from '~/mobile/catalogue'
import { mix } from '~/mobile/scene'
import type { SheetFinish } from '~/mobile/view'

const PAPER = '#f3efe6'
const ORDER: readonly SheetFinish['state'][] = ['outline', 'claimed', 'explored', 'rehearsed', 'tried', 'repeated', 'transferred']

export function SheetArt({
  def,
  d,
  band,
  finish,
  colours,
  tone,
  wire,
  gradient,
  clip,
}: {
  def: MobileShape
  d: string
  /** Width of the metal for a ring. */
  band: number
  finish: SheetFinish | undefined
  colours: { top: string; bottom: string; edge: string }
  tone: string
  wire: string
  gradient: string
  clip: string
}) {
  const ring = def.kind === 'ring'
  const r = def.r
  const level = ORDER.indexOf(finish?.state ?? 'explored')

  if (level === 0) {
    const firm = finish?.target ?? false
    return (
      <path
        d={d}
        fill={firm && !ring ? PAPER : 'none'}
        fillOpacity="0.55"
        stroke={firm ? tone : wire}
        strokeWidth={firm ? 1.5 : 1}
        strokeDasharray={firm ? '4 2.5' : '2 3'}
        strokeOpacity={firm ? 0.95 : 0.75}
        vectorEffect="non-scaling-stroke"
      />
    )
  }

  if (level === 1) {
    const primer = mix(tone, PAPER, 0.7)
    return ring ? (
      <>
        <path d={d} fill="none" stroke={primer} strokeWidth={band} />
        <path d={d} fill="none" stroke={tone} strokeWidth="0.9" strokeOpacity="0.7" vectorEffect="non-scaling-stroke" />
      </>
    ) : (
      <path d={d} fill={primer} stroke={tone} strokeWidth="1" strokeOpacity="0.8" vectorEffect="non-scaling-stroke" />
    )
  }

  const line = (y: number) => `M${-r} ${y} Q0 ${y + r * 0.2} ${r} ${y}`
  return (
    <>
      {ring ? (
        <path d={d} fill="none" stroke={`url(#${gradient})`} strokeWidth={band} />
      ) : (
        <path d={d} fill={`url(#${gradient})`} stroke={colours.edge} strokeWidth="0.8" vectorEffect="non-scaling-stroke" strokeOpacity="0.55" />
      )}
      {level >= 3 && !ring ? (
        <g clipPath={`url(#${clip})`} fill="none" strokeLinecap="round">
          {(level >= 4 ? [0.2, 0.46] : [0.32]).map((at) => (
            <g key={at}>
              <path d={line(r * at)} stroke={colours.bottom} strokeWidth="1.2" strokeOpacity="0.85" vectorEffect="non-scaling-stroke" />
              <path d={line(r * at + 1.1)} stroke={colours.edge} strokeWidth="0.7" strokeOpacity="0.6" vectorEffect="non-scaling-stroke" />
            </g>
          ))}
        </g>
      ) : null}
      {level >= 3 && ring ? (
        <path d={d} fill="none" stroke={colours.bottom} strokeWidth={level >= 4 ? band * 0.34 : band * 0.16} strokeOpacity="0.55" strokeDasharray={level >= 4 ? undefined : '1.5 3'} />
      ) : null}
      {level >= 4 && !ring && def.kind !== 'crescent' ? (
        <circle cx="0" cy={-r * 0.6} r={Math.max(1.3, r * 0.1)} fill={PAPER} stroke={colours.bottom} strokeWidth="0.7" />
      ) : null}
      {level >= 5 ? (
        <circle cx="0" cy={ring ? 0 : -r * 0.14} r={ring ? Math.max(1.5, r - band - 2.2) : r * 0.27} fill="none" stroke={colours.edge} strokeWidth="1.5" strokeOpacity="0.95" />
      ) : null}
      {level >= 6 ? (
        <>
          <path d={`M0 ${r} V${r * 1.42}`} stroke={wire} strokeWidth="0.9" fill="none" />
          <circle cx="0" cy={r * 1.42 + r * 0.3} r={r * 0.3} fill={colours.top} stroke={colours.bottom} strokeWidth="0.7" />
        </>
      ) : null}
    </>
  )
}
