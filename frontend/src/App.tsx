import './App.css'
import { useState } from 'react'

interface ColorData {
  x: number
  y: number
  Red: number
  Green: number
  Blue: number
}

interface ApiResponse {
  data: ColorData[]
  responseTime: number
  totalRequests: number
}

type ApiMode = 'online' | 'locally'

function App() {
  const [colors, setColors] = useState<ColorData[]>([])
  const [responseTime, setResponseTime] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<ApiMode>('online')

  const fetchColors = async () => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:3000/api/colors?mode=${mode}`)
      const result: ApiResponse = await response.json()
      setColors(result.data)
      setResponseTime(result.responseTime)
      console.log('Fetched colors:', result)
    } catch (err) {
      console.error('Error fetching colors:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="controls">
        <div className="mode-selector">
          <label htmlFor="api-mode">API Mode:</label>
          <select
            id="api-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as ApiMode)}
            disabled={loading}
          >
            <option value="online">Online</option>
            <option value="locally">Locally</option>
          </select>
        </div>
        <button onClick={fetchColors} disabled={loading}>
          {loading ? 'Fetching...' : 'Fetch Colors'}
        </button>
      </div>

      {responseTime > 0 && (
        <div className="response-time">
          <strong>Response Time:</strong> {responseTime}ms
        </div>
      )}

      {colors.length > 0 && (
        <div className="color-grid">
          {colors.map((color) => (
            <div
              key={`${color.x}-${color.y}`}
              className="color-cell"
              style={{
                '--red': color.Red,
                '--green': color.Green,
                '--blue': color.Blue,
              } as React.CSSProperties}
              title={`[${color.x},${color.y}] RGB(${color.Red}, ${color.Green}, ${color.Blue})`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default App
