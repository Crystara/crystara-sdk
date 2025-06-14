import { fetchLootboxStatsAction } from 'crystara-sdk/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lootboxUrl = url.searchParams.get('url');
  const viewer = url.searchParams.get('viewer') || undefined;
  
  if (!lootboxUrl) {
    return new Response(JSON.stringify({ error: 'URL is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const data = await fetchLootboxStatsAction(lootboxUrl, viewer);
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch lootbox stats' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}