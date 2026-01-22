import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';

const fastify = Fastify({ logger: true });

// Register CORS plugin
fastify.register(fastifyCors, {
  origin: true, // Allow all origins for development
});

const API_URL = 'https://edu.jakobmeier.ch/api/color';

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

// Fetch all color data for coordinates 0-15
fastify.get<{ Reply: ApiResponse }>('/api/colors', async (request, reply) => {
  const startTime = performance.now();
  let requestCount = 0;

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
    const colorData = results.filter((item): item is ColorData => item !== null);

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