import { fetchMetadataAction } from 'crystara-sdk/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const metadataUrl = url.searchParams.get('url');
  
  if (!metadataUrl) {
    return new Response(JSON.stringify({ error: 'URL is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const data = await fetchMetadataAction(metadataUrl);
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch metadata' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}