import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Sparkles, Home, TreeDeciduous, MapPin, Settings, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

// --- Types ---
type GameState = 'EXPLORE' | 'DIALOGUE' | 'POKEMON_CHOICE' | 'BATTLE_CHOICE' | 'FINAL_BATTLE_CHOICE' | 'FINISHED' | 'BATTLE' | 'LEVEL_EDITOR' | 'CREDITS';

interface Dialogue {
  speaker: string;
  text: string;
  grammarFocus?: string;
}

interface BattleMessage {
  role: 'user' | 'model';
  text: string;
}

// --- Constants ---
const TILE_SIZE = 64;
const GRID_SIZE = 15; // 15x15 map
const SCALE = 2;

const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI1,
  process.env.GEMINI2,
  process.env.GEMINI3,
  process.env.GEMINI4,
  process.env.GEMINI5,
  process.env.GEMINI6,
  process.env.GEMINI7,
  process.env.GEMINI8,
  process.env.GEMINI9,
  process.env.GEMINI10,
].filter(Boolean) as string[];

const SPRITES = {
  player: "./red.png",
  friend: "./friend.png",
  // Choice icons
  eevee: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png",
  jigglypuff: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/39.png",
  caterpie: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10.png",
  // Battle sprites (PNG)
  eevee_back: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/133.png",
  jigglypuff_back: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/39.png",
  caterpie_back: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10.png",
  bulbasaur: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png",
  bulbasaur_back: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/1.png",
  charmander: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png",
  charmander_back: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/4.png",
  squirtle: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png",
  squirtle_back: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/7.png",
  arbusto: "./arbusto.png",
  arvore: "./arvore.png",
  ginasio: "./ginasio.png",
  grama1: "./grama1.png",
  grama2: "./grama2.png",
  grama3: "./grama3.png",
  grama4: "./grama4.png",
  lab: "./lab.png",
  labpereira: "./labpereira.png",
  interiorpereira: "./interiorpereira.png",
  pereira: "./pereira.png",
  pedra: "./pedra.png",
  pokecenter: "./pokecenter.png",
  pokemart: "./pokemart.png",
  casa: "./casa.png",
  battle_bg: "./battle.png",
  // New Tiles
  caminhotopo: "./caminhotopo.png",
  caminhoesquerdo: "./caminhoesquerdo.png",
  caminhodireito: "./caminhodireito.png",
  caminhodiagonalsuperioresquerda: "./caminhodiagonalsuperioresquerda.png",
  caminhodiagonalsuperiordireita: "./caminhodiagonalsuperiordireita.png",
  caminhodiagonalinferioresquerdo: "./caminhodiagonalinferioresquerdo.png",
  caminhodiagonalinferiordireito: "./caminhodiagonalinferiordireito.png",
  caminhocentro2: "./caminhocentro2.png",
  caminhocentro: "./caminhocentro.png",
  caminhobaixo: "./caminhobaixo.png",
  placa: "./placa.png",
  pokebola: "./pokebola.png",
  arbustocortar: "./arbustocortar.png",
  chaocidadepedra: "./chaocidadepedra.png",
  agua1: "./agua1.png",
  agua2: "./agua2.png",
  agua3: "./agua3.png",
  agua4: "./agua4.png",
  missingno: "./missingno.png",
  missingno_back: "./missingno.png",
};

const POKEMON_DATA = {
  Eevee: { hp: 20, moves: ['Tackle', 'Tail Whip'] },
  Jigglypuff: { hp: 25, moves: ['Pound', 'Sing'] },
  Caterpie: { hp: 15, moves: ['Tackle', 'String Shot'] },
  Bulbasaur: { hp: 25, moves: ['Tackle', 'Vine Whip'] },
  Charmander: { hp: 20, moves: ['Scratch', 'Ember'] },
  Squirtle: { hp: 22, moves: ['Tackle', 'Water Gun'] },
  Missingno: { hp: 999, moves: ['Water Gun', 'Sky Attack', 'Pay Day', 'Fly'] },
  Treinador: { hp: 50, moves: ['Hyper Beam', 'Psychic'] },
  GYM_LEADER: { hp: 100, moves: ['Thunderbolt', 'Flamethrower', 'Razor Leaf'], sprite: "./friend.png" }
};

interface PokemonDetails {
  hp: number;
  moves: string[];
  sprite: string;
  backSprite: string;
}

export const pokemonCache: Record<string, PokemonDetails> = {};

export const getPokemonData = async (name: string): Promise<PokemonDetails> => {
  const lowerName = name.toLowerCase();
  if (pokemonCache[lowerName]) return pokemonCache[lowerName];
  
  if (lowerName === 'treinador') {
    const details = {
      hp: POKEMON_DATA.Treinador.hp,
      moves: POKEMON_DATA.Treinador.moves,
      sprite: SPRITES.friend,
      backSprite: SPRITES.friend
    };
    pokemonCache[lowerName] = details;
    return details;
  }

  if (lowerName === 'missingno') {
    const details = {
      hp: POKEMON_DATA.Missingno.hp,
      moves: POKEMON_DATA.Missingno.moves,
      sprite: SPRITES.missingno,
      backSprite: SPRITES.missingno_back
    };
    pokemonCache[lowerName] = details;
    return details;
  }

  if (lowerName === 'gym_leader') {
    const details = {
      hp: POKEMON_DATA.GYM_LEADER.hp,
      moves: POKEMON_DATA.GYM_LEADER.moves,
      sprite: SPRITES.friend,
      backSprite: SPRITES.friend
    };
    pokemonCache[lowerName] = details;
    return details;
  }

  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${lowerName}`);
    if (!res.ok) throw new Error('Not found');
    const data = await res.json();
    
    const hpStat = data.stats.find((s: any) => s.stat.name === 'hp');
    const hp = hpStat ? hpStat.base_stat : 20;
    
    // Filter for starting moves (learned by level-up at level <= 5)
    let validMoves = data.moves.filter((m: any) => 
      m.version_group_details.some((v: any) => 
        v.move_learn_method.name === 'level-up' && v.level_learned_at <= 5
      )
    ).map((m: any) => m.move.name.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));

    // Fallback if no early moves found
    if (validMoves.length === 0) {
      validMoves = data.moves.slice(0, 4).map((m: any) => m.move.name.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
    }
    
    const moves = validMoves.slice(0, 4);
    
    const details = {
      hp,
      moves: moves.length > 0 ? moves : ['Tackle'],
      sprite: data.sprites.front_default || SPRITES.eevee,
      backSprite: data.sprites.back_default || SPRITES.eevee_back
    };
    pokemonCache[lowerName] = details;
    return details;
  } catch (e) {
    console.error("Failed to fetch pokemon", name, e);
    const fallback = POKEMON_DATA[name as keyof typeof POKEMON_DATA] || POKEMON_DATA.Eevee;
    return {
      hp: fallback.hp,
      moves: fallback.moves,
      sprite: SPRITES[lowerName as keyof typeof SPRITES] || SPRITES.eevee,
      backSprite: SPRITES[`${lowerName}_back` as keyof typeof SPRITES] || SPRITES.eevee_back
    };
  }
};

const LAB_COLLISIONS = [
  { x: 0, y: 12, width: 412, height: 61, label: "Box 1" },
  { x: 31, y: 101, width: 70, height: 80, label: "Box 2" },
  { x: 0, y: 83, width: 29, height: 65, label: "Box 3" },
  { x: 256, y: 121, width: 97, height: 53, label: "Box 4" },
  { x: 255, y: 230, width: 158, height: 64, label: "Box 5" },
  { x: 0, y: 231, width: 159, height: 63, label: "Box 6" },
  // NPC Collisions
  { x: 186, y: 85, width: 40, height: 35, label: "Pereira" },
  { x: 100, y: 115, width: 40, height: 35, label: "Leo" }
];

export interface MapTileData {
  type: number;
  rotation: number;
  hasBattle: boolean;
  text?: string;
  pokemonName?: string;
}

// 0: Grass, 1: Tree (Wall), 2: House (Wall), 3: Tall Grass
const INITIAL_MAP_DATA: MapTileData[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 18, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1],
].map(row => row.map(type => ({ type, rotation: 0, hasBattle: false })));

const LEVEL_2_MAP_DATA: MapTileData[][] = [
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1], // Entrada (Topo)
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1], // Afunilamento inicial
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 0, 3, 3, 3, 3, 3, 3, 3, 0, 1, 0, 1], // Primeiro campo de grama
  [1, 0, 1, 0, 3, 1, 1, 3, 1, 1, 3, 0, 1, 0, 1], // Árvores no meio da grama
  [1, 0, 0, 0, 3, 1, 0, 0, 0, 1, 3, 0, 0, 0, 1], // Caminho central
  [1, 1, 1, 0, 3, 1, 0, 1, 0, 1, 3, 0, 1, 1, 1], // Ponto de decisão
  [1, 0, 0, 0, 3, 3, 3, 1, 3, 3, 3, 0, 0, 0, 1], // Segundo campo de grama
  [1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 1], // Placa de saída
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1], // Saída (Base)
].map(row => row.map(type => ({ type, rotation: 0, hasBattle: false })));

const LEVEL_3_MAP_DATA: MapTileData[][] = [
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1], // Entrada (Topo)
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 1],
  [1, 0, 1, 3, 1, 1, 1, 3, 1, 1, 1, 3, 1, 0, 1],
  [1, 0, 1, 3, 1, 0, 0, 0, 0, 0, 1, 3, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 3, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0, 1],
  [1, 0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 1],
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1], // Saída (Base)
].map(row => row.map(type => ({ type, rotation: 0, hasBattle: false })));

const LEVEL_4_MAP_DATA: MapTileData[][] = [
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1], // Entrada (Topo)
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1], // Floresta densa final
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 0, 3, 3, 3, 3, 3, 3, 3, 0, 1, 0, 1],
  [1, 0, 1, 0, 3, 1, 1, 3, 1, 1, 3, 0, 1, 0, 1],
  [1, 0, 0, 0, 3, 1, 0, 0, 0, 1, 3, 0, 0, 0, 1],
  [1, 1, 1, 0, 3, 1, 0, 1, 0, 1, 3, 0, 1, 1, 1],
  [1, 0, 0, 0, 3, 3, 3, 1, 3, 3, 3, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1], // Saída (Base)
].map(row => row.map(type => ({ type, rotation: 0, hasBattle: false })));

const LEVEL_5_MAP_DATA: MapTileData[][] = [
  [1, 1, 1, 1, 1, 1, 1, 9, 1, 1, 1, 1, 1, 1, 1], // Entrance from forest
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 10, 5, 5, 5, 5, 5, 5, 5, 10, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 10, 5, 5, 5, 5, 5, 5, 5, 10, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 10, 5, 5, 5, 5, 5, 5, 5, 10, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 13, 5, 5, 5, 5, 5, 5, 5, 14, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
].map(row => row.map(type => ({ type, rotation: 0, hasBattle: false })));

// Adicionando o treinador na frente do ginásio (x: 6, y: 21)
LEVEL_5_MAP_DATA[21][6] = { type: 17, rotation: 0, hasBattle: true, pokemonName: 'Treinador' };
// Ginásio rotacionado 180 graus (x: 6, y: 22)
LEVEL_5_MAP_DATA[22][6] = { type: 11, rotation: 180, hasBattle: false };

const Tile = React.memo(({ data, x, y, mapData }: { data: MapTileData, x: number, y: number, mapData?: MapTileData[][] }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (data.type === 4) {
      const interval = setInterval(() => {
        setFrame(f => (f + 1) % 4);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [data.type]);

  const grassTypes = [SPRITES.grama1, SPRITES.grama2, SPRITES.grama3, SPRITES.grama4];
  const grassIndex = (x * 3 + y * 7) % 4;
  const baseGrass = grassTypes[grassIndex];

  let bgImage = '';
  
  if (data.type === 1) { 
    bgImage = SPRITES.arvore;
  } else if (data.type === 2) {
    bgImage = SPRITES.pedra;
  } else if (data.type === 3) { 
    bgImage = SPRITES.arbustocortar;
  } else if (data.type === 4) {
    const waterFrames = [SPRITES.agua1, SPRITES.agua2, SPRITES.agua3, SPRITES.agua4];
    bgImage = waterFrames[frame];
  } else if (data.type === 5) {
    bgImage = SPRITES.chaocidadepedra;
  } else if (data.type === 7) {
    bgImage = SPRITES.placa;
  } else if (data.type === 8) {
    bgImage = SPRITES.pokebola;
  } else if (data.type === 9) {
    const pathTypes = [SPRITES.caminhocentro, SPRITES.caminhocentro2];
    const index = (x * 2 + y * 5) % 2;
    bgImage = pathTypes[index];
  } else if (data.type === 10) {
    bgImage = SPRITES.casa;
  } else if (data.type === 11) {
    bgImage = SPRITES.ginasio;
  } else if (data.type === 12) {
    bgImage = SPRITES.lab;
  } else if (data.type === 13) {
    bgImage = SPRITES.pokecenter;
  } else if (data.type === 14) {
    bgImage = SPRITES.pokemart;
  } else if (data.type === 15) {
    bgImage = SPRITES.arbustocortar;
  } else if (data.type === 16) {
    bgImage = '';
  } else if (data.type === 17) {
    bgImage = data.pokemonName === 'Treinador' ? SPRITES.friend : SPRITES.pokebola;
  } else if (data.type === 18) {
    bgImage = SPRITES.labpereira;
  }

  const pathOverlays: string[] = [];
  if (data.type === 0 && mapData) {
    const hasPathTop = y > 0 && mapData[y-1][x].type === 9;
    const hasPathBottom = y < mapData.length - 1 && mapData[y+1][x].type === 9;
    const hasPathLeft = x > 0 && mapData[y][x-1].type === 9;
    const hasPathRight = x < mapData[0].length - 1 && mapData[y][x+1].type === 9;
    const hasPathTopLeft = y > 0 && x > 0 && mapData[y-1][x-1].type === 9;
    const hasPathTopRight = y > 0 && x < mapData[0].length - 1 && mapData[y-1][x+1].type === 9;
    const hasPathBottomLeft = y < mapData.length - 1 && x > 0 && mapData[y+1][x-1].type === 9;
    const hasPathBottomRight = y < mapData.length - 1 && x < mapData[0].length - 1 && mapData[y+1][x+1].type === 9;

    if (hasPathBottom) pathOverlays.push(SPRITES.caminhotopo);
    if (hasPathTop) pathOverlays.push(SPRITES.caminhobaixo);
    if (hasPathRight) pathOverlays.push(SPRITES.caminhoesquerdo);
    if (hasPathLeft) pathOverlays.push(SPRITES.caminhodireito);
    
    if (hasPathBottomRight && !hasPathBottom && !hasPathRight) pathOverlays.push(SPRITES.caminhodiagonalsuperioresquerda);
    if (hasPathBottomLeft && !hasPathBottom && !hasPathLeft) pathOverlays.push(SPRITES.caminhodiagonalsuperiordireita);
    if (hasPathTopRight && !hasPathTop && !hasPathRight) pathOverlays.push(SPRITES.caminhodiagonalinferioresquerdo);
    if (hasPathTopLeft && !hasPathTop && !hasPathLeft) pathOverlays.push(SPRITES.caminhodiagonalinferiordireito);
  }

  const isTall = [1, 2, 7, 10, 11, 12, 13, 14, 15, 18].includes(data.type);
  const zIndex = isTall ? y : 0;

  return (
    <div className={`w-full h-full relative ${data.type === 16 ? '' : 'bg-[#8bac0f]'}`} style={{ zIndex }}>
      {/* Base Grass Layer for all tiles except Grass itself (to avoid double rendering) */}
      {data.type !== 0 && (
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `url(${baseGrass})`,
            backgroundSize: 'cover',
            imageRendering: 'pixelated',
            backgroundRepeat: 'no-repeat'
          }}
        />
      )}

      {/* Main Tile Image with Rotation */}
      {bgImage && (
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            imageRendering: 'pixelated',
            backgroundRepeat: 'no-repeat',
            transform: data.rotation ? `rotate(${data.rotation}deg)` : 'none'
          }}
        />
      )}

      {/* Grass Tile: Base + Path Overlays */}
      {data.type === 0 && (
        <>
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: `url(${baseGrass})`,
              backgroundSize: 'cover',
              imageRendering: 'pixelated',
              backgroundRepeat: 'no-repeat'
            }}
          />
          {pathOverlays.map((overlay, i) => (
            <div 
              key={`overlay-${i}`}
              className="absolute inset-0" 
              style={{
                backgroundImage: `url(${overlay})`,
                backgroundSize: 'cover',
                imageRendering: 'pixelated',
                backgroundRepeat: 'no-repeat'
              }}
            />
          ))}
        </>
      )}

      {/* Main Tile Image */}
      {bgImage && (
        <div 
          className={`absolute ${
            data.type === 1 ? 'bottom-0 w-full h-[200%]' : 
            (data.type >= 10 && data.type <= 14) ? 'bottom-0 left-0 w-[500%] h-[500%]' : 
            data.type === 18 ? 'bottom-0 left-0 w-[600%] h-[400%]' :
            'inset-0'
          }`} 
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: '100% 100%',
            imageRendering: 'pixelated',
            backgroundRepeat: 'no-repeat',
            transform: `rotate(${data.rotation || 0}deg)`
          }}
        />
      )}
      {data.hasBattle && (
        <div className="absolute inset-0 bg-red-500/30 animate-pulse" />
      )}
    </div>
  );
});

const PixelText = ({ children, className = "", style }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) => (
  <span className={`font-pokemon uppercase tracking-tighter ${className}`} style={{ fontSize: '14px', ...style }}>
    {children}
  </span>
);

const PlayerSprite = ({ 
  sprite = SPRITES.player, 
  facing, 
  isMoving, 
  scale = 1 
}: { 
  sprite?: string, 
  facing: 'down' | 'up' | 'left' | 'right', 
  isMoving: boolean, 
  scale?: number 
}) => {
  const [frame, setFrame] = useState(1); // 0, 1, 2
  
  useEffect(() => {
    if (!isMoving) {
      setFrame(1);
      return;
    }
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % 3);
    }, 120);
    return () => clearInterval(interval);
  }, [isMoving]);

  const isPereira = sprite === SPRITES.pereira || sprite.includes('pereira');
  
  const getBackgroundPosition = () => {
    if (isPereira) {
      const offsets = { down: 0, up: 3, left: 6, right: 9 };
      const startFrame = offsets[facing] || 0;
      const currentFrame = startFrame + frame;
      // 12 frames total in a single row
      return `${(currentFrame / 11) * 100}% 0%`;
    } else {
      const rows = { down: 0, up: 1, left: 2, right: 3 };
      const row = rows[facing] || 0;
      return `${(frame / 2) * 100}% ${(row / 3) * 100}%`;
    }
  };

  // Human characters are taller than they are wide
  // Red/Friend are 3x4 grids, Pereira is 12x1
  // Red looks squashed at 72, so we use 96 (1:2 ratio)
  // Pereira looks fine at 72 (2:3 ratio)
  const width = 48 * scale;
  const height = (isPereira ? 72 : 96) * scale;

  return (
    <div 
      className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center justify-center"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 20,
        pointerEvents: 'none'
      }}
    >
      <div 
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: `url(${sprite})`,
          backgroundPosition: getBackgroundPosition(),
          backgroundSize: isPereira ? '1200% 100%' : '300% 400%',
          imageRendering: 'pixelated',
          backgroundRepeat: 'no-repeat',
        }}
      />
    </div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('EXPLORE');
  const [mapData, setMapData] = useState<MapTileData[][]>(INITIAL_MAP_DATA);
  const [playerPos, setPlayerPos] = useState({ x: 5, y: 7 });
  const [playerPixelPos, setPlayerPixelPos] = useState({ x: 206, y: 360 }); // For Level 1 (Centered at entrance)
  const [facing, setFacing] = useState<'down' | 'up' | 'left' | 'right'>('down');
  const [isMoving, setIsMoving] = useState(false);
  const [dialogueQueue, setDialogueQueue] = useState<Dialogue[]>([]);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [storyStep, setStoryStep] = useState(0);
  const [selectedPokemon, setSelectedPokemon] = useState<string | null>(null);
  const [ownedPokemon, setOwnedPokemon] = useState<string[]>([]);
  const [friendPos, setFriendPos] = useState({ x: 8, y: 11 });
  const [friendFacing, setFriendFacing] = useState<'down' | 'up' | 'left' | 'right'>('down');
  const [isFriendMoving, setIsFriendMoving] = useState(false);
  const [isFriendVisible, setIsFriendVisible] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [battleLog, setBattleLog] = useState<BattleMessage[]>([]);
  const [battleInput, setBattleInput] = useState('');
  const [isBattleLoading, setIsBattleLoading] = useState(false);
  const [isStartingBattle, setIsStartingBattle] = useState(false);
  const [playerHP, setPlayerHP] = useState(20);
  const [maxPlayerHP, setMaxPlayerHP] = useState(20);
  const [opponentHP, setOpponentHP] = useState(20);
  const [inventory, setInventory] = useState({ potion: 1, pokeball: 5 });
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [playerAnim, setPlayerAnim] = useState<'idle' | 'attack' | 'hit'>('idle');
  const [opponentAnim, setOpponentAnim] = useState<'idle' | 'attack' | 'hit'>('idle');
  const [currentOpponent, setCurrentOpponent] = useState('Charmander');
  const [currentOpponentSprite, setCurrentOpponentSprite] = useState(SPRITES.charmander);
  const [currentOpponentAbilities, setCurrentOpponentAbilities] = useState('Tackle, Scratch');
  const [isOpponentTurn, setIsOpponentTurn] = useState(false);
  const [pendingOpponent, setPendingOpponent] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [isFinalBattle, setIsFinalBattle] = useState(false);
  const [apiKeyIndex, setApiKeyIndex] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showCollisions, setShowCollisions] = useState(false);
  const [editorBrush, setEditorBrush] = useState<MapTileData>({ type: 0, rotation: 0, hasBattle: false });
  const [isPainting, setIsPainting] = useState(false);
  const [pokemonList, setPokemonList] = useState<{name: string, url: string}[]>([]);
  const [pokemonSearch, setPokemonSearch] = useState('');
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('customApiKey') || '');
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const chatRef = useRef<any>(null);

  const activeApiKeys = customApiKey ? [customApiKey, ...API_KEYS] : API_KEYS;

  useEffect(() => {
    if (activeApiKeys.length === 0) {
      setShowApiKeyPrompt(true);
    }
  }, [activeApiKeys.length]);

  useEffect(() => {
    if (gameState === 'FINISHED') {
      const timer = setTimeout(() => {
        setGameState('CREDITS');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const [playerPkmnDetails, setPlayerPkmnDetails] = useState<PokemonDetails | null>(null);
  const [opponentPkmnDetails, setOpponentPkmnDetails] = useState<PokemonDetails | null>(null);
  const [starterPokemon, setStarterPokemon] = useState<{name: string, sprite: string, desc: string}[]>([
    { name: 'Eevee', sprite: SPRITES.eevee, desc: 'Versatile' },
    { name: 'Jigglypuff', sprite: SPRITES.jigglypuff, desc: 'Sweet' },
    { name: 'Caterpie', sprite: SPRITES.caterpie, desc: 'Brave' }
  ]);

  useEffect(() => {
    fetch('https://pokeapi.co/api/v2/pokemon?limit=1000')
      .then(res => res.json())
      .then(data => setPokemonList(data.results))
      .catch(err => console.error("Failed to fetch pokemon list", err));

    // Pre-fetch starters
    const fetchStarters = async () => {
      const starters = [
        { name: 'Eevee', desc: 'Versatile' },
        { name: 'Jigglypuff', desc: 'Sweet' },
        { name: 'Caterpie', desc: 'Brave' }
      ];
      const updated = await Promise.all(starters.map(async s => {
        const data = await getPokemonData(s.name);
        return { ...s, sprite: data.sprite };
      }));
      setStarterPokemon(updated);
    };
    fetchStarters();
  }, []);

  const playerVariants = {
    idle: { y: [0, -5, 0], transition: { repeat: Infinity, duration: 2 } },
    attack: { x: [0, 20, -10, 0], transition: { duration: 0.4 } },
    hit: { opacity: [1, 0, 1, 0, 1], filter: ['brightness(1)', 'brightness(2) sepia(1) hue-rotate(-50deg) saturate(5)', 'brightness(1)'], transition: { duration: 0.5 } }
  };

  const opponentVariants = {
    idle: { y: [0, 5, 0], transition: { repeat: Infinity, duration: 2 } },
    attack: { x: [0, -20, 10, 0], transition: { duration: 0.4 } },
    hit: { opacity: [1, 0, 1, 0, 1], filter: ['brightness(1)', 'brightness(2) sepia(1) hue-rotate(-50deg) saturate(5)', 'brightness(1)'], transition: { duration: 0.5 } }
  };

  // --- Responsiveness ---
  useEffect(() => {
    const handleResize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const moveTimeoutRef = useRef<any>(null);

  // --- Level 1 Movement (Pixel Based) ---
  const movePlayerPixel = useCallback((dx: number, dy: number, dir: 'down' | 'up' | 'left' | 'right') => {
    if (gameState !== 'EXPLORE') return;
    setFacing(dir);
    setIsMoving(true);
    
    const speed = 32; // Increased speed to feel like Level 0
    const newX = playerPixelPos.x + dx * speed;
    const newY = playerPixelPos.y + dy * speed;

    // Exit Check (Before Boundary Check)
    if (newY > 380 && (newX > 180 && newX < 240)) {
      if (!selectedPokemon) {
        setSelectedPokemon('Missingno');
        setOwnedPokemon(['Missingno']);
        setDialogueQueue([
          { role: 'model', text: "Wait! You didn't pick a Pokémon!" },
          { role: 'model', text: "A wild MISSINGNO. appeared in your pocket!" }
        ]);
        setGameState('DIALOGUE');
        setDialogueIndex(0);
      }
      setCurrentLevel(0);
      setPlayerPos({ x: 11, y: 12 });
      setStoryStep(6);
      setIsMoving(false);
      return;
    }

    // Boundary Check
    if (newX < 0 || newX > 413 || newY < 0 || newY > 405) {
      setIsMoving(false);
      return;
    }

    // Collision Check
    const isColliding = LAB_COLLISIONS.some(box => {
      // Player collision box (approx 30x20 at feet)
      const pBox = { x: newX - 15, y: newY - 10, w: 30, h: 20 };
      return pBox.x < box.x + box.width &&
             pBox.x + pBox.w > box.x &&
             pBox.y < box.y + box.height &&
             pBox.y + pBox.h > box.y;
    });

    if (isColliding) {
      setIsMoving(false);
      return;
    }

    setPlayerPixelPos({ x: newX, y: newY });
    
    if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
    moveTimeoutRef.current = setTimeout(() => setIsMoving(false), 150);
  }, [playerPixelPos, gameState]);

  // --- Story Dialogues ---
  const storyDialogues: Record<number, Dialogue[]> = {
    0: [
      { speaker: "You", text: "I am going to the Big City today! I have my bags ready.", grammarFocus: "Going To: A planned intention." },
      { speaker: "You", text: "I think it will be a sunny day for a walk.", grammarFocus: "Will: A prediction based on opinion." },
    ],
    1: [
      { speaker: "Leo", text: "Hey! Wait! Are you leaving for the city now?" },
      { speaker: "You", text: "Yes! I am going to start my journey.", grammarFocus: "Going To: A plan." },
      { speaker: "Leo", text: "Wait! You're going to need a Pokémon for protection!", grammarFocus: "Going To: A prediction with evidence." },
      { speaker: "Leo", text: "Follow me! We are going to visit Dr. Pereira's lab.", grammarFocus: "Going To: An intention." },
    ],
    2: [
      { speaker: "Leo", text: "Here we are! Let's go inside.", grammarFocus: "Let's: Suggestion." },
    ],
    3: [
      { speaker: "Prof. Pereira", text: "Welcome! I hear you are going to start a journey.", grammarFocus: "Going To: A plan." },
      { speaker: "Prof. Pereira", text: "I have three Pokémon here. Which one are you going to choose?", grammarFocus: "Going To: Asking about a plan." },
    ],
    4: [
      { speaker: "Prof. Pereira", text: "Excellent! I am sure you two will be great partners.", grammarFocus: "Will: A prediction." },
      { speaker: "Leo", text: "Now you are ready! I think you will be a great trainer.", grammarFocus: "Will: A prediction." },
    ]
  };

  const startDialogue = useCallback((step: number) => {
    setDialogueQueue(storyDialogues[step]);
    setDialogueIndex(0);
    setGameState('DIALOGUE');
    setStoryStep(step + 1);
  }, []);

  // --- Movement Logic ---
  const startBattle = useCallback(async (opponentName: string = 'Charmander') => {
    setPendingOpponent(opponentName);
    if (opponentName === 'GYM_LEADER') {
      setGameState('FINAL_BATTLE_CHOICE');
    } else {
      setGameState('BATTLE_CHOICE');
    }
  }, []);

  const confirmBattle = useCallback(async (opponentName: string, playerPkmnName: string) => {
    setIsStartingBattle(true);
    setSelectedPokemon(playerPkmnName);
    
    const pDetails = await getPokemonData(playerPkmnName);
    const oDetails = await getPokemonData(opponentName);
    
    setPlayerPkmnDetails(pDetails);
    setOpponentPkmnDetails(oDetails);

    setPlayerHP(pDetails.hp);
    setMaxPlayerHP(pDetails.hp);
    
    const safeOpponentName = opponentName || 'Charmander';
    setOpponentHP(oDetails.hp);
    setCurrentOpponent(safeOpponentName);
    setCurrentOpponentSprite(oDetails.sprite);
    setCurrentOpponentAbilities(oDetails.moves.join(', '));
    
    setBattleLog([{ role: 'model', text: `A wild ${safeOpponentName} appeared! What will ${playerPkmnName} do?` }]);
    setGameState('BATTLE');
    setBattleInput('');
    setIsOpponentTurn(false);
    setIsStartingBattle(false);

    if (activeApiKeys.length > 0) {
      try {
        const ai = new GoogleGenAI({ apiKey: activeApiKeys[apiKeyIndex] });
        const systemInstruction = opponentName === 'GYM_LEADER' 
          ? `You are a text-based RPG narrator for the FINAL BOSS BATTLE in a Pokémon Gym. This is an English learning game for 8th-grade students. 
CRITICAL RULES:
1. You MUST speak ONLY in English.
2. You MUST perfectly model the difference between "Will" (for immediate actions, spontaneous decisions, or predictions without evidence) and "Going to" (for planned intentions or predictions with clear present evidence).
3. GRAMMAR DODGE MECHANIC: If the player tries to use "will" or "going to" in their command but uses the WRONG ONE based on the context (e.g., using "will" for a planned strategy, or "going to" for a sudden reaction), their attack MUST MISS and the opponent MUST DODGE. Explain that the attack missed because of the grammar mistake.
4. If they use "will" or "going to" CORRECTLY, make their attack very successful and praise their grammar!
5. BATTLE FLOW: Every turn, after the player's action, the opponent MUST counter-attack.
6. The player has a TEAM of 3 Pokémon: ${selectedTeam.join(', ')}. They can switch between them or use them together in narration.
7. The opponent is the GYM LEADER with a TEAM of 3: Pikachu, Charmander, and Bulbasaur.
8. The battle is 3v3. Narrate the epic scale of this final confrontation.
9. You must return your response in JSON format matching the schema. Update the HP and inventory based on the turn's events. The opponent's total team HP is ${oDetails.hp}. The player's total team HP is ${pDetails.hp}.`
          : `You are a text-based RPG narrator for a Pokémon battle. This is an English learning game for 8th-grade students. 
CRITICAL RULES:
1. You MUST speak ONLY in English.
2. You MUST perfectly model the difference between "Will" (for immediate actions, spontaneous decisions, or predictions without evidence) and "Going to" (for planned intentions or predictions with clear present evidence).
3. GRAMMAR DODGE MECHANIC: If the player tries to use "will" or "going to" in their command but uses the WRONG ONE based on the context (e.g., using "will" for a planned strategy, or "sudden reaction), their attack MUST MISS and the opponent MUST DODGE. Explain that the attack missed because of the grammar mistake.
4. If they use "will" or "going to" CORRECTLY, make their attack very successful and praise their grammar!
5. BATTLE FLOW: Every turn, after the player's action, the opponent MUST counter-attack.
6. For all OTHER words, accept broken English, typos, and simple vocabulary. Only be strict about "will" vs "going to".
7. The player's Pokémon is ${playerPkmnName}. It only knows these moves: ${pDetails.moves.join(', ')}. If the player tries to use a move it doesn't know, the attack fails.
8. The player has Potions (heals 10 HP) and Pokeballs (catches Pokemon).
9. You must return your response in JSON format matching the schema. Update the HP and inventory based on the turn's events. The opponent is ${safeOpponentName} and has abilities: ${oDetails.moves.join(', ')}. The opponent's max HP is ${oDetails.hp}. ${playerPkmnName}'s max HP is ${pDetails.hp}.`;

        chatRef.current = ai.chats.create({
          model: "gemini-3.1-flash-lite-preview",
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                playerNarration: { type: Type.STRING, description: "Short summary of the player's action and if it hit/missed (max 2 sentences)." },
                opponentNarration: { type: Type.STRING, description: "Short summary of the opponent's counter-attack (max 2 sentences)." },
                playerHP: { type: Type.INTEGER, description: "Player's current HP after the turn." },
                opponentHP: { type: Type.INTEGER, description: "Opponent's current HP after the turn." },
                potionsLeft: { type: Type.INTEGER, description: "Number of potions remaining." },
                pokeballsLeft: { type: Type.INTEGER, description: "Number of pokeballs remaining." },
                battleEnded: { type: Type.BOOLEAN, description: "True if the opponent is caught, defeated, or player runs." },
                isCaught: { type: Type.BOOLEAN, description: "True if the player successfully used a Pokeball and caught the opponent." }
              },
              required: ["playerNarration", "opponentNarration", "playerHP", "opponentHP", "potionsLeft", "pokeballsLeft", "battleEnded"]
            }
          }
        });
      } catch (e) {
        console.error("Failed to init chat", e);
      }
    }
  }, [activeApiKeys, apiKeyIndex, currentLevel, selectedTeam]);

  const confirmFinalBattle = useCallback(async () => {
    if (selectedTeam.length < 1) return;
    setIsFinalBattle(true);
    
    setIsStartingBattle(true);
    setSelectedPokemon(selectedTeam[0]); // Main sprite
    
    // Fetch details for all 3
    const teamDetails = await Promise.all(selectedTeam.map(name => getPokemonData(name)));
    const combinedMoves = Array.from(new Set(teamDetails.flatMap(d => d.moves)));
    const combinedHP = Math.min(120, teamDetails.reduce((sum, d) => sum + d.hp, 0));
    
    const pDetails = {
      ...teamDetails[0],
      hp: combinedHP,
      moves: combinedMoves
    };
    
    const oDetails = await getPokemonData('GYM_LEADER');
    
    setPlayerPkmnDetails(pDetails);
    setOpponentPkmnDetails(oDetails);

    setPlayerHP(pDetails.hp);
    setMaxPlayerHP(pDetails.hp);
    
    const safeOpponentName = 'GYM_LEADER';
    setOpponentHP(oDetails.hp);
    setCurrentOpponent(safeOpponentName);
    setCurrentOpponentSprite(oDetails.sprite);
    setCurrentOpponentAbilities(oDetails.moves.join(', '));
    
    setBattleLog([{ role: 'model', text: `GYM LEADER wants to battle! What will your team do?` }]);
    setGameState('BATTLE');
    setBattleInput('');
    setIsOpponentTurn(false);
    setIsStartingBattle(false);

    if (activeApiKeys.length > 0) {
      try {
        const ai = new GoogleGenAI({ apiKey: activeApiKeys[apiKeyIndex] });
        const systemInstruction = `You are a text-based RPG narrator for the FINAL BOSS BATTLE in a Pokémon Gym. This is an English learning game for 8th-grade students. 
CRITICAL RULES:
1. You MUST speak ONLY in English.
2. You MUST perfectly model the difference between "Will" (for immediate actions, spontaneous decisions, or predictions without evidence) and "Going to" (for planned intentions or predictions with clear present evidence).
3. GRAMMAR DODGE MECHANIC: If the player tries to use "will" or "going to" in their command but uses the WRONG ONE based on the context (e.g., using "will" for a planned strategy, or "going to" for a sudden reaction), their attack MUST MISS and the opponent MUST DODGE. Explain that the attack missed because of the grammar mistake.
4. If they use "will" or "going to" CORRECTLY, make their attack very successful and praise their grammar!
5. BATTLE FLOW: Every turn, after the player's action, the opponent MUST counter-attack.
6. The player has a TEAM of 3 Pokémon: ${selectedTeam.join(', ')}. They can switch between them or use them together in narration. Their combined moves are: ${combinedMoves.join(', ')}.
7. The opponent is the GYM LEADER with a TEAM of 3: Pikachu, Charmander, and Bulbasaur.
8. The battle is 3v3. Narrate the epic scale of this final confrontation.
9. You must return your response in JSON format matching the schema. Update the HP and inventory based on the turn's events. The opponent's total team HP is ${oDetails.hp}. The player's total team HP is ${pDetails.hp}.`;

        chatRef.current = ai.chats.create({
          model: "gemini-3.1-flash-lite-preview",
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                playerNarration: { type: Type.STRING, description: "Short summary of the player's action and if it hit/missed (max 2 sentences)." },
                opponentNarration: { type: Type.STRING, description: "Short summary of the opponent's counter-attack (max 2 sentences)." },
                playerHP: { type: Type.INTEGER, description: "Player's current HP after the turn." },
                opponentHP: { type: Type.INTEGER, description: "Opponent's current HP after the turn." },
                potionsLeft: { type: Type.INTEGER, description: "Number of potions remaining." },
                pokeballsLeft: { type: Type.INTEGER, description: "Number of pokeballs remaining." },
                battleEnded: { type: Type.BOOLEAN, description: "True if the opponent is caught, defeated, or player runs." },
                isCaught: { type: Type.BOOLEAN, description: "True if the player successfully used a Pokeball and caught the opponent." }
              },
              required: ["playerNarration", "opponentNarration", "playerHP", "opponentHP", "potionsLeft", "pokeballsLeft", "battleEnded"]
            }
          }
        });
      } catch (e) {
        console.error("Failed to init chat", e);
      }
    }
  }, [selectedTeam, activeApiKeys, apiKeyIndex]);

  const toggleTeamMember = (name: string) => {
    setSelectedTeam(prev => {
      if (prev.includes(name)) {
        return prev.filter(n => n !== name);
      }
      if (prev.length >= 3) return prev;
      return [...prev, name];
    });
  };

  const handleInteract = useCallback(() => {
    if (currentLevel === 1) {
      // Check distance to Prof. Pereira (approx 180, 100)
      const dx = playerPixelPos.x - 180;
      const dy = playerPixelPos.y - 100;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < 80) {
        if (storyStep === 3) {
          startDialogue(3);
        } else if (storyStep === 4) {
          setGameState('POKEMON_CHOICE');
        } else {
          setDialogueQueue([{ speaker: 'Prof. Pereira', text: "Take care of your Pokémon!" }]);
          setDialogueIndex(0);
          setGameState('DIALOGUE');
        }
      }
      return;
    }

    let targetX = playerPos.x;
    let targetY = playerPos.y;
    if (facing === 'up') targetY -= 1;
    if (facing === 'down') targetY += 1;
    if (facing === 'left') targetX -= 1;
    if (facing === 'right') targetX += 1;

    if (targetX < 0 || targetX >= mapData[0].length || targetY < 0 || targetY >= mapData.length) return;

    const targetTile = mapData[targetY][targetX];

    if (targetTile.type === 3 || targetTile.type === 15) { // Tall Grass or Arbusto (can be cut)
      const newMapData = [...mapData];
      newMapData[targetY] = [...newMapData[targetY]];
      newMapData[targetY][targetX] = { ...targetTile, type: 0, hasBattle: false };
      setMapData(newMapData);
      setDialogueQueue([{ speaker: 'System', text: 'You cut down the bush!' }]);
      setDialogueIndex(0);
      setGameState('DIALOGUE');
    } else if (targetTile.type === 7) { // Sign
      setDialogueQueue([{ speaker: 'Sign', text: targetTile.text || 'A wooden sign. It is illegible.' }]);
      setDialogueIndex(0);
      setGameState('DIALOGUE');
    } else if (targetTile.type === 8) { // Pokeball
      const newMapData = [...mapData];
      newMapData[targetY] = [...newMapData[targetY]];
      newMapData[targetY][targetX] = { ...targetTile, type: 0 };
      setMapData(newMapData);
      setInventory(prev => ({ ...prev, potion: prev.potion + 1 }));
      setDialogueQueue([{ speaker: 'System', text: 'You found a Potion!' }]);
      setDialogueIndex(0);
      setGameState('DIALOGUE');
    } else if (targetX === friendPos.x && targetY === friendPos.y && isFriendVisible) {
      if (storyStep === 2) {
        setDialogueQueue([{ speaker: 'Leo', text: "Hurry up! The lab is just ahead!" }]);
        setDialogueIndex(0);
        setGameState('DIALOGUE');
      }
    }
  }, [playerPos, facing, mapData, startBattle, currentLevel, playerPixelPos, storyStep, friendPos, isFriendVisible, startDialogue]);

  const movePlayer = useCallback((dx: number, dy: number, dir: 'down' | 'up' | 'left' | 'right') => {
    if (gameState !== 'EXPLORE' || isMoving) return;

    if (currentLevel === 1) {
      movePlayerPixel(dx, dy, dir);
      return;
    }

    setFacing(dir);
    setIsMoving(true);

    // Lab Entrance Check (Level 0)
    const isAtLabEntrance = currentLevel === 0 && storyStep === 2 && friendPos.x === 11 && friendPos.y === 11;
    const isMovingIntoLeoAtLab = isAtLabEntrance && (
      (playerPos.x === 11 && playerPos.y === 12 && dir === 'up') ||
      (playerPos.x === 10 && playerPos.y === 11 && dir === 'right') ||
      (playerPos.x === 12 && playerPos.y === 11 && dir === 'left')
    );

    if (isMovingIntoLeoAtLab) {
      setTimeout(() => {
        setCurrentLevel(1);
        setPlayerPixelPos({ x: 206, y: 380 });
        setStoryStep(3);
        setIsMoving(false);
      }, 250);
      return;
    }

    const newX = playerPos.x + dx;
    const newY = playerPos.y + dy;

    // Level Transitions
    if (currentLevel === 0 && storyStep >= 6 && newY >= mapData.length && newX === 7) {
      setTimeout(() => {
        setCurrentLevel(2);
        setMapData(LEVEL_2_MAP_DATA);
        setPlayerPos({ x: 7, y: 0 });
        setFriendPos({ x: 7, y: -1 }); // Position friend off-screen initially
        setIsMoving(false);
      }, 250);
      return;
    }

    if (currentLevel === 2 && newY < 0 && newX === 7) {
      setTimeout(() => {
        setCurrentLevel(0);
        setMapData(INITIAL_MAP_DATA);
        setPlayerPos({ x: 7, y: INITIAL_MAP_DATA.length - 1 });
        setFriendPos({ x: 7, y: INITIAL_MAP_DATA.length });
        setIsMoving(false);
      }, 250);
      return;
    }

    if (currentLevel === 2 && newY >= mapData.length && newX === 7) {
      setTimeout(() => {
        setCurrentLevel(3);
        setMapData(LEVEL_3_MAP_DATA);
        setPlayerPos({ x: 7, y: 0 });
        setFriendPos({ x: 7, y: -1 });
        setIsMoving(false);
      }, 250);
      return;
    }

    if (currentLevel === 3 && newY >= mapData.length && newX === 7) {
      setTimeout(() => {
        setCurrentLevel(4);
        setMapData(LEVEL_4_MAP_DATA);
        setPlayerPos({ x: 7, y: 0 });
        setFriendPos({ x: 7, y: -1 });
        setIsMoving(false);
      }, 250);
      return;
    }

    if (currentLevel === 4 && newY >= mapData.length && newX === 7) {
      setTimeout(() => {
        setCurrentLevel(5);
        setMapData(LEVEL_5_MAP_DATA);
        setPlayerPos({ x: 7, y: 0 });
        setFriendPos({ x: 7, y: -1 });
        setIsMoving(false);
      }, 250);
      return;
    }

    if (currentLevel >= 3 && newY < 0 && newX === 7) {
      setTimeout(() => {
        const prevLevel = currentLevel - 1;
        const prevMap = prevLevel === 2 ? LEVEL_2_MAP_DATA : prevLevel === 3 ? LEVEL_3_MAP_DATA : LEVEL_4_MAP_DATA;
        setCurrentLevel(prevLevel);
        setMapData(prevMap);
        setPlayerPos({ x: 7, y: prevMap.length - 1 });
        setFriendPos({ x: 7, y: prevMap.length });
        setIsMoving(false);
      }, 250);
      return;
    }

    // Boundary & Collision Check
    if (newX < 0 || newX >= mapData[0].length || newY < 0 || newY >= mapData.length) {
      setTimeout(() => setIsMoving(false), 150);
      return;
    }
    
    const targetType = mapData[newY][newX].type;
    // 1: Tree, 2: Rock, 4: Water, 7: Sign, 8: Pokeball, 10-14: Buildings, 15: Arbusto, 16: Invisible Wall, 18: Lab Pereira
    // Tile 11 (Gym) is no longer blocked so the player can "enter" it
    let isBlocked = [1, 2, 4, 7, 8, 10, 12, 13, 14, 15, 16, 18].includes(targetType);

    // Friend Collision (Only if not following)
    const isFollowing = (currentLevel === 0 && storyStep >= 6) || currentLevel >= 2;
    if (!isFollowing && isFriendVisible && newX === friendPos.x && newY === friendPos.y) {
      isBlocked = true;
    }

    if (!isBlocked) {
      // Trigger Final Battle when entering Gym area (5x5 around anchor)
      let isEnteringGym = false;
      if (currentLevel === 5) {
        // Gym is anchored at [22][6], covers y: 18-22, x: 6-10
        if (newY >= 18 && newY <= 22 && newX >= 6 && newX <= 10) {
          isEnteringGym = true;
        }
      } else if (targetType === 11) {
        isEnteringGym = true;
      }

      if (isEnteringGym) {
        setTimeout(() => startBattle('GYM_LEADER'), 300);
      }

      // Check if inside any building's area (buildings are anchored at bottom-left)
      // Buildings 10-14 are 5x5, Lab 18 is 6x4
      for (let dy = 0; dy <= 4; dy++) {
        for (let dx = 0; dx <= 5; dx++) {
          const checkY = newY + dy;
          const checkX = newX - dx;
          if (checkY >= 0 && checkY < mapData.length && checkX >= 0 && checkX < mapData[0].length) {
            const bType = mapData[checkY][checkX].type;
            if (bType >= 10 && bType <= 14) {
              if (dx <= 4 && dy <= 4) {
                isBlocked = true;
                break;
              }
            }
            if (bType === 18) {
              // Lab 18 is 6x4. Entrance is at (11, 10) relative to anchor at (8, 10)
              if (dx <= 5 && dy <= 3) {
                if (!(newX === 11 && newY === 10)) {
                  isBlocked = true;
                }
              }
              break;
            }
          }
        }
        if (isBlocked) break;
      }
    }

    if (isBlocked) {
      setTimeout(() => setIsMoving(false), 150);
      return;
    }

    // Lab Entrance Check (Level 0) - Handled above to avoid overlap
    if (currentLevel === 0 && newX === 11 && newY === 10) {
      setIsMoving(false);
      return;
    }

    // Move Friend (Following Logic)
    if (isFollowing) {
      setFriendPos(playerPos);
      setFriendFacing(facing);
      setIsFriendMoving(true);
      setTimeout(() => setIsFriendMoving(false), 250);
    }

    setPlayerPos({ x: newX, y: newY });
    setTimeout(() => setIsMoving(false), 250);

    // Wild Encounters
    if (currentLevel >= 2 && targetType === 3) {
      if (Math.random() < 0.35) {
        let pkmnPool = ['Bulbasaur', 'Charmander', 'Squirtle', 'Eevee', 'Jigglypuff', 'Caterpie'];
        if (currentLevel === 3) {
          pkmnPool = ['Caterpie', 'Metapod', 'Butterfree', 'Oddish', 'Bellsprout', 'Pikachu'];
        } else if (currentLevel === 4) {
          pkmnPool = ['Pikachu', 'Abra', 'Gastly', 'Dratini', 'Scyther', 'Pinsir'];
        }
        const wildPkmn = pkmnPool[Math.floor(Math.random() * pkmnPool.length)];
        setTimeout(() => startBattle(wildPkmn), 300);
      }
    }

    // Trigger Story Events
    if (currentLevel === 0 || currentLevel >= 2) {
      if (currentLevel === 0) {
        if (storyStep === 0 && newY > 7) {
          startDialogue(0);
        }
        if (storyStep === 1 && newY >= 9) {
          setIsFriendVisible(true);
          startDialogue(1);
        }
      }
    } else {
      if (newY === 0) {
        setGameState('FINISHED');
      }
    }
  }, [playerPos, gameState, storyStep, startDialogue, currentLevel, isMoving, mapData, startBattle, facing, movePlayerPixel, friendPos, isFriendVisible]);

  // --- Automatic Battle Trigger Effect ---
  useEffect(() => {
    if (gameState === 'EXPLORE' && !isMoving) {
      const tile = mapData[playerPos.y][playerPos.x];
      
      // Story battle for Level 0 - REMOVED for Level 2 transition
      /*
      if (currentLevel === 0 && storyStep === 6 && playerPos.y >= 14) {
        startBattle('Charmander');
        return;
      }
      */

      if (tile.type === 17) {
        const pkmnName = tile.pokemonName || 'Charmander';
        
        // Remove the tile so it doesn't trigger again
        const newMapData = [...mapData];
        newMapData[playerPos.y] = [...newMapData[playerPos.y]];
        newMapData[playerPos.y][playerPos.x] = { ...tile, type: currentLevel === 5 ? 5 : 0 };
        setMapData(newMapData);

        setTimeout(() => {
          startBattle(pkmnName);
        }, 300);
      } else if (tile.hasBattle) {
        // Remove battle trigger
        const newMapData = [...mapData];
        newMapData[playerPos.y] = [...newMapData[playerPos.y]];
        newMapData[playerPos.y][playerPos.x] = { ...tile, hasBattle: false };
        setMapData(newMapData);
        
        setTimeout(() => {
          startBattle('Charmander');
        }, 300);
      }
    }
  }, [playerPos, gameState, isMoving, mapData, startBattle, currentLevel, storyStep]);

  const handleBattleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!battleInput.trim() || isBattleLoading || isOpponentTurn) return;

    const userText = battleInput.trim();
    setBattleInput('');
    setBattleLog(prev => [...prev, { role: 'user', text: `> ${userText}` }]);
    setIsBattleLoading(true);

    const models = ["gemini-3.1-flash-lite-preview", "gemini-2.5-flash-lite"];
    let success = false;

    for (const model of models) {
      let currentKeyIndex = apiKeyIndex;
      let attempts = 0;

      while (attempts < activeApiKeys.length) {
        try {
          const key = activeApiKeys[currentKeyIndex];
          const ai = new GoogleGenAI({ apiKey: key });
          const pDetails = playerPkmnDetails || await getPokemonData(selectedPokemon);
          const oDetails = opponentPkmnDetails || await getPokemonData(currentOpponent);

          // Always recreate chat if we are retrying or if it's the first time
          const systemInstruction = isFinalBattle ? `You are a text-based RPG narrator for the FINAL BOSS BATTLE in a Pokémon Gym. This is an English learning game for 8th-grade students. 
CRITICAL RULES:
1. You MUST speak ONLY in English.
2. You MUST perfectly model the difference between "Will" (for immediate actions, spontaneous decisions, or predictions without evidence) and "Going to" (for planned intentions or predictions with clear present evidence).
3. GRAMMAR DODGE MECHANIC: If the player tries to use "will" or "going to" in their command but uses the WRONG ONE based on the context (e.g., using "will" for a planned strategy, or "going to" for a sudden reaction), their attack MUST MISS and the opponent MUST DODGE. Explain that the attack missed because of the grammar mistake.
4. If they use "will" or "going to" CORRECTLY, make their attack very successful and praise their grammar!
5. BATTLE FLOW: Every turn, after the player's action, the opponent MUST counter-attack.
6. The player has a TEAM of 3 Pokémon: ${selectedTeam.join(', ')}. They can switch between them or use them together in narration. Their combined moves are: ${pDetails.moves.join(', ')}. If the player tries to use a move they don't know, the attack fails.
7. The opponent is the GYM LEADER with a TEAM of 3: Pikachu, Charmander, and Bulbasaur.
8. The battle is 3v3. Narrate the epic scale of this final confrontation.
9. You must return your response in JSON format matching the schema. Update the HP and inventory based on the turn's events. The opponent's total team HP is ${oDetails.hp}. The player's total team HP is ${pDetails.hp}.
10. SPECIAL ACTIONS:
    - FLED: If the player wants to run away, set "isFled" to true and "battleEnded" to true.
    - CAUGHT: If the player uses a Pokeball and succeeds, set "isCaught" to true and "battleEnded" to true.
    - DEFEATED: If the opponent's HP reaches 0, set "isDefeated" to true and "battleEnded" to true.
    - STUNNED: If the player's attack stuns the opponent (e.g., using a move that causes paralysis or confusion), set "isStunned" to true. If "isStunned" is true, the opponent will NOT attack this turn (make opponentNarration reflect this).
11. HP RULES: If an attack misses or fails, the target's HP MUST NOT decrease. If an attack hits, the target's HP MUST decrease.` : `You are a text-based RPG narrator for a Pokémon battle. This is an English learning game for 8th-grade students. 
CRITICAL RULES:
1. You MUST speak ONLY in English.
2. You MUST perfectly model the difference between "Will" (for immediate actions, spontaneous decisions, or predictions without evidence) and "Going to" (for planned intentions or predictions with clear present evidence).
3. GRAMMAR DODGE MECHANIC: If the player tries to use "will" or "going to" in their command but uses the WRONG ONE based on the context (e.g., using "will" for a planned strategy, or "going to" for a sudden reaction), their attack MUST MISS and the opponent MUST DODGE. Explain that the attack missed because of the grammar mistake.
4. If they use "will" or "going to" CORRECTLY, make their attack very successful and praise their grammar!
5. BATTLE FLOW: Every turn, after the player's action, the opponent MUST counter-attack.
6. For all OTHER words, accept broken English, typos, and simple vocabulary. Only be strict about "will" vs "going to".
7. The player's Pokémon is ${selectedPokemon}. It only knows these moves: ${pDetails.moves.join(', ')}. If the player tries to use a move it doesn't know, the attack fails.
8. The player has Potions (heals 10 HP) and Pokeballs (catches Pokemon).
9. You must return your response in JSON format matching the schema. Update the HP and inventory based on the turn's events. The opponent is ${currentOpponent || 'Charmander'} and has abilities: ${oDetails.moves.join(', ')}. The opponent's max HP is ${oDetails.hp}. ${selectedPokemon}'s max HP is ${pDetails.hp}.
10. SPECIAL ACTIONS:
    - FLED: If the player wants to run away, set "isFled" to true and "battleEnded" to true.
    - CAUGHT: If the player uses a Pokeball and succeeds, set "isCaught" to true and "battleEnded" to true.
    - DEFEATED: If the opponent's HP reaches 0, set "isDefeated" to true and "battleEnded" to true.
    - STUNNED: If the player's attack stuns the opponent (e.g., using a move that causes paralysis or confusion), set "isStunned" to true. If "isStunned" is true, the opponent will NOT attack this turn (make opponentNarration reflect this).
11. HP RULES: If an attack misses or fails, the target's HP MUST NOT decrease. If an attack hits, the target's HP MUST decrease.`;

          chatRef.current = ai.chats.create({
            model: model,
            config: {
              systemInstruction: systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  playerNarration: { type: Type.STRING, description: "Short summary of the player's action and if it hit/missed (max 2 sentences)." },
                  opponentNarration: { type: Type.STRING, description: "Short summary of the opponent's counter-attack (max 2 sentences)." },
                  playerHP: { type: Type.INTEGER, description: "Player's current HP after the turn." },
                  opponentHP: { type: Type.INTEGER, description: "Opponent's current HP after the turn." },
                  playerHit: { type: Type.BOOLEAN, description: "True if the player's attack successfully hit and damaged the opponent. False if it missed, failed, or was a non-damaging move." },
                  opponentHit: { type: Type.BOOLEAN, description: "True if the opponent's counter-attack hit and damaged the player." },
                  potionsLeft: { type: Type.INTEGER, description: "Number of potions remaining." },
                  pokeballsLeft: { type: Type.INTEGER, description: "Number of pokeballs remaining." },
                  battleEnded: { type: Type.BOOLEAN, description: "True if the opponent is caught, defeated, or player runs." },
                  isCaught: { type: Type.BOOLEAN, description: "True if the player successfully used a Pokeball and caught the opponent." },
                  isFled: { type: Type.BOOLEAN, description: "True if the player successfully ran away from the battle." },
                  isStunned: { type: Type.BOOLEAN, description: "True if the opponent was stunned and could not attack this turn." },
                  isDefeated: { type: Type.BOOLEAN, description: "True if the opponent was defeated (HP reached 0)." }
                },
                required: ["playerNarration", "opponentNarration", "playerHP", "opponentHP", "playerHit", "opponentHit", "potionsLeft", "pokeballsLeft", "battleEnded", "isCaught", "isFled", "isStunned", "isDefeated"]
              }
            }
          });

          const stateContext = `[CURRENT STATE BEFORE TURN] Player HP: ${playerHP}/${maxPlayerHP}, Opponent HP: ${opponentHP}/${oDetails.hp}, Potions: ${inventory.potion}, Pokeballs: ${inventory.pokeball}. Player Command: ${userText}`;
          const response = await chatRef.current.sendMessage({ message: stateContext });
          
          let cleanText = response.text.trim();
          if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
          }
          const data = JSON.parse(cleanText);
          
          // Player Turn Phase
          setPlayerAnim('attack');
          setTimeout(() => {
            setPlayerAnim('idle');
            if (data.playerHit) setOpponentAnim('hit');
            setOpponentHP(Math.max(0, Math.min(oDetails.hp, data.opponentHP)));
            setBattleLog(prev => [...prev, { role: 'model', text: data.playerNarration }]);
            
            setTimeout(() => {
              if (data.playerHit) setOpponentAnim('idle');
            }, 500);
          }, 500);

          setIsOpponentTurn(true);
          setIsBattleLoading(false);

          // Opponent Turn Phase (2 seconds later)
          setTimeout(() => {
            // Update inventory first
            setInventory({ potion: data.potionsLeft, pokeball: data.pokeballsLeft });

            // Handle catching logic
            if (data.isCaught) {
              setOwnedPokemon(prev => {
                if (!prev.includes(currentOpponent)) return [...prev, currentOpponent];
                return prev;
              });
            }

            if (data.isStunned || data.battleEnded) {
              setBattleLog(prev => [...prev, { role: 'model', text: data.opponentNarration }]);
              setIsOpponentTurn(false);
              
              if (data.battleEnded) {
                if (data.isCaught || data.isDefeated) {
                  if (Math.random() < 0.15) {
                    setInventory(prev => ({ ...prev, pokeball: prev.pokeball + 1 }));
                    setBattleLog(prev => [...prev, { role: 'model', text: "Lucky! You found a Pokéball after the battle!" }]);
                  }
                }
                setTimeout(() => {
                  if (currentLevel === 5 && currentOpponent === 'GYM_LEADER') {
                    setGameState('FINISHED');
                  } else if (currentLevel === 5 && currentOpponent === 'Treinador') {
                    setStoryStep(7);
                    setDialogueQueue([
                      { speaker: "Organizador", text: "Parabéns Red! Você venceu o melhor treinador pokémon!" }
                    ]);
                    setDialogueIndex(0);
                    setGameState('DIALOGUE');
                  } else {
                    setGameState('EXPLORE');
                  }
                }, 4000);
              }
              return;
            }

            setOpponentAnim('attack');
            setTimeout(() => {
              setOpponentAnim('idle');
              if (data.opponentHit) setPlayerAnim('hit');
              setPlayerHP(Math.max(0, Math.min(maxPlayerHP, data.playerHP)));
              setBattleLog(prev => [...prev, { role: 'model', text: data.opponentNarration }]);
              
              setTimeout(() => {
                if (data.opponentHit) setPlayerAnim('idle');
                setIsOpponentTurn(false);
              }, 500);
            }, 500);
          }, 2000);

          setApiKeyIndex(currentKeyIndex);
          success = true;
          break; // Success!
        } catch (error) {
          console.error(`Error with model ${model} and key ${currentKeyIndex}, rotating...`, error);
          attempts++;
          currentKeyIndex = (currentKeyIndex + 1) % activeApiKeys.length;
        }
      }
      if (success) break;
    }

    if (!success) {
      setBattleLog(prev => [...prev, { role: 'model', text: "An error occurred in the battle. All API keys and models failed." }]);
      setIsBattleLoading(false);
    }
  };

  const handleNextDialogue = useCallback(() => {
    if (dialogueIndex < dialogueQueue.length - 1) {
      setDialogueIndex(prev => prev + 1);
    } else {
      if (currentLevel === 5 && storyStep === 7) {
        setGameState('CREDITS');
      } else {
        setGameState('EXPLORE');
        if (currentLevel === 1 && storyStep === 5) {
          setCurrentLevel(0);
          setPlayerPos({ x: 9, y: 11 });
          setStoryStep(6);
        }
      }
    }
  }, [dialogueIndex, dialogueQueue, currentLevel, storyStep]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        setShowCollisions(prev => !prev);
        return;
      }

      if (gameState === 'EXPLORE') {
        const dx = (e.key === 'ArrowLeft' || e.key === 'a') ? -1 : (e.key === 'ArrowRight' || e.key === 'd') ? 1 : 0;
        const dy = (e.key === 'ArrowUp' || e.key === 'w') ? -1 : (e.key === 'ArrowDown' || e.key === 's') ? 1 : 0;
        const dir = dy === -1 ? 'up' : dy === 1 ? 'down' : dx === -1 ? 'left' : dx === 1 ? 'right' : null;

        if (dir) {
          if (currentLevel !== 1) {
            movePlayer(dx, dy, dir);
          } else {
            movePlayerPixel(dx, dy, dir);
          }
        } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'z') {
          handleInteract();
        }
      } else if (gameState === 'DIALOGUE') {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'z') {
          handleNextDialogue();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer, movePlayerPixel, currentLevel, gameState, handleNextDialogue, handleInteract]);

  const selectPokemon = (name: string) => {
    setSelectedPokemon(name);
    setOwnedPokemon([name]);
    startDialogue(4);
  };

  const handlePaint = (x: number, y: number) => {
    const newMap = [...mapData];
    newMap[y] = [...newMap[y]];
    newMap[y][x] = { ...editorBrush };
    setMapData(newMap);
  };

  const exportLevel = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mapData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "pokemon_level.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importLevel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = event => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (Array.isArray(json) && json.length === 15) {
            setMapData(json);
          } else {
            alert('Invalid level format');
          }
        } catch (err) {
          alert('Failed to parse JSON');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  useEffect(() => {
    if (currentLevel === 0 && storyStep === 2 && gameState === 'EXPLORE') {
      const interval = setInterval(() => {
        setFriendPos(prev => {
          const dx = 11 - prev.x;
          const dy = 11 - prev.y;
          if (dx === 0 && dy === 0) {
            clearInterval(interval);
            setIsFriendMoving(false);
            setFriendFacing('down');
            return prev;
          }
          
          setIsFriendMoving(true);
          let newFacing: 'down' | 'up' | 'left' | 'right' = 'down';
          let nextX = prev.x;
          let nextY = prev.y;

          if (dx !== 0) {
            nextX += Math.sign(dx);
            newFacing = dx > 0 ? 'right' : 'left';
          } else if (dy !== 0) {
            nextY += Math.sign(dy);
            newFacing = dy > 0 ? 'down' : 'up';
          }

          setFriendFacing(newFacing);
          return { x: nextX, y: nextY };
        });
      }, 400);
      return () => clearInterval(interval);
    }
  }, [currentLevel, storyStep, gameState]);

  // Camera Logic: Center on player
  const isGridLevel = currentLevel === 0 || currentLevel >= 2;
  const cameraX = isGridLevel
    ? viewport.w / 2 - (playerPos.x * TILE_SIZE * SCALE + (TILE_SIZE * SCALE) / 2)
    : viewport.w / 2 - (playerPixelPos.x * SCALE);
  const cameraY = isGridLevel
    ? viewport.h / 2 - (playerPos.y * TILE_SIZE * SCALE + (TILE_SIZE * SCALE) / 2)
    : viewport.h / 2 - (playerPixelPos.y * SCALE - (48 * SCALE)); // Center on body, not feet

  return (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center overflow-hidden select-none font-mono">
      
      {/* Fullscreen Game World */}
      <div className="absolute inset-0 overflow-hidden bg-[#8bac0f]">
        {isGridLevel ? (
            <motion.div 
            animate={{ x: cameraX, y: cameraY }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.5 }}
            className="relative"
            style={{ 
              width: mapData[0].length * TILE_SIZE * SCALE, 
              height: mapData.length * TILE_SIZE * SCALE,
              backgroundImage: currentLevel >= 2 ? `url(${SPRITES.chaocidadepedra})` : 'none',
              backgroundSize: `${TILE_SIZE * SCALE}px ${TILE_SIZE * SCALE}px`,
              imageRendering: 'pixelated'
            }}
          >
            {/* Map Rendering */}
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${mapData[0].length}, 1fr)`, gridTemplateRows: `repeat(${mapData.length}, 1fr)` }}>
              {mapData.flatMap((row, y) => row.map((tile, x) => (
                <div key={`game-${currentLevel}-${x}-${y}`} className="relative">
                  <Tile data={tile} x={x} y={y} mapData={mapData} />
                  {showCollisions && [1, 2, 4, 7, 8, 10, 11, 12, 13, 14, 15, 16, 18].includes(tile.type) && (
                    <div className="absolute inset-0 bg-red-500/40 border border-red-600 z-50 flex items-center justify-center text-[8px] text-white font-bold">
                      {tile.type}
                    </div>
                  )}
                </div>
              )))}
            </div>

            {/* Entities */}
            {/* Friend Leo */}
            {((isFriendVisible && storyStep < 6) || (storyStep >= 6 && currentLevel === 0) || currentLevel >= 2) && (
              <motion.div 
                animate={{ x: (friendPos.x * TILE_SIZE + TILE_SIZE / 2) * SCALE, y: (friendPos.y + 1) * TILE_SIZE * SCALE }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute"
                style={{ left: 0, top: 0, zIndex: friendPos.y }}
              >
                <PlayerSprite sprite={SPRITES.friend} facing={friendFacing} isMoving={isFriendMoving} scale={SCALE} />
              </motion.div>
            )}

            {/* Player */}
            <motion.div 
              animate={{ x: (playerPos.x * TILE_SIZE + TILE_SIZE / 2) * SCALE, y: (playerPos.y + 1) * TILE_SIZE * SCALE }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute"
              style={{ left: 0, top: 0, zIndex: playerPos.y }}
            >
              <PlayerSprite facing={facing} isMoving={isMoving} scale={SCALE} />
            </motion.div>

            {/* Story Markers */}
            {currentLevel === 0 && storyStep === 2 && (
              <div 
                className="absolute z-30 animate-bounce"
                style={{ left: 9 * TILE_SIZE + 16, top: 10 * TILE_SIZE - 32 }}
              >
                <MapPin className="text-red-600" fill="currentColor" />
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            animate={{ x: cameraX, y: cameraY }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.5 }}
            className="relative"
            style={{ 
              width: 413 * SCALE, 
              height: 405 * SCALE,
              backgroundImage: `url(${SPRITES.interiorpereira})`,
              backgroundSize: '100% 100%',
              imageRendering: 'pixelated'
            }}
          >
            {/* Prof. Pereira */}
            <div className="absolute" style={{ 
              left: 206 * SCALE, 
              top: 120 * SCALE, 
              zIndex: 120,
            }}>
              <PlayerSprite sprite={SPRITES.pereira} facing="down" isMoving={false} scale={SCALE} />
            </div>

            {/* Leo in Lab */}
            <div className="absolute" style={{ 
              left: 120 * SCALE, 
              top: 150 * SCALE, 
              zIndex: 300,
            }}>
              <PlayerSprite sprite={SPRITES.friend} facing="up" isMoving={false} scale={SCALE} />
            </div>

            {/* Level 1 Collisions Overlay */}
            {showCollisions && LAB_COLLISIONS.map((box, i) => (
              <div 
                key={`col-${i}`}
                className="absolute bg-red-500/40 border border-red-600 z-[1000]"
                style={{
                  left: box.x * SCALE,
                  top: box.y * SCALE,
                  width: box.width * SCALE,
                  height: box.height * SCALE,
                }}
              >
                <span className="text-[8px] text-white font-bold bg-black/50 px-1">{box.label}</span>
              </div>
            ))}

            {/* Player in Lab */}
            <motion.div 
              animate={{ x: playerPixelPos.x * SCALE, y: playerPixelPos.y * SCALE }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute"
              style={{ zIndex: Math.floor(playerPixelPos.y) }}
            >
              <PlayerSprite facing={facing} isMoving={isMoving} scale={SCALE} />
              {showCollisions && (
                <div 
                  className="absolute bg-green-500/40 border border-green-600"
                  style={{
                    left: -15 * SCALE,
                    top: -10 * SCALE,
                    width: 30 * SCALE,
                    height: 20 * SCALE,
                  }}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-8 z-50">
        {/* Header Stats */}
        <div className="flex justify-between items-start gap-2">
          <div className="bg-zinc-900/90 p-3 md:p-4 rounded-xl border border-zinc-700 backdrop-blur-sm pointer-events-auto flex-1 md:flex-none max-w-[60%]">
            <PixelText className="text-[#9bbc0f] block mb-1 text-[10px] md:text-xs">Adventure Log</PixelText>
            <div className="text-[8px] md:text-[10px] text-zinc-400 space-y-1">
              <p className="truncate">Location: Route 1 - Home</p>
              <p className="truncate">Objective: {storyStep === 0 ? "Leave Home" : storyStep === 1 ? "Talk to Leo" : storyStep === 2 ? "Follow Leo to the Lab" : storyStep === 3 ? "Talk to Prof. Pereira" : storyStep === 4 ? "Choose a Pokémon" : storyStep === 5 ? "Leave the Lab" : currentLevel === 2 ? "Explore the Tall Grass" : "Head to Big City"}</p>
              {selectedPokemon && <p className="text-[#9bbc0f] truncate">Partner: {selectedPokemon}</p>}
            </div>
          </div>

          <div className="flex gap-2 items-start">
            {/* Grammar Guide */}
            <div className="hidden md:block bg-zinc-900/90 p-4 rounded-xl border border-zinc-700 backdrop-blur-sm pointer-events-auto w-64">
              <h3 className="text-[#9bbc0f] text-xs font-bold mb-2 flex items-center gap-2">
                <Sparkles size={14} /> GRAMMAR GUIDE
              </h3>
              <div className="space-y-2 text-[9px]">
                <p className="text-zinc-300"><span className="text-white font-bold">WILL:</span> Predictions, Spontaneous Decisions.</p>
                <p className="text-zinc-300"><span className="text-white font-bold">GOING TO:</span> Plans, Intentions, Evidence.</p>
              </div>
            </div>

            {/* Global Settings Button */}
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="bg-zinc-900/90 p-3 rounded-xl border border-zinc-700 backdrop-blur-sm pointer-events-auto text-zinc-400 hover:text-[#9bbc0f]"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Dialogue / Choice Box */}
        <div className="flex flex-col items-center gap-4">
          
          {/* Battle UI */}
          <AnimatePresence>
            {gameState === 'BATTLE' && (
              <motion.div 
                key="battle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black z-50 flex items-center justify-center pointer-events-auto font-pokemon p-4"
              >
                {/* Battle Container */}
                <div 
                  className="relative w-full max-w-5xl aspect-[4/3] md:aspect-[3/2] bg-[#f8f8f8] overflow-hidden shadow-2xl border-8 border-zinc-800 rounded-lg"
                  style={{ maxHeight: '85vh' }}
                >
                  {/* Background Image */}
                  <img 
                    src={SPRITES.battle_bg} 
                    alt="Battle Background" 
                    className="absolute inset-0 w-full h-full object-fill"
                    style={{ imageRendering: 'pixelated' }}
                    referrerPolicy="no-referrer"
                  />

                  {/* Opponent Stats (Top Left) */}
                  <div className="absolute top-[8%] left-[5%] w-[42%] flex flex-col items-center justify-center z-20 bg-[#f8f8f8] border-[6px] border-[#303030] rounded-lg p-2 shadow-md">
                    <span className="text-[3vw] sm:text-[2vw] md:text-[1.2vw] font-bold text-[#303030] mb-1">{isFinalBattle ? "Leader's Team" : (currentOpponent || 'Wild Pokémon')} Lv5</span>
                    {/* HP Bar Slot */}
                    <div className="relative w-[80%] h-[10px] bg-[#484848] rounded-[1px] border border-[#303030] overflow-hidden">
                      <div 
                        className={`absolute inset-0 transition-all duration-500 ${(opponentHP / (opponentPkmnDetails?.hp || 20)) > 0.5 ? 'bg-[#40d040]' : (opponentHP / (opponentPkmnDetails?.hp || 20)) > 0.2 ? 'bg-[#f8d030]' : 'bg-[#f85838]'}`} 
                        style={{ width: `${Math.min(100, Math.max(0, (opponentHP / (opponentPkmnDetails?.hp || 20)) * 100))}%` }} 
                      />
                    </div>
                  </div>

                  {/* Opponent Sprite (Top Right) */}
                  <div className="absolute top-[15%] right-[5%] w-[45%] h-[45%] flex items-center justify-center z-30">
                    {isFinalBattle ? (
                      <div className="flex items-center justify-center w-full h-full">
                        {['Pikachu', 'Charmander', 'Bulbasaur'].map((name, idx) => (
                          <motion.img 
                            key={name}
                            variants={opponentVariants}
                            animate={opponentAnim}
                            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${name === 'Pikachu' ? 25 : name === 'Charmander' ? 4 : 1}.png`} 
                            alt={name} 
                            className="w-1/3 h-[80%] object-contain" 
                            style={{ imageRendering: 'pixelated', marginLeft: idx > 0 ? '-10%' : '0' }} 
                            referrerPolicy="no-referrer" 
                          />
                        ))}
                      </div>
                    ) : (
                      <motion.img 
                        variants={opponentVariants}
                        animate={opponentAnim}
                        src={currentOpponentSprite} 
                        alt={currentOpponent} 
                        className="w-full h-full object-contain" 
                        style={{ imageRendering: 'pixelated' }} 
                        referrerPolicy="no-referrer" 
                      />
                    )}
                  </div>

                  {/* Player Sprite (Bottom Left) */}
                  <div className="absolute bottom-[35%] md:bottom-[20%] left-[5%] w-[60%] h-[60%] flex items-end justify-start z-20">
                    {isFinalBattle ? (
                      <div className="flex items-end justify-start w-full h-full">
                        {selectedTeam.map((name, idx) => (
                          <motion.img 
                            key={name}
                            variants={playerVariants}
                            animate={playerAnim}
                            src={pokemonCache[name.toLowerCase()]?.backSprite || SPRITES[`${name.toLowerCase()}_back` as keyof typeof SPRITES] || SPRITES.eevee_back} 
                            alt={name} 
                            className="w-1/3 h-[80%] object-contain object-bottom" 
                            style={{ imageRendering: 'pixelated', marginLeft: idx > 0 ? '-10%' : '0' }} 
                            referrerPolicy="no-referrer" 
                          />
                        ))}
                      </div>
                    ) : (
                      <motion.img 
                        variants={playerVariants}
                        animate={playerAnim}
                        src={playerPkmnDetails?.backSprite || SPRITES[`${selectedPokemon?.toLowerCase()}_back` as keyof typeof SPRITES] || SPRITES.eevee_back} 
                        alt="Your Pokemon" 
                        className="w-full h-full object-contain object-bottom" 
                        style={{ imageRendering: 'pixelated' }} 
                        referrerPolicy="no-referrer" 
                      />
                    )}
                  </div>

                  {/* Player Stats (Bottom Right) */}
                  <div className="absolute bottom-[45%] md:bottom-[32%] right-[5%] w-[42%] flex flex-col items-center justify-center z-20 bg-[#f8f8f8] border-[6px] border-[#303030] rounded-lg p-2 shadow-md">
                    <span className="text-[3vw] sm:text-[2vw] md:text-[1.2vw] font-bold text-[#303030] mb-1">{isFinalBattle ? 'Team' : (selectedPokemon || 'Eevee')} Lv5</span>
                    {/* HP Bar Slot */}
                    <div className="relative w-[80%] h-[10px] bg-[#484848] rounded-[1px] border border-[#303030] overflow-hidden">
                      <div 
                        className={`absolute inset-0 transition-all duration-500 ${playerHP / maxPlayerHP > 0.5 ? 'bg-[#40d040]' : playerHP / maxPlayerHP > 0.2 ? 'bg-[#f8d030]' : 'bg-[#f85838]'}`} 
                        style={{ width: `${Math.min(100, Math.max(0, (playerHP / maxPlayerHP) * 100))}%` }} 
                      />
                    </div>
                    <div className="text-center text-[2.5vw] sm:text-[1.5vw] md:text-[1vw] font-bold text-[#303030] mt-1">
                      {playerHP}/{maxPlayerHP}
                    </div>
                  </div>

                  {/* Text Box / UI Area (Bottom) */}
                  <div className="absolute bottom-0 left-0 w-full h-[40%] md:h-[28%] flex bg-[#f8f8f8] border-t-8 border-[#303030] z-30">
                    {/* Chat/Log Area */}
                    <div className="flex-[1.8] p-3 flex flex-col border-r-8 border-[#303030] justify-end">
                      <div className="overflow-y-auto space-y-1 flex flex-col scrollbar-hide mb-2">
                        {battleLog.slice(-2).map((msg, i) => (
                          <div key={`log-${i}-${msg.text.substring(0, 20)}`} className="text-[#303030] text-[3.5vw] sm:text-[2vw] md:text-[1vw] leading-tight font-bold">
                            {msg.text}
                          </div>
                        ))}
                        {isBattleLoading && (
                          <div className="text-[#303030] text-[3.5vw] sm:text-[2vw] md:text-[1vw] animate-pulse">
                            ...
                          </div>
                        )}
                      </div>
                      <form onSubmit={handleBattleSubmit} className="flex gap-4 shrink-0 items-center pb-2">
                        <input 
                          type="text" 
                          value={battleInput}
                          onChange={e => setBattleInput(e.target.value)}
                          placeholder="WHAT WILL YOU DO?"
                          className="flex-1 bg-transparent border-none text-[#303030] font-bold uppercase text-[3.5vw] sm:text-[2vw] md:text-[1vw] focus:outline-none placeholder:text-gray-400 py-0"
                          disabled={isBattleLoading}
                          autoFocus
                        />
                        <button 
                          type="submit"
                          disabled={isBattleLoading || !battleInput.trim()}
                          className="text-[#303030] font-bold text-[3.5vw] sm:text-[2vw] md:text-[1vw] hover:scale-110 transition-transform uppercase"
                        >
                          [ACTION]
                        </button>
                      </form>
                    </div>
                    
                    {/* Moves/Items Info */}
                    <div className="flex-1 p-3 flex flex-col justify-start gap-1 text-[3vw] sm:text-[1.5vw] md:text-[0.9vw] font-bold text-[#303030] bg-[#e8e8e8] overflow-hidden">
                      <div className="border-b-4 border-[#303030] mb-1 pb-1 text-[3.5vw] sm:text-[2vw] md:text-[1vw] shrink-0">MOVES:</div>
                      <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide">
                        <div className="grid grid-cols-1 gap-1">
                          {(playerPkmnDetails?.moves || POKEMON_DATA[selectedPokemon as keyof typeof POKEMON_DATA]?.moves || []).map((m, i) => (
                            <div key={`move-${m}-${i}`} className="flex items-center gap-2 hover:text-[#40d040] transition-colors cursor-default">
                              <div className="w-1.5 h-1.5 bg-[#303030] rounded-full" /> {m}
                            </div>
                          ))}
                        </div>
                        <div className="border-b-4 border-[#303030] mt-2 mb-1 pb-1 text-[3.5vw] sm:text-[2vw] md:text-[1vw]">ITEMS:</div>
                        <div className="flex justify-between px-2"><span>POTION</span> <span>x{inventory.potion}</span></div>
                        <div className="flex justify-between px-2"><span>POKEBALL</span> <span>x{inventory.pokeball}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dialogue Box */}
          <AnimatePresence>
            {gameState === 'DIALOGUE' && (
              <motion.div 
                key="dialogue"
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className="w-full max-w-2xl bg-[#0f380f] p-6 border-4 border-[#306230] rounded-xl pointer-events-auto cursor-pointer relative"
                onClick={handleNextDialogue}
              >
                <div className="flex justify-between items-center mb-2">
                  <PixelText className="text-[#9bbc0f] text-sm font-bold">
                    {dialogueQueue[dialogueIndex].speaker}
                  </PixelText>
                  {dialogueQueue[dialogueIndex].grammarFocus && (
                    <div className="bg-[#306230] px-2 py-0.5 rounded flex items-center gap-2">
                      <Sparkles size={10} className="text-[#9bbc0f]" />
                      <span className="text-[9px] text-[#9bbc0f] font-bold uppercase tracking-widest">
                        Grammar Focus
                      </span>
                    </div>
                  )}
                </div>
                
                <p className="text-[#9bbc0f] text-lg leading-relaxed mb-4">
                  {dialogueQueue[dialogueIndex].text}
                </p>

                {dialogueQueue[dialogueIndex].grammarFocus && (
                  <div className="text-[10px] text-[#8bac0f] border-t border-[#306230] pt-2 italic">
                    {dialogueQueue[dialogueIndex].grammarFocus}
                  </div>
                )}

                <motion.div 
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="absolute bottom-4 right-4 text-[#9bbc0f]"
                >
                  <ChevronRight size={24} />
                </motion.div>
                
                <div className="absolute -top-3 left-6 bg-[#306230] px-2 py-0.5 rounded text-[8px] text-[#9bbc0f]">
                  PRESS SPACE OR CLICK TO CONTINUE
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="absolute bottom-8 left-0 w-full px-8 flex justify-between items-end z-50 md:hidden pointer-events-none">
        {/* D-Pad */}
        <div className="relative w-32 h-32 pointer-events-auto opacity-70">
          <button 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-zinc-800 rounded-t-xl border-2 border-zinc-600 flex items-center justify-center active:bg-zinc-600"
            onClick={() => movePlayer(0, -1, 'up')}
          >
            <ArrowUp size={24} className="text-white" />
          </button>
          <button 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-zinc-800 rounded-b-xl border-2 border-zinc-600 flex items-center justify-center active:bg-zinc-600"
            onClick={() => movePlayer(0, 1, 'down')}
          >
            <ArrowDown size={24} className="text-white" />
          </button>
          <button 
            className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-zinc-800 rounded-l-xl border-2 border-zinc-600 flex items-center justify-center active:bg-zinc-600"
            onClick={() => movePlayer(-1, 0, 'left')}
          >
            <ArrowLeft size={24} className="text-white" />
          </button>
          <button 
            className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-zinc-800 rounded-r-xl border-2 border-zinc-600 flex items-center justify-center active:bg-zinc-600"
            onClick={() => movePlayer(1, 0, 'right')}
          >
            <ArrowRight size={24} className="text-white" />
          </button>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-zinc-800 border-2 border-zinc-600" />
        </div>

        {/* Action Button */}
        <div className="flex gap-4 pointer-events-auto opacity-80 mb-4">
          <button 
            className="w-16 h-16 bg-red-600 rounded-full border-4 border-red-800 flex items-center justify-center active:bg-red-500 shadow-lg"
            onClick={() => {
              if (gameState === 'EXPLORE') handleInteract();
              else if (gameState === 'DIALOGUE') handleNextDialogue();
            }}
          >
            <span className="text-white font-bold text-2xl font-pokemon">A</span>
          </button>
        </div>
      </div>

      {/* Controls Hint */}
      <div className="absolute bottom-4 left-4 text-[10px] text-zinc-500 font-mono hidden md:block">
        USE ARROW KEYS OR WASD TO MOVE • SPACE TO TALK
      </div>

      {/* Finish Screen */}
      <AnimatePresence>
        {gameState === 'FINISHED' && (
          <motion.div 
            key="finished"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center text-center p-8"
          >
            <h2 className="text-4xl font-bold text-[#9bbc0f] mb-4">VICTORY!</h2>
            <p className="text-zinc-400 max-w-md mb-8">
              You've mastered the basics of <span className="text-white">Will</span> and <span className="text-white">Going To</span>.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="bg-zinc-800 text-white px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform"
              >
                RESTART GAME
              </button>
              <button 
                onClick={() => setGameState('CREDITS')}
                className="bg-[#9bbc0f] text-black px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform"
              >
                VER CRÉDITOS
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Credits Screen */}
      <AnimatePresence>
        {gameState === 'CREDITS' && (
          <motion.div 
            key="credits"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center overflow-hidden"
          >
            <motion.div
              initial={{ y: '100vh' }}
              animate={{ y: '-100vh' }}
              transition={{ duration: 30, ease: "linear" }}
              className="text-center space-y-16"
            >
              <h2 className="text-4xl font-bold text-[#9bbc0f] mb-12">PARABÉNS!</h2>
              
              <div className="space-y-4">
                <p className="text-2xl text-white font-bold">DESENVOLVEDORES</p>
                <p className="text-xl text-zinc-400">Lucas</p>
                <p className="text-xl text-zinc-400">Eduardo</p>
                <p className="text-xl text-zinc-400">Giovanni</p>
                <p className="text-xl text-zinc-400">Julia</p>
                <p className="text-xl text-zinc-400">Mariana</p>
                <p className="text-xl text-zinc-400">Melissa</p>
              </div>

              <div className="pt-8">
                <p className="text-2xl text-[#9bbc0f] font-bold">TURMA</p>
                <p className="text-xl text-zinc-400">8º B</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 25, duration: 2 }}
              className="absolute bottom-12"
            >
              <button 
                onClick={() => window.location.reload()}
                className="bg-zinc-800 border-2 border-[#9bbc0f] text-white px-8 py-3 rounded-full font-bold hover:bg-[#9bbc0f] hover:text-black transition-colors"
              >
                RESTART GAME
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {gameState === 'LEVEL_EDITOR' && (
          <div className="fixed inset-0 bg-zinc-950 z-[100] flex flex-col md:flex-row text-white font-mono">
            {/* Left/Top: Canvas */}
            <div 
              className="flex-1 flex items-center justify-center bg-[#8bac0f] overflow-auto relative touch-none"
              onMouseDown={() => setIsPainting(true)}
              onMouseUp={() => setIsPainting(false)}
              onMouseLeave={() => setIsPainting(false)}
            >
               <div className="relative transform scale-[0.4] md:scale-[0.6] origin-center" style={{ width: mapData[0].length * TILE_SIZE, height: mapData.length * TILE_SIZE }}>
                  <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${mapData[0].length}, 1fr)`, gridTemplateRows: `repeat(${mapData.length}, 1fr)` }}>
                    {mapData.flatMap((row, y) => row.map((tile, x) => (
                      <div 
                        key={`editor-${x}-${y}`} 
                        className="relative border border-black/10 hover:border-white/50 cursor-crosshair"
                        onMouseDown={() => handlePaint(x, y)}
                        onMouseEnter={() => isPainting && handlePaint(x, y)}
                        onTouchStart={() => handlePaint(x, y)}
                        onTouchMove={(e) => {
                          const touch = e.touches[0];
                          const element = document.elementFromPoint(touch.clientX, touch.clientY);
                          if (element && element.getAttribute('data-x')) {
                            const tx = parseInt(element.getAttribute('data-x')!);
                            const ty = parseInt(element.getAttribute('data-y')!);
                            handlePaint(tx, ty);
                          }
                        }}
                        data-x={x}
                        data-y={y}
                      >
                        <Tile data={tile} x={x} y={y} mapData={mapData} />
                        {tile.hasBattle && <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
                      </div>
                    )))}
                  </div>
               </div>
            </div>
            {/* Right/Bottom: Tools */}
            <div className="w-full md:w-80 h-[45vh] md:h-full bg-zinc-900 border-t md:border-l md:border-t-0 border-zinc-700 p-4 md:p-6 flex flex-col gap-4 overflow-y-auto">
               <div className="flex justify-between items-center">
                 <h2 className="text-lg md:text-xl text-[#9bbc0f] font-bold">Level Editor</h2>
                 <button onClick={() => setGameState('EXPLORE')} className="md:hidden text-zinc-500">✕</button>
               </div>
               
               {/* Palette */}
               <div>
                 <h3 className="mb-2 text-xs md:text-sm text-zinc-400">Tiles <span className="text-[10px] text-zinc-500">(Select & tap map)</span></h3>
                 <div className="grid grid-cols-5 md:grid-cols-3 gap-2">
                   {[
                     { id: 0, name: 'Grass' },
                     { id: 1, name: 'Tree' },
                     { id: 2, name: 'Rock' },
                     { id: 3, name: 'Tall Grass' },
                     { id: 4, name: 'Water' },
                     { id: 5, name: 'City' },
                     { id: 7, name: 'Sign' },
                     { id: 8, name: 'Pokeball' },
                     { id: 9, name: 'Path' },
                     { id: 10, name: 'Casa' },
                     { id: 11, name: 'Ginásio' },
                     { id: 12, name: 'Lab' },
                     { id: 13, name: 'Centro' },
                     { id: 14, name: 'Mart' },
                     { id: 15, name: 'Arbusto' },
                     { id: 16, name: 'Bloqueio' },
                     { id: 17, name: 'Pokémon Fight' },
                     { id: 18, name: 'Lab Pereira' }
                   ].map(t => (
                     <button 
                       key={t.id} 
                       onClick={() => setEditorBrush({...editorBrush, type: t.id})}
                       className={`p-1 md:p-2 border-2 text-[8px] md:text-[10px] rounded flex flex-col items-center justify-center h-10 md:h-12 ${editorBrush.type === t.id ? 'border-[#9bbc0f] bg-zinc-800 text-[#9bbc0f]' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                     >
                       {t.name}
                     </button>
                   ))}
                 </div>
               </div>

               {/* Properties */}
               <div className="bg-zinc-800/50 p-3 md:p-4 rounded-xl border border-zinc-700">
                 <h3 className="mb-2 md:mb-3 text-xs md:text-sm text-[#9bbc0f] font-bold">Properties</h3>
                 
                 <label className="flex items-center gap-3 mb-2 md:mb-4 cursor-pointer">
                   <input 
                     type="checkbox" 
                     checked={editorBrush.hasBattle} 
                     onChange={e => setEditorBrush({...editorBrush, hasBattle: e.target.checked})}
                     className="w-4 h-4 accent-[#9bbc0f]"
                   />
                   <span className="text-xs md:text-sm">Triggers Battle</span>
                 </label>

                 {editorBrush.type === 7 && (
                   <div className="space-y-1 md:space-y-2">
                     <label className="text-[10px] md:text-xs text-zinc-400">Sign Text:</label>
                     <input 
                       type="text" 
                       placeholder="Enter sign text..." 
                       value={editorBrush.text || ''} 
                       onChange={e => setEditorBrush({...editorBrush, text: e.target.value})} 
                       className="w-full bg-zinc-900 border border-zinc-700 p-2 text-xs md:text-sm rounded focus:outline-none focus:border-[#9bbc0f]" 
                     />
                   </div>
                 )}

                 {editorBrush.type === 17 && (
                   <div className="space-y-1 md:space-y-2">
                     <label className="text-[10px] md:text-xs text-zinc-400">Select Pokémon:</label>
                     <input 
                       type="text" 
                       placeholder="Search Pokémon..." 
                       value={pokemonSearch} 
                       onChange={e => setPokemonSearch(e.target.value)} 
                       className="w-full bg-zinc-900 border border-zinc-700 p-2 text-xs md:text-sm rounded focus:outline-none focus:border-[#9bbc0f] mb-2" 
                     />
                     <select 
                       value={editorBrush.pokemonName || ''} 
                       onChange={e => setEditorBrush({...editorBrush, pokemonName: e.target.value})}
                       className="w-full bg-zinc-900 border border-zinc-700 p-2 text-xs md:text-sm rounded focus:outline-none focus:border-[#9bbc0f]"
                     >
                       <option value="">Select a Pokémon</option>
                       {pokemonList
                         .filter(p => p.name.includes(pokemonSearch.toLowerCase()))
                         .slice(0, 50)
                         .map((p, idx) => (
                           <option key={`${p.name}-${idx}`} value={p.name}>{p.name}</option>
                         ))
                       }
                     </select>
                   </div>
                 )}
               </div>

               {/* Actions */}
               <div className="mt-auto flex flex-col gap-2 md:gap-3 pt-4 border-t border-zinc-800">
                 <div className="flex gap-2">
                   <button onClick={exportLevel} className="flex-1 bg-zinc-800 border border-zinc-600 text-white p-2 md:p-3 rounded-xl text-xs md:text-sm hover:bg-zinc-700 transition-colors">
                     Export
                   </button>
                   <button onClick={importLevel} className="flex-1 bg-zinc-800 border border-zinc-600 text-white p-2 md:p-3 rounded-xl text-xs md:text-sm hover:bg-zinc-700 transition-colors">
                     Import
                   </button>
                 </div>
                 <div className="grid grid-cols-2 gap-2 mt-1 md:mt-2">
                   <button 
                     onClick={() => { 
                       setPlayerPos({x: 7, y: 14}); 
                       setCurrentLevel(1); 
                       setGameState('EXPLORE'); 
                     }} 
                     className="bg-[#9bbc0f] text-black p-2 md:p-3 rounded-xl font-bold hover:bg-[#8bac0f] transition-colors text-sm"
                   >
                     PLAY LEVEL
                   </button>
                   <button 
                     onClick={() => { 
                       setPlayerPos({x: 7, y: 1}); 
                       setCurrentLevel(5); 
                       setMapData(LEVEL_5_MAP_DATA);
                       setGameState('EXPLORE'); 
                     }} 
                     className="bg-blue-600 text-white p-2 md:p-3 rounded-xl font-bold hover:bg-blue-500 transition-colors text-sm"
                   >
                     SKIP TO CITY
                   </button>
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* Battle Choice UI */}
      <AnimatePresence>
        {gameState === 'FINAL_BATTLE_CHOICE' && (
          <motion.div 
            key="final-battle-choice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/95 flex flex-col items-center justify-center z-[100] pointer-events-auto p-8"
          >
            <div className="max-w-4xl w-full">
              <PixelText className="text-white block text-center mb-4 text-xl md:text-2xl">CHOOSE YOUR TEAM OF 3!</PixelText>
              <PixelText className="text-zinc-500 block text-center mb-8 text-sm uppercase tracking-widest">Selected: {selectedTeam.length}/3</PixelText>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-8 max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
                {ownedPokemon.map((name, idx) => {
                  const isSelected = selectedTeam.includes(name);
                  return (
                    <button 
                      key={`${name}-${idx}`}
                      onClick={() => toggleTeamMember(name)}
                      className={`group flex flex-col items-center p-6 bg-zinc-900 rounded-2xl border-4 transition-all shadow-xl ${
                        isSelected ? 'border-[#9bbc0f] bg-zinc-800' : 'border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <img 
                        src={pokemonCache[name.toLowerCase()]?.sprite || SPRITES[name.toLowerCase() as keyof typeof SPRITES] || SPRITES.eevee} 
                        alt={name} 
                        className={`w-24 h-24 md:w-32 md:h-32 object-contain transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`} 
                        style={{ imageRendering: 'pixelated' }}
                        referrerPolicy="no-referrer"
                      />
                      <PixelText className={`${isSelected ? 'text-[#9bbc0f]' : 'text-zinc-400'} text-sm md:text-base mt-4`}>{name}</PixelText>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  disabled={selectedTeam.length === 0}
                  onClick={confirmFinalBattle}
                  className={`px-12 py-4 rounded-xl border-4 transition-all flex items-center gap-4 ${
                    selectedTeam.length > 0 
                      ? 'bg-[#9bbc0f] border-[#8bac0f] text-[#0f380f] hover:scale-105 active:scale-95' 
                      : 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <PixelText className="text-lg">START FINAL BATTLE</PixelText>
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'BATTLE_CHOICE' && (
          <motion.div 
            key="battle-choice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/95 flex flex-col items-center justify-center z-[100] pointer-events-auto p-8"
          >
            <div className="max-w-4xl w-full">
              <PixelText className="text-white block text-center mb-8 text-xl md:text-2xl">Choose a Pokémon to fight!</PixelText>
              {isStartingBattle ? (
                <div className="flex justify-center items-center h-32">
                  <PixelText className="text-[#9bbc0f] animate-pulse text-xl">Loading Pokémon Data...</PixelText>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-8">
                  {ownedPokemon.map((name, idx) => (
                    <button 
                      key={`${name}-${idx}`}
                      onClick={() => confirmBattle(pendingOpponent || 'Charmander', name)}
                      className="group flex flex-col items-center p-6 bg-zinc-900 rounded-2xl border-4 border-zinc-800 hover:border-[#9bbc0f] hover:bg-zinc-800 transition-all shadow-xl"
                    >
                      <img 
                        src={pokemonCache[name.toLowerCase()]?.sprite || SPRITES[name.toLowerCase() as keyof typeof SPRITES] || SPRITES.eevee} 
                        alt={name} 
                        className="w-24 h-24 md:w-32 md:h-32 object-contain group-hover:scale-110 transition-transform" 
                        style={{ imageRendering: 'pixelated' }}
                        referrerPolicy="no-referrer"
                      />
                      <PixelText className="text-[#9bbc0f] text-sm md:text-base mt-4">{name}</PixelText>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pokemon Choice UI */}
      <AnimatePresence>
        {gameState === 'POKEMON_CHOICE' && (
          <motion.div 
            key="pokemon-choice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/95 flex flex-col items-center justify-center z-[100] pointer-events-auto p-8"
          >
            <div className="max-w-4xl w-full">
              <PixelText className="text-white block text-center mb-8 text-xl md:text-2xl">Choose your first Pokémon!</PixelText>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8">
                {starterPokemon.map((p, idx) => (
                  <button 
                    key={`${p.name}-${idx}`}
                    onClick={() => selectPokemon(p.name)}
                    className="group flex flex-col items-center p-6 bg-zinc-900 rounded-2xl border-4 border-zinc-800 hover:border-[#9bbc0f] hover:bg-zinc-800 transition-all shadow-xl"
                  >
                    <img 
                      src={p.sprite} 
                      alt={p.name} 
                      className="w-24 h-24 md:w-32 md:h-32 object-contain group-hover:scale-110 transition-transform" 
                      style={{ imageRendering: 'pixelated' }}
                      referrerPolicy="no-referrer"
                    />
                    <PixelText className="text-[#9bbc0f] text-sm md:text-base mt-4">{p.name}</PixelText>
                    <span className="text-xs text-zinc-500 mt-2 uppercase tracking-widest">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm pointer-events-auto"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-zinc-900 border-4 border-zinc-700 p-8 rounded-3xl max-w-md w-full shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <PixelText className="text-white text-lg">System Settings</PixelText>
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="text-zinc-500 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase mb-2 font-bold">Custom API Key</p>
                    <input
                      type="password"
                      value={customApiKey}
                      onChange={(e) => {
                        setCustomApiKey(e.target.value);
                        localStorage.setItem('customApiKey', e.target.value);
                      }}
                      placeholder="Enter your Gemini API Key"
                      className="w-full bg-zinc-800 border border-zinc-700 p-3 text-sm text-white rounded-xl focus:outline-none focus:border-[#9bbc0f]"
                    />
                  </div>

                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase mb-2 font-bold">API Key Rotation</p>
                    <div className="grid grid-cols-4 gap-2">
                      {activeApiKeys.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setApiKeyIndex(idx)}
                          className={`p-2 text-[10px] rounded-lg border-2 transition-all ${
                            apiKeyIndex === idx 
                              ? 'bg-[#9bbc0f]/20 border-[#9bbc0f] text-[#9bbc0f]' 
                              : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500'
                          }`}
                        >
                          Key {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      The game automatically rotates keys if one fails. You can manually select a key above if you encounter persistent errors.
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase mb-2 font-bold">Skip Routes</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { name: 'Route 1', level: 2, map: LEVEL_2_MAP_DATA },
                        { name: 'Route 2', level: 3, map: LEVEL_3_MAP_DATA },
                        { name: 'Route 3', level: 4, map: LEVEL_4_MAP_DATA }
                      ].map((route) => (
                        <button
                          key={route.name}
                          onClick={() => {
                            setCurrentLevel(route.level);
                            setMapData(route.map);
                            setPlayerPos({ x: 7, y: 0 });
                            setFriendPos({ x: 7, y: -1 });
                            if (ownedPokemon.length === 0) {
                              setOwnedPokemon(['Eevee']);
                              setSelectedPokemon('Eevee');
                            }
                            setIsSettingsOpen(false);
                          }}
                          className="p-2 text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-lg hover:border-[#9bbc0f] hover:text-[#9bbc0f] transition-all"
                        >
                          {route.name}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setPlayerPos({x: 7, y: 1}); 
                          setCurrentLevel(5); 
                          setMapData(LEVEL_5_MAP_DATA);
                          setGameState('EXPLORE');
                          setOwnedPokemon(prev => {
                            const newTeam = ['Eevee', 'Bulbasaur', 'Charmander', 'Squirtle', 'Missingno'];
                            return Array.from(new Set([...prev, ...newTeam]));
                          });
                          setSelectedPokemon(prev => prev || 'Eevee');
                          setIsSettingsOpen(false);
                        }}
                        className="p-2 text-[10px] bg-blue-900/50 border border-blue-700 text-blue-400 rounded-lg hover:border-blue-400 hover:text-blue-300 transition-all font-bold"
                      >
                        CITY
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setGameState('LEVEL_EDITOR');
                    }}
                    className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-500 transition-colors"
                  >
                    OPEN LEVEL EDITOR
                  </button>

                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="w-full py-3 bg-[#9bbc0f] text-zinc-950 rounded-xl font-bold hover:bg-[#8bac0f] transition-colors"
                  >
                    SAVE & CLOSE
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showApiKeyPrompt && (
            <motion.div 
              key="apikey-prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm pointer-events-auto"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-zinc-900 border-4 border-zinc-700 p-8 rounded-3xl max-w-md w-full shadow-2xl"
              >
                <div className="mb-6">
                  <PixelText className="text-white text-xl mb-2 block">API Key Required</PixelText>
                  <p className="text-sm text-zinc-400">
                    No Gemini API key was detected in the environment. Please provide your own API key to play the game.
                  </p>
                </div>

                <div className="space-y-4">
                  <input
                    type="password"
                    value={customApiKey}
                    onChange={(e) => {
                      setCustomApiKey(e.target.value);
                      localStorage.setItem('customApiKey', e.target.value);
                    }}
                    placeholder="Enter your Gemini API Key"
                    className="w-full bg-zinc-800 border border-zinc-700 p-4 text-white rounded-xl focus:outline-none focus:border-[#9bbc0f] font-mono text-sm"
                  />
                  
                  <button 
                    onClick={() => {
                      if (customApiKey.trim()) {
                        setShowApiKeyPrompt(false);
                      }
                    }}
                    disabled={!customApiKey.trim()}
                    className="w-full py-4 bg-[#9bbc0f] text-zinc-950 rounded-xl font-bold hover:bg-[#8bac0f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    START GAME
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}
