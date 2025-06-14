import { fetchLootboxInfoAction } from 'crystara-sdk/server';

export async function POST(request: Request) {
  try {
    const { lootboxCreatorAddress, collectionName, viewerAddress } = await request.json();
    
    if (!lootboxCreatorAddress || !collectionName) {
      return new Response(JSON.stringify({ error: 'lootboxCreatorAddress and collectionName are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const data = await fetchLootboxInfoAction(lootboxCreatorAddress, collectionName, viewerAddress);
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch lootbox info' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
