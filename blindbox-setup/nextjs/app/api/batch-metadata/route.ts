import { batchFetchMetadataAction } from 'crystara-sdk/server';

export async function POST(request: Request) {
  try {
    const { urls, bustCache } = await request.json();
    
    if (!urls || !Array.isArray(urls)) {
      return new Response(JSON.stringify({ error: 'URLs array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const data = await batchFetchMetadataAction(urls, bustCache);
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to batch fetch metadata' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
