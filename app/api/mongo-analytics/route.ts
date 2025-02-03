export async function POST(request: Request) {
    const { query } = await request.json()
    
    try {
      const flaskResponse = await fetch('http://localhost:5000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })
  
      const data = await flaskResponse.json()
      return new Response(JSON.stringify(data), {
        status: flaskResponse.status,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to connect to analytics service' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }
  }