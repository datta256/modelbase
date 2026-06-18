/**
 * Category Data for Dynamic Route Generation
 * Contains all 2,410+ SEO category combinations
 */

export const BASE_CATEGORIES = [
  'architecture', 'furniture', 'vehicles', 'animals', 'characters', 'weapons',
  'nature', 'electronics', 'food', 'plants', 'rocks', 'trees', 'buildings',
  'houses', 'rooms', 'decor', 'props', 'tools', 'industrial', 'medical',
  'military', 'sports', 'toys', 'music', 'art', 'abstract', 'fantasy',
  'sci-fi', 'historical', 'urban', 'rural', 'space', 'underwater',
  'kitchen', 'bathroom', 'bedroom', 'living-room', 'office', 'garden',
  'street', 'park', 'beach', 'forest', 'desert', 'mountain', 'snow',
  'mechanical', 'organic', 'geometric', 'landscape'
] as const;

export const SOFTWARE_LIST = [
  'blender', 'unity', 'unreal-engine', 'maya', '3ds-max', 'cinema-4d',
  'godot', 'houdini', 'zbrush', 'sketchup', 'fusion-360', 'substance'
] as const;

export const FORMAT_LIST = ['glb', 'obj', 'gltf', 'fbx', 'stl'] as const;

export const USE_CASES = [
  'game-dev', '3d-printing', 'vr', 'ar', 'animation', 'visualization',
  'motion-graphics', 'archviz', 'product-design', 'film'
] as const;

export const STYLES = ['low-poly', 'realistic', 'cartoon', 'stylized', 'pbr', 'hand-painted'] as const;
export const ATTRIBUTES = ['rigged', 'animated', 'textured', 'game-ready', 'print-ready', 'free'] as const;

export interface CategoryInfo {
  slug: string;
  title: string;
  parts: string[];
}

export function generateAllCategorySlugs(): string[] {
  const combos = new Set<string>();
  
  // 1. Software + Category (600)
  for (const cat of BASE_CATEGORIES) {
    for (const soft of SOFTWARE_LIST) {
      combos.add(`${soft}-${cat}`);
    }
  }
  
  // 2. Format + Category (250)
  for (const cat of BASE_CATEGORIES) {
    for (const fmt of FORMAT_LIST) {
      combos.add(`${fmt}-${cat}`);
    }
  }
  
  // 3. Use Case + Category (500)
  for (const cat of BASE_CATEGORIES) {
    for (const use of USE_CASES) {
      combos.add(`${use}-${cat}`);
    }
  }
  
  // 4. Style + Category (300)
  for (const cat of BASE_CATEGORIES) {
    for (const style of STYLES) {
      combos.add(`${style}-${cat}`);
    }
  }
  
  // 5. Attribute + Category (300)
  for (const cat of BASE_CATEGORIES) {
    for (const attr of ATTRIBUTES) {
      combos.add(`${attr}-${cat}`);
    }
  }
  
  // 6. Free combos
  for (const cat of BASE_CATEGORIES) {
    combos.add(`free-${cat}`);
    combos.add(`free-download-${cat}`);
  }
  
  // 7. 3D combos
  for (const cat of BASE_CATEGORIES) {
    combos.add(`3d-${cat}`);
    combos.add(`3d-printing-${cat}`);
  }
  
  // 8. Triple combos (300)
  const topCategories = BASE_CATEGORIES.slice(0, 20);
  const topSoftware = SOFTWARE_LIST.slice(0, 5);
  const topStyles = STYLES.slice(0, 3);
  for (const cat of topCategories) {
    for (const soft of topSoftware) {
      for (const style of topStyles) {
        combos.add(`${soft}-${style}-${cat}`);
      }
    }
  }
  
  // 9. Software + Format (60)
  for (const soft of SOFTWARE_LIST) {
    for (const fmt of FORMAT_LIST) {
      combos.add(`${soft}-${fmt}`);
    }
  }
  
  return Array.from(combos).sort();
}

export function getCategoryInfo(slug: string): CategoryInfo {
  const parts = slug.split('-');
  const title = parts.map(p => 
    p.replace(/\b\w/g, l => l.toUpperCase())
  ).join(' ');
  
  return {
    slug,
    title,
    parts
  };
}

// Pre-computed for performance
export const ALL_CATEGORY_SLUGS = generateAllCategorySlugs();
export const TOTAL_CATEGORIES = ALL_CATEGORY_SLUGS.length;

export const CATEGORY_PAGE_SIZE = 12;

// Base category lookup set for fast matching
const BASE_CATEGORY_SET = new Set<string>(BASE_CATEGORIES);

/**
 * Extract the base category from a slug for database filtering.
 * E.g., "blender-architecture" → "architecture"
 * "blender-low-poly-characters" → "characters"
 * "blender-glb" → null (no base category)
 */
export function getBaseCategory(slug: string): string | null {
  const parts = slug.split('-');
  
  // Try matching progressively longer suffixes
  for (let i = 0; i < parts.length; i++) {
    const candidate = parts.slice(i).join('-');
    if (BASE_CATEGORY_SET.has(candidate)) {
      return candidate;
    }
  }
  
  return null;
}

/**
 * Get the database search pattern for a slug.
 * Maps our SEO slugs to actual DB category values.
 */
export function getCategorySearchPattern(slug: string): string | null {
  const base = getBaseCategory(slug);
  if (!base) return null;
  
  // Common DB category mappings
  const dbMappings: Record<string, string[]> = {
    'animals': ['animals-pets'],
    'architecture': ['architecture'],
    'art': ['art-abstract'],
    'characters': ['characters-creatures', 'people'],
    'electronics': ['electronics-gadgets', 'science-technology'],
    'food': ['food-drink'],
    'furniture': ['furniture-home'],
    'nature': ['nature-plants'],
    'plants': ['nature-plants'],
    'sports': ['sports-fitness'],
    'vehicles': ['cars-vehicles'],
    'weapons': ['weapons-military'],
    'medical': ['science-technology'],
    'industrial': ['science-technology'],
    'military': ['weapons-military'],
  };
  
  // Return mapped DB categories or just the base as a fallback
  return dbMappings[base]?.join('|') || base;
}

// Keywords for SEO
export function generateKeywords(info: CategoryInfo): string[] {
  return [
    ...info.parts,
    'free 3d models',
    '3d model download',
    '3d assets free',
    'download 3d models',
    `${info.title.toLowerCase()} 3d models`,
    'blender models',
    'unity assets',
    'game assets',
    '3d printing models'
  ];
}

// Description template
export function generateDescription(info: CategoryInfo): string {
  return `Download free ${info.title.toLowerCase()} 3D models for Blender, Unity, Unreal Engine, and more. High-quality GLB, OBJ, GLTF, FBX formats. Instant download, no registration required.`;
}

// Page title
export function generateTitle(info: CategoryInfo): string {
  return `${info.title} 3D Models | Free Download | ModelBase`;
}

export default {
  ALL_CATEGORY_SLUGS,
  TOTAL_CATEGORIES,
  CATEGORY_PAGE_SIZE,
  getCategoryInfo,
  generateKeywords,
  generateDescription,
  generateTitle
};
