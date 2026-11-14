/**
 * The personal mobile, drawn as SVG.
 *
 * The picture is decoration with one convenience: clicking a shape that carries a memory selects
 * it. Every such action also exists as a labelled HTML button beside the picture (MemoryList in
 * MobilePanel.tsx), so the SVG is hidden from assistive technology and described in one sentence
 * instead. It receives a MobileDrawing only — never a title or a line of anybody's writing.
 *
 * The slow sway is CSS, and the global reduced-motion rule switches it off; the still picture is
 * the same picture.
 */
import { shapePath, VIEW_BOX, type MobileShape } from '~/mobile/catalogue'
import type { MobileDrawing } from '~/mobile/view'

export function Mobile({
  drawing,
  selectedSlot = null,
  onSelect,
  size = 'regular',
}: {
  drawing: MobileDrawing
  selectedSlot?: number | null
  onSelect?: (slot: number) => void
  size?: 'regular' | 'small'
}) {
  const { composition, palette, marked } = drawing
  const description =
    `Your mobile: the “${composition.title}” arrangement in ${palette.title.toLowerCase()}. ` +
    (marked.length === 0
      ? 'No memories are hung on it.'
      : `${marked.length} of its ${composition.shapes.length} shapes ${marked.length === 1 ? 'carries a memory' : 'carry memories'}, listed next to it.`)

  return (
    <figure className={`mobile mobile--${size}`}>
      <svg viewBox={VIEW_BOX} aria-hidden="true" focusable="false">
        <g fill="none" stroke={palette.wire} strokeWidth="2" strokeLinecap="round">
          {composition.wires.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        {composition.shapes.map((shape, slot) => {
          const isMarked = marked.includes(slot)
          return (
            <ShapeMark
              key={slot}
              shape={shape}
              slot={slot}
              fill={palette.tones[shape.tone]}
              wire={palette.wire}
              marked={isMarked}
              selected={selectedSlot === slot}
              {...(isMarked && onSelect ? { onSelect: () => onSelect(slot) } : {})}
            />
          )
        })}
      </svg>
      <figcaption className="visually-hidden">{description}</figcaption>
    </figure>
  )
}

function ShapeMark({
  shape,
  slot,
  fill,
  wire,
  marked,
  selected,
  onSelect,
}: {
  shape: MobileShape
  slot: number
  fill: string
  wire: string
  marked: boolean
  selected: boolean
  onSelect?: () => void
}) {
  const [px, py] = shape.pivot
  const d = shapePath(shape.kind, shape.r)
  const top = shape.cy - shape.r
  return (
    <g
      className={`mobile__hang mobile__hang--${slot % 3}${onSelect ? ' is-clickable' : ''}`}
      style={{ transformOrigin: `${px}px ${py}px` }}
      onClick={onSelect}
    >
      <path d={`M${px} ${py} L${shape.cx} ${top}`} stroke={wire} strokeWidth="1.2" fill="none" />
      <g transform={`translate(${shape.cx} ${shape.cy}) rotate(${shape.rot})`}>
        {selected ? (
          <circle r={shape.r + 9} fill="none" stroke={wire} strokeWidth="1.5" strokeDasharray="3 4" />
        ) : null}
        {shape.kind === 'ring' ? (
          <path d={shapePath('ring', shape.r - 4)} fill="none" stroke={fill} strokeWidth="8" />
        ) : (
          <path d={d} fill={fill} />
        )}
        {/* A memory is carried by a mark, not by a colour: a small bead on the thread and a
            light inlay on the shape. */}
        {marked ? <circle r={Math.max(3, shape.r * 0.18)} fill="#fffdf8" stroke={wire} strokeWidth="1" /> : null}
      </g>
      {marked ? <circle cx={(px + shape.cx) / 2} cy={(py + top) / 2} r="3.2" fill={wire} /> : null}
    </g>
  )
}
