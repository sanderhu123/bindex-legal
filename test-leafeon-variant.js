// Test script to check TCGDEX API data for Leafeon EX in Prismatic Evolutions
// Run with: node test-leafeon-variant.js

const TCGdex = require('@tcgdex/sdk').default;

async function checkLeafeonVariants() {
  const tcgdex = new TCGdex('en');
  
  console.log('\n=== Checking Prismatic Evolutions Leafeon EX 006 ===\n');
  
  try {
    // Fetch the card
    // Prismatic Evolutions set ID in TCGDEX is likely "sv08.5" or "sv8.5"
    // Card number is 006
    
    // First, let's find the exact card ID
    console.log('1. Fetching Prismatic Evolutions set...');
    const set = await tcgdex.set.get('sv08.5'); // Correct ID is sv08.5
    
    console.log('Set found:', set.name);
    console.log('Set ID:', set.id);
    console.log('Total cards:', set.cardCount?.total || set.cards?.length);
    
    // Find Leafeon EX (card 006)
    const leafeonCard = set.cards?.find(c => c.localId === '006');
    
    if (leafeonCard) {
      console.log('\n2. Found Leafeon card (minimal data):');
      console.log('   ID:', leafeonCard.id);
      console.log('   Name:', leafeonCard.name);
      console.log('   LocalID:', leafeonCard.localId);
      
      // Now fetch FULL card details
      console.log('\n3. Fetching FULL card details...');
      const fullCard = await tcgdex.card.get(leafeonCard.id);
      
      console.log('\n=== FULL CARD DATA ===');
      console.log('Name:', fullCard.name);
      console.log('ID:', fullCard.id);
      console.log('LocalID:', fullCard.localId);
      console.log('Category (Supertype):', fullCard.category);
      console.log('Set ID:', fullCard.set?.id);
      
      console.log('\n=== VARIANTS DATA ===');
      console.log('Full variants object:', JSON.stringify(fullCard.variants, null, 2));
      console.log('\nSpecific checks:');
      console.log('  - variants.normal:', fullCard.variants?.normal);
      console.log('  - variants.holo:', fullCard.variants?.holo);
      console.log('  - variants.reverse:', fullCard.variants?.reverse);
      console.log('  - variants.firstEdition:', fullCard.variants?.firstEdition);
      
      console.log('\n=== WHAT OUR CODE WOULD DO ===');
      const hasHolo = fullCard.variants?.holo === true;
      const hasReverse = fullCard.variants?.reverse === true;
      const supertype = fullCard.category || '';
      
      console.log('hasHolo:', hasHolo);
      console.log('hasReverse:', hasReverse);
      console.log('supertype:', supertype);
      
      console.log('\nVariants our code would generate:');
      const generatedVariants = ['base'];
      if (hasHolo) generatedVariants.push('holo');
      if (hasReverse) {
        generatedVariants.push('reverse-holo');
        generatedVariants.push('poke-ball'); // Since it's in sv8.5 (special set)
        if (supertype === 'Pokémon' || supertype === 'Pokemon') {
          generatedVariants.push('master-ball');
        }
      }
      
      console.log('  ->', generatedVariants.join(', '));
      
    } else {
      console.log('ERROR: Could not find card 006 in the set');
    }
    
  } catch (error) {
    console.error('ERROR:', error.message);
    
    // Try alternative set ID
    if (error.message.includes('sv8.5')) {
      console.log('\nTrying alternative set ID: sv08.5');
      try {
        const set = await tcgdex.set.get('sv08.5');
        console.log('Set found with ID sv08.5:', set.name);
        // Repeat the process...
      } catch (e) {
        console.error('Also failed with sv08.5:', e.message);
      }
    }
  }
}

checkLeafeonVariants();

