import './App.css'
import { useState, useEffect } from 'react'

interface ColorData {
  x: number
  y: number
  Red: number
  Green: number
  Blue: number
  teamId?: number
}

interface Team {
  id: number
  name: string
  color: {
    Red: number
    Green: number
    Blue: number
  }
}

interface ApiResponse {
  data: ColorData[]
  responseTime: number
  totalRequests: number
}

interface TeamsResponse {
  teams: Team[]
}

type ApiMode = 'online' | 'locally'

function App() {
  const [colors, setColors] = useState<ColorData[]>([])
  const [responseTime, setResponseTime] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<ApiMode>('locally')
  const [teams, setTeams] = useState<Team[]>([])
  const [inputX, setInputX] = useState<string>('')
  const [inputY, setInputY] = useState<string>('')
  const [selectedTeamId, setSelectedTeamId] = useState<string>('0')

  // Fetch teams on component mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/teams')
        const result: TeamsResponse = await response.json()
        setTeams(result.teams)
      } catch (err) {
        console.error('Error fetching teams:', err)
      }
    }
    fetchTeams()
  }, [])

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

  const updatePixel = async (x: number, y: number, teamId: number) => {
    try {
      const response = await fetch('http://localhost:3000/api/pixel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ x, y, teamId }),
      })

      if (!response.ok) {
        throw new Error('Failed to update pixel')
      }

      const result = await response.json()
      console.log('Pixel updated:', result)

      // Update local state immediately
      setColors((prevColors) =>
        prevColors.map((color) => {
          if (color.x === x && color.y === y) {
            return {
              ...color,
              teamId,
              Red: result.color.Red,
              Green: result.color.Green,
              Blue: result.color.Blue,
            }
          }
          return color
        })
      )
    } catch (err) {
      console.error('Error updating pixel:', err)
    }
  }

  const handlePixelClick = (color: ColorData) => {
    if (mode !== 'locally') {
      console.warn('Can only edit pixels in locally mode')
      return
    }

    const currentTeamId = color.teamId ?? 0
    const nextTeamId = (currentTeamId + 1) % 16
    updatePixel(color.x, color.y, nextTeamId)
  }

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (mode !== 'locally') {
      alert('Can only edit pixels in locally mode')
      return
    }

    const x = parseInt(inputX, 10)
    const y = parseInt(inputY, 10)
    const teamId = parseInt(selectedTeamId, 10)

    if (isNaN(x) || isNaN(y) || x < 0 || x > 15 || y < 0 || y > 15) {
      alert('Invalid coordinates. Please enter values between 0 and 15.')
      return
    }

    updatePixel(x, y, teamId)
    setInputX('')
    setInputY('')
  }

  const getTeamName = (teamId?: number) => {
    const id = teamId ?? 0
    return teams.find((t) => t.id === id)?.name || `Team ${id}`
  }

  return (
    <div className="container">
      <h1>Pixelboard Editor</h1>

      <div className="controls">
        <div className="mode-selector">
          <label htmlFor="api-mode">API Mode:</label>
          <select
            id="api-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as ApiMode)}
            disabled={loading}
          >
            <option value="online">Online (Read-only)</option>
            <option value="locally">Locally (Editable)</option>
          </select>
        </div>
        <button onClick={fetchColors} disabled={loading}>
          {loading ? 'Fetching...' : 'Fetch Colors'}
        </button>
      </div>

      {mode === 'locally' && (
        <form onSubmit={handleInputSubmit} className="pixel-input-form">
          <div className="form-group">
            <label htmlFor="input-x">X Coordinate (0-15):</label>
            <input
              id="input-x"
              type="number"
              min="0"
              max="15"
              value={inputX}
              onChange={(e) => setInputX(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="input-y">Y Coordinate (0-15):</label>
            <input
              id="input-y"
              type="number"
              min="0"
              max="15"
              value={inputY}
              onChange={(e) => setInputY(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="team-select">Team:</label>
            <select
              id="team-select"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="submit-btn">
            Color Pixel
          </button>
        </form>
      )}

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
              className={`color-cell ${mode === 'online' ? 'read-only' : 'editable'}`}
              style={{
                '--red': color.Red,
                '--green': color.Green,
                '--blue': color.Blue,
              } as React.CSSProperties}
              title={`[${color.x},${color.y}] ${getTeamName(color.teamId)} RGB(${color.Red}, ${color.Green}, ${color.Blue})`}
              onClick={() => handlePixelClick(color)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default App
