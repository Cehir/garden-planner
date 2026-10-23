export default function Compass() {
  return (
    <div className="compass" aria-hidden="true">
      <svg viewBox="-40 -40 80 80" width="56" height="56">
        <circle cx={0} cy={0} r={30} fill="none" stroke="#a89f8d" strokeWidth={1.5} strokeDasharray="2 3" />
        <line x1={0} y1={-24} x2={0} y2={-30} stroke="#2f6f4f" strokeWidth={3} />
        <polygon points="0,-34 -5,-24 5,-24" fill="#2f6f4f" />
        <line x1={0} y1={24} x2={0} y2={30} stroke="#c9beb0" strokeWidth={1.5} />
        <line x1={-24} y1={0} x2={-30} y2={0} stroke="#c9beb0" strokeWidth={1.5} />
        <line x1={24} y1={0} x2={30} y2={0} stroke="#c9beb0" strokeWidth={1.5} />
        <text x={0} y={-36} textAnchor="middle" fontSize={11} fontWeight={700} fill="#2f6f4f">N</text>
        <text x={0} y={41} textAnchor="middle" fontSize={9} fill="#8a8272">S</text>
        <text x={-41} y={3} textAnchor="middle" fontSize={9} fill="#8a8272">W</text>
        <text x={41} y={3} textAnchor="middle" fontSize={9} fill="#8a8272">O</text>
      </svg>
      <span className="compass-note">Sonne ⬇ Süden · Schatten ⬆ Norden</span>
    </div>
  )
}
