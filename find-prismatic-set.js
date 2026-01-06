// Test script to find Prismatic Evolutions set ID
const TCGdex = require('@tcgdex/sdk').default;

async function findPrismaticEvolutions() {
  const tcgdex = new TCGdex('en');
  
  console.log('\n=== Finding Prismatic Evolutions Set ID ===\n');
  
  try {
    // Get all sets
    const allSets = await tcgdex.set.list();
    
    // Search for Prismatic Evolutions
    const prismatic = allSets.filter(s => 
      s.name && s.name.toLowerCase().includes('prismatic')
    );
    
    console.log('Sets matching "prismatic":');
    prismatic.forEach(s => {
      console.log(`  - ID: ${s.id}, Name: ${s.name}`);
    });
    
    // Also check recent Scarlet & Violet sets
    const svSets = allSets.filter(s => 
      s.id && s.id.startsWith('sv')
    ).slice(-10); // Last 10 SV sets
    
    console.log('\n\nRecent Scarlet & Violet sets:');
    svSets.forEach(s => {
      console.log(`  - ID: ${s.id}, Name: ${s.name}`);
    });
    
  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

findPrismaticEvolutions();



