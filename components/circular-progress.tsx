'use client'

export default function CircularProgress({ 
  percentage, 
  size = 80, 
  strokeWidth = 8 
}: {
  percentage: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute" width={size} height={size}>
        <circle 
          cx={size/2} 
          cy={size/2} 
          r={radius} 
          fill="none" 
          stroke="#eee" 
          strokeWidth={strokeWidth} 
        />
        <circle 
          cx={size/2} 
          cy={size/2} 
          r={radius} 
          fill="none" 
          stroke="#8884d8" 
          strokeWidth={strokeWidth}
          strokeDasharray={circumference} 
          strokeDashoffset={offset} 
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} 
        />
      </svg>
      <div className="absolute text-lg font-bold">{percentage.toFixed(0)}%</div>
    </div>
  )
}