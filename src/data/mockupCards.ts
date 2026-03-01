import type { Card } from '../types';

// Simple mock sets for testing
export type MockSet = {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  logo?: string;
  symbol?: string;
};

export const mockSets: MockSet[] = [
  {
    id: 'base1',
    name: 'Base Set',
    series: 'Base',
    releaseDate: '1999-01-09',
  },
  {
    id: 'jungle',
    name: 'Jungle',
    series: 'Base',
    releaseDate: '1999-06-16',
  },
  {
    id: 'sv1',
    name: 'Scarlet & Violet',
    series: 'Scarlet & Violet',
    releaseDate: '2023-03-31',
  },
];

// Mock cards from multiple sets, regions, rarities, and illustrators
export const mockCards: Card[] = [
  {
    id: 'base1-4',
    name: 'Charizard',
    number: '004/102',
    set: 'Base Set',
    rarity: 'Rare Holo',
    illustrator: 'Mitsuhiro Arita',
    imageUrl: 'https://images.pokemontcg.io/base1/4.png',
    pokedexNumber: 6, // Kanto
  },
  {
    id: 'base1-58',
    name: 'Pikachu',
    number: '058/102',
    set: 'Base Set',
    rarity: 'Common',
    illustrator: 'Ken Sugimori',
    imageUrl: 'https://images.pokemontcg.io/base1/58.png',
    pokedexNumber: 25, // Kanto
  },
  {
    id: 'jungle-1',
    name: 'Kangaskhan',
    number: '001/64',
    set: 'Jungle',
    rarity: 'Rare Holo',
    illustrator: 'Mitsuhiro Arita',
    imageUrl: 'https://images.pokemontcg.io/jungle/1.png',
    pokedexNumber: 115, // Kanto
  },
  {
    id: 'jungle-39',
    name: 'Eevee',
    number: '039/64',
    set: 'Jungle',
    rarity: 'Common',
    illustrator: 'Kagemaru Himeno',
    imageUrl: 'https://images.pokemontcg.io/jungle/39.png',
    pokedexNumber: 133, // Kanto
  },
  {
    id: 'neo1-10',
    name: 'Lugia',
    number: '009/111',
    set: 'Neo Genesis',
    rarity: 'Rare Holo',
    illustrator: 'Hironobu Yoshida',
    imageUrl: 'https://images.pokemontcg.io/neo1/9.png',
    pokedexNumber: 249, // Johto
  },
  {
    id: 'sv1-12',
    name: 'Gardevoir ex',
    number: '086/198',
    set: 'Scarlet & Violet',
    rarity: 'Double Rare',
    illustrator: '5ban Graphics',
    imageUrl: 'https://images.pokemontcg.io/sv1/86.png',
    pokedexNumber: 282, // Hoenn
  },
  {
    id: 'sv1-1',
    name: 'Pineco',
    number: '001/198',
    set: 'Scarlet & Violet',
    rarity: 'Common',
    illustrator: 'Souichirou Gunjima',
    imageUrl: 'https://images.pokemontcg.io/sv1/1.png',
    pokedexNumber: 204, // Johto
  },
  {
    id: 'sv1-13',
    name: 'Sprigatito',
    number: '013/198',
    set: 'Scarlet & Violet',
    rarity: 'Common',
    illustrator: 'Souichirou Gunjima',
    imageUrl: 'https://images.pokemontcg.io/sv1/13.png',
    pokedexNumber: 906, // Paldea
  },
  {
    id: 'sv1-15',
    name: 'Meowscarada',
    number: '015/198',
    set: 'Scarlet & Violet',
    rarity: 'Rare Holo',
    illustrator: 'Mitsuhiro Arita',
    imageUrl: 'https://images.pokemontcg.io/sv1/15.png',
    pokedexNumber: 908, // Paldea
  },
  // Variant cards for testing variant placement
  {
    id: 'base1-4-reverse-holo',
    name: 'Charizard',
    number: '004/102',
    set: 'Base Set',
    rarity: 'Rare Holo',
    illustrator: 'Mitsuhiro Arita',
    imageUrl: 'https://images.pokemontcg.io/base1/4.png',
    pokedexNumber: 6, // Kanto
    variant: 'reverse-holo',
  },
  {
    id: 'base1-58-reverse-holo',
    name: 'Pikachu',
    number: '058/102',
    set: 'Base Set',
    rarity: 'Common',
    illustrator: 'Ken Sugimori',
    imageUrl: 'https://images.pokemontcg.io/base1/58.png',
    pokedexNumber: 25, // Kanto
    variant: 'reverse-holo',
  },
  {
    id: 'base1-58-poke-ball',
    name: 'Pikachu',
    number: '058/102',
    set: 'Base Set',
    rarity: 'Common',
    illustrator: 'Ken Sugimori',
    imageUrl: 'https://images.pokemontcg.io/base1/58.png',
    pokedexNumber: 25, // Kanto
    variant: 'poke-ball',
  },
  {
    id: 'sv1-13-reverse-holo',
    name: 'Sprigatito',
    number: '013/198',
    set: 'Scarlet & Violet',
    rarity: 'Common',
    illustrator: 'Souichirou Gunjima',
    imageUrl: 'https://images.pokemontcg.io/sv1/13.png',
    pokedexNumber: 906, // Paldea
    variant: 'reverse-holo',
  },
  {
    id: 'sv1-13-master-ball',
    name: 'Sprigatito',
    number: '013/198',
    set: 'Scarlet & Violet',
    rarity: 'Common',
    illustrator: 'Souichirou Gunjima',
    imageUrl: 'https://images.pokemontcg.io/sv1/13.png',
    pokedexNumber: 906, // Paldea
    variant: 'master-ball',
  },
  
];


