/**
 * TeamLogo — loads from src/assets/logos/[franchiseId].png (if approved)
 * or src/assets/logos/[franchiseId].svg (generated placeholder).
 *
 * Vite imports all logos at build time via import.meta.glob.
 * When a PNG is promoted from ComfyUI review it takes precedence over the SVG.
 */

// Eagerly import all logo assets at build time
const pngLogos = import.meta.glob('../assets/logos/*.png', { eager: true, as: 'url' })
const svgLogos = import.meta.glob('../assets/logos/*.svg', { eager: true, as: 'url' })

function getLogoUrl(franchiseId) {
  const png = pngLogos[`../assets/logos/${franchiseId}.png`]
  if (png) return png
  const svg = svgLogos[`../assets/logos/${franchiseId}.svg`]
  if (svg) return svg
  return null
}

export default function TeamLogo({ franchiseId, size = 32, className, style }) {
  const url = getLogoUrl(franchiseId)

  if (!url) {
    // Absolute fallback — diamond with initials
    return (
      <svg
        width={size} height={size}
        viewBox="0 0 40 40"
        className={className}
        style={style}
      >
        <polygon points="20,2 38,20 20,38 2,20" fill="#333" stroke="#666" strokeWidth="2" />
        <text x="20" y="25" textAnchor="middle" fill="#fff" fontSize="11"
          fontFamily="Arial Black, Arial, sans-serif" fontWeight="900">
          {franchiseId.slice(0, 2).toUpperCase()}
        </text>
      </svg>
    )
  }

  return (
    <img
      src={url}
      alt={franchiseId}
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', ...style }}
    />
  )
}
