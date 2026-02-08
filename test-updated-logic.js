// Test the updated logic with Leafeon EX 006
const TCGdex = require('@tcgdex/sdk').default;

async function testUpdatedLogic() {
  const tcgdex = new TCGdex('en');
  
  console.log('\n=== TESTING UPDATED VARIANT LOGIC ===\n');
  
  try {
    const card = await tcgdex.card.get('sv08.5-006');
    
    console.log('Card:', card.name);
    console.log('Rarity:', card.rarity);
    console.log('Category/Supertype:', card.category);
    console.log('API variants.reverse:', card.variants?.reverse);
    console.log('API variants.holo:', card.variants?.holo);
    
    // Simulate our logic
    const rarity = card.rarity || '';
    const hasReverse = card.variants?.reverse === true;
    const hasHolo = card.variants?.holo === true;
    const supertype = card.category || '';
    const setId = 'sv08.5';
    
    const allowsReverseHolo = (
      rarity === 'Common' || 
      rarity === 'Uncommon' || 
      rarity === 'Rare' ||
      rarity === 'Rare Holo'
    );
    
    console.log('\n=== OUR LOGIC CHECKS ===');
    console.log('allowsReverseHolo (is Common/Uncommon/Rare):', allowsReverseHolo);
    console.log('hasReverse (API says reverse: true):', hasReverse);
    console.log('hasHolo (API says holo: true):', hasHolo);
    
    console.log('\n=== VARIANTS WE WILL GENERATE ===');
    const variants = ['base'];
    
    if (hasHolo) {
      variants.push('holo');
      console.log('✓ Holo (because hasHolo === true)');
    }
    
    if (hasReverse && allowsReverseHolo) {
      variants.push('reverse-holo');
      console.log('✓ Reverse Holo (because hasReverse && allowsReverseHolo)');
    } else if (hasReverse && !allowsReverseHolo) {
      console.log('✗ Reverse Holo SKIPPED (rarity is not Common/Uncommon/Rare)');
    }
    
    // Special sets
    if (hasReverse && allowsReverseHolo) {
      variants.push('poke-ball');
      console.log('✓ Pokeball Holo (because hasReverse && allowsReverseHolo && special set)');
      
      if (supertype === 'Pokemon' || supertype === 'Pokémon') {
        variants.push('master-ball');
        console.log('✓ Masterball Holo (because hasReverse && allowsReverseHolo && Pokemon && special set)');
      }
    } else if (hasReverse && !allowsReverseHolo) {
      console.log('✗ Pokeball Holo SKIPPED (rarity is not Common/Uncommon/Rare)');
      console.log('✗ Masterball Holo SKIPPED (rarity is not Common/Uncommon/Rare)');
    }
    
    console.log('\n=== FINAL RESULT ===');
    console.log('Variants:', variants.join(', '));
    console.log('\n✅ EXPECTED: base only');
    console.log(variants.length === 1 && variants[0] === 'base' ? '✅ CORRECT!' : '❌ WRONG!');
    
  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

testUpdatedLogic();





