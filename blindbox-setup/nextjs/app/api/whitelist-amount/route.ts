import { fetchWhitelistAmountAction } from 'crystara-sdk/server';

export async function POST(request: Request) {
  try {
    const { lootboxCreatorAddress, collectionName, currentAddress } = await request.json();
    
    if (!lootboxCreatorAddress || !collectionName || !currentAddress) {
      return new Response(JSON.stringify({ error: 'lootboxCreatorAddress, collectionName, and currentAddress are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const data = await fetchWhitelistAmountAction(lootboxCreatorAddress, collectionName, currentAddress);
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch whitelist amount' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
