/**
 * The composition as SVG.
 *
 * This is the first thing painted on every visit and the thing that stays if no GPU path works.
 * It is the same geometry through the same camera as the 3D view, so enhancement is a change of
 * technique rather than a change of picture.
 *
 * It is interactive in its own right: pieces and markers can be clicked here exactly as they can
 * in the canvas, so "the renderer failed" never means "you cannot use this screen".
 */
import { useMemo, type CSSProperties } from 'react'
import { facePath, project } from '~/assemblage/project'
import type { AssemblageView } from '~/assemblage/view'

export interface StaticAssemblageProps {
  view: AssemblageView
  /** Degrees of yaw, following the same limited orbit as the canvas. */
  yaw: number
  selectedInstanceId: string | null
  onSelectPiece: (instanceId: string) => void
  onSelectMarker: (markerId: string) => void
  /** Spoken description of the whole composition, for anybody who cannot see it. */
  description: string
  width: number
  height: number
}

export function StaticAssemblage({
  view,
  yaw,
  selectedInstanceId,
  onSelectPiece,
  onSelectMarker,
  description,
  width,
  height,
}: StaticAssemblageProps) {
  const aspect = height > 0 ? width / height : 1.6
  const projection = useMemo(() => project(view, aspect, yaw), [view, aspect, yaw])
  const { viewBox } = projection
  // A hairline of the face's own colour, to close the seam antialiasing leaves between adjacent
  // triangles. Scaled to the viewBox so it stays one sub-pixel at any size.
  const seam = viewBox.width / 2600

  const style: CSSProperties = { background: view.groundColour }

  return (
    <svg
      className="assemblage-svg"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      style={style}
      role="img"
      aria-label={description}
      onClick={(event) => {
        const target = event.target as SVGElement
        const markerId = target.dataset?.marker
        if (markerId) {
          onSelectMarker(markerId)
          return
        }
        const instanceId = target.dataset?.piece
        if (instanceId) onSelectPiece(instanceId)
      }}
    >
      <ellipse
        cx={projection.groundShadow.cx}
        cy={projection.groundShadow.cy}
        rx={projection.groundShadow.rx}
        ry={projection.groundShadow.ry}
        fill={view.inkColour}
        opacity={0.17}
      />
      {projection.faces.map((face, index) => (
        <path
          // Faces have no identity of their own; the index within this sorted list is the only
          // stable thing about one, and the whole list is rebuilt whenever anything changes.
          key={index}
          d={facePath(face)}
          fill={face.fill}
          stroke={face.fill}
          strokeWidth={seam}
          data-piece={face.instanceId}
          {...(face.markerId ? { 'data-marker': face.markerId } : {})}
        />
      ))}
      {selectedInstanceId
        ? projection.faces
            .filter((face) => face.instanceId === selectedInstanceId && face.kind === 'piece')
            .map((face, index) => (
              <path
                key={`selected-${index}`}
                d={facePath(face)}
                fill="none"
                stroke={view.accentColour}
                strokeWidth={viewBox.width / 260}
                strokeLinejoin="round"
                pointerEvents="none"
              />
            ))
        : null}
    </svg>
  )
}
