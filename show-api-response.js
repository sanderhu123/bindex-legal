// Show exact API response for Leafeon EX 006
const TCGdex = require('@tcgdex/sdk').default;

async function showExactAPIResponse() {
  const tcgdex = new TCGdex('en');
  
  console.log('\n=== EXACT API CALL FOR LEAFEON EX 006 ===\n');
  
  try {
    // The SDK makes this API call internally:
    console.log('API Endpoint: https://api.tcgdex.net/v2/en/cards/sv08.5-006');
    console.log('');
    
    // Fetch the card
    const card = await tcgdex.card.get('sv08.5-006');
    
    console.log('=== RAW API RESPONSE (relevant fields) ===\n');
    console.log(JSON.stringify({
      id: card.id,
      localId: card.localId,
      name: card.name,
      category: card.category,
      variants: card.variants,
      set: {
        id: card.set?.id,
        name: card.set?.name
      }
    }, null, 2));
    
    console.log('\n=== VARIANTS OBJECT ONLY ===\n');
    console.log(JSON.stringify(card.variants, null, 2));
    
    console.log('\n=== WHAT THIS MEANS ===');
    console.log('variants.holo:', card.variants?.holo, '→', card.variants?.holo ? 'Card HAS holo variant' : 'Card does NOT have holo variant');
    console.log('variants.reverse:', card.variants?.reverse, '→', card.variants?.reverse ? 'Card HAS reverse variant' : 'Card does NOT have reverse variant');
    console.log('variants.normal:', card.variants?.normal, '→', card.variants?.normal ? 'Card HAS normal variant' : 'Card does NOT have normal variant');
    
  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

showExactAPIResponse();





