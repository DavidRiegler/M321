import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';

const fastify = Fastify({ logger: true });

// Register CORS plugin
fastify.register(fastifyCors, {
  origin: true, // Allow all origins for development
});

// API URLs for different modes
const API_URLS = {
  online: 'https://edu.jakobmeier.ch/api/color',
  locally: 'http://localhost:5085/api/color',
};

interface ColorData {
  x: number;
  y: number;
  Red: number;
  Green: number;
  Blue: number;
}

interface ColorResponse {
  Red: number;
  Green: number;
  Blue: number;
}

interface ApiResponse {
  data: ColorData[];
  responseTime: number;
  totalRequests: number;
}

interface ColorRequest {
  Querystring: {
    mode?: 'online' | 'locally';
  };
}

interface Team {
  id: number;
  name: string;
  color: {
    Red: number;
    Green: number;
    Blue: number;
  };
}

// Local cache for pixel modifications (only for locally mode)
const localPixelCache = new Map<string, { teamId: number; Red: number; Green: number; Blue: number }>();

// Team definitions with RGB values
const TEAMS: Team[] = [
  { id: 0, name: 'Team 0', color: { Red: 255, Green: 0, Blue: 0 } },
  { id: 1, name: 'Team 1', color: { Red: 0, Green: 255, Blue: 0 } },
  { id: 2, name: 'Team 2', color: { Red: 0, Green: 0, Blue: 255 } },
  { id: 3, name: 'Team 3', color: { Red: 255, Green: 255, Blue: 0 } },
  { id: 4, name: 'Team 4', color: { Red: 255, Green: 0, Blue: 255 } },
  { id: 5, name: 'Team 5', color: { Red: 0, Green: 255, Blue: 255 } },
  { id: 6, name: 'Team 6', color: { Red: 128, Green: 0, Blue: 0 } },
  { id: 7, name: 'Team 7', color: { Red: 0, Green: 128, Blue: 0 } },
  { id: 8, name: 'Team 8', color: { Red: 0, Green: 0, Blue: 128 } },
  { id: 9, name: 'Team 9', color: { Red: 128, Green: 128, Blue: 0 } },
  { id: 10, name: 'Team 10', color: { Red: 128, Green: 0, Blue: 128 } },
  { id: 11, name: 'Team 11', color: { Red: 0, Green: 128, Blue: 128 } },
  { id: 12, name: 'Team 12', color: { Red: 192, Green: 192, Blue: 192 } },
  { id: 13, name: 'Team 13', color: { Red: 128, Green: 128, Blue: 128 } },
  { id: 14, name: 'Team 14', color: { Red: 255, Green: 128, Blue: 0 } },
  { id: 15, name: 'Team 15', color: { Red: 0, Green: 128, Blue: 255 } },
];

// Fetch all color data for coordinates 0-15
fastify.get<ColorRequest & { Reply: ApiResponse }>('/api/colors', async (request, reply) => {
  const startTime = performance.now();
  let requestCount = 0;

  // Get mode from query parameter, default to 'online'
  const mode = (request.query.mode as 'online' | 'locally') || 'online';
  const API_URL = API_URLS[mode];

  try {
    // Create array of all fetch promises
    const fetchPromises: Promise<ColorData | null>[] = [];
    
    for (let y = 0; y <= 15; y++) {
      for (let x = 0; x <= 15; x++) {
        const promise = (async () => {
          try {
            const response = await fetch(`${API_URL}/${y}/${x}`);
            const data: ColorResponse = await response.json();
            
            requestCount++;
            console.log(`Fetched [${y},${x}]: R=${data.Red}, G=${data.Green}, B=${data.Blue}`);
            
            return {
              x,
              y,
              ...data,
            };
          } catch (error) {
            console.error(`Error fetching color for [${y},${x}]:`, error);
            return null;
          }
        })();
        
        fetchPromises.push(promise);
      }
    }

    // Wait for all promises to resolve in parallel
    const results = await Promise.all(fetchPromises);
    
    // Filter out null values (failed requests)
    let colorData = results.filter((item): item is ColorData => item !== null);

    // For locally mode, apply cached modifications
    if (mode === 'locally') {
      colorData = colorData.map((color) => {
        const cacheKey = `${color.x},${color.y}`;
        const cachedData = localPixelCache.get(cacheKey);
        if (cachedData) {
          return {
            x: color.x,
            y: color.y,
            Red: cachedData.Red,
            Green: cachedData.Green,
            Blue: cachedData.Blue,
            teamId: cachedData.teamId,
          };
        }
        return color;
      });
    }

    const endTime = performance.now();
    const responseTime = endTime - startTime;

    console.log(`\nFetch completed in ${responseTime.toFixed(2)}ms`);
    console.log(`Total requests: ${requestCount}`);

    return {
      data: colorData,
      responseTime: Math.round(responseTime),
      totalRequests: requestCount,
    };
  } catch (error) {
    console.error('Error fetching colors:', error);
    throw error;
  }
});

// Endpoint to get all teams
fastify.get('/api/teams', async (request, reply) => {
  return { teams: TEAMS };
});

// Endpoint to update a pixel (locally mode only)
fastify.post<{
  Body: {
    x: number;
    y: number;
    teamId: number;
  };
}>('/api/pixel', async (request, reply) => {
  const { x, y, teamId } = request.body;

  // Validate coordinates and teamId
  if (x < 0 || x > 15 || y < 0 || y > 15 || teamId < 0 || teamId > 15) {
    return reply.status(400).send({ error: 'Invalid coordinates or teamId' });
  }

  // Validate teamId is within range
  const team = TEAMS.find((t) => t.id === teamId);
  if (!team) {
    return reply.status(400).send({ error: 'Invalid teamId' });
  }

  const cacheKey = `${x},${y}`;
  localPixelCache.set(cacheKey, {
    teamId,
    Red: team.color.Red,
    Green: team.color.Green,
    Blue: team.color.Blue,
  });

  console.log(`Updated pixel [${x},${y}] to team ${teamId}`);

  return {
    success: true,
    x,
    y,
    teamId,
    color: team.color,
  };
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

async function start() {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server running at http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();