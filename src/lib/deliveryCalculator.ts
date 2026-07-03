/**
 * OOU Ago-Iwoye Campus Delivery Fee Calculator
 * Research-driven location matching system based on OOU Main Campus layout.
 */

export type OouZone = 'OOU_MAIN_CAMPUS' | 'ITAMERIN' | 'AGO_MARKET' | 'ORU' | 'MINI_CAMPUS' | 'UNKNOWN';

export const OOU_ZONE_NAMES: Record<OouZone, string> = {
  OOU_MAIN_CAMPUS: 'OOU Main Campus (Permanent Site)',
  ITAMERIN: 'Itamerin Area',
  AGO_MARKET: 'Ago Market / Town Center',
  ORU: 'Oru Junction / Town',
  MINI_CAMPUS: 'Mini Campus / Ibefun',
  UNKNOWN: 'Other (Standard Rate)'
};

/**
 * Parses user text description for OOU campus location keywords
 */
export function parseLocationZone(addressText: string): OouZone {
  if (!addressText) return 'UNKNOWN';
  
  const text = addressText.toLowerCase();
  
  // OOU Main Campus / Permanent Site keywords
  if (
    text.includes('main campus') ||
    text.includes('permanent site') ||
    /\b(?:ps|sms)\b/.test(text) ||
    text.includes('senate') ||
    text.includes('science class') ||
    text.includes('science faculty') ||
    text.includes('faculty of science') ||
    text.includes('law faculty') ||
    text.includes('faculty of law') ||
    text.includes('social science') ||
    text.includes('oou library') ||
    text.includes('library') ||
    text.includes('health science') ||
    text.includes('oou clinic')
  ) {
    return 'OOU_MAIN_CAMPUS';
  }
  
  // Itamerin Area keywords
  if (
    text.includes('itamerin') ||
    text.includes('itamerin road') ||
    text.includes('itamerin junction') ||
    text.includes('itamerin gate') ||
    text.includes('itsmerin') ||
    text.includes('ismerin')
  ) {
    return 'ITAMERIN';
  }
  
  // Ago Market / Town Center keywords
  if (
    text.includes('market') ||
    text.includes('ago market') ||
    text.includes('ago town') ||
    text.includes('town center') ||
    text.includes('garage') ||
    text.includes('ago garage') ||
    text.includes('palace') ||
    /\boba\b/.test(text) ||
    text.includes('post office') ||
    text.includes('roundabout')
  ) {
    return 'AGO_MARKET';
  }
  
  // Oru town / junction keywords
  if (
    text.includes('oru') ||
    text.includes('oru junction') ||
    text.includes('oru road') ||
    text.includes('oru town') ||
    text.includes('refugee camp') ||
    text.includes('oru camp')
  ) {
    return 'ORU';
  }
  
  // Mini Campus / Ibefun keywords
  if (
    text.includes('mini campus') ||
    text.includes('mini-campus') ||
    text.includes('ibefun') ||
    text.includes('mini campus road') ||
    text.includes('old campus')
  ) {
    return 'MINI_CAMPUS';
  }
  
  return 'UNKNOWN';
}

/**
 * Calculates delivery fee dynamically between a store location and customer address
 */
export function calculateDeliveryFee(bizLocation: string, custAddress: string): number {
  const bizZone = parseLocationZone(bizLocation);
  const custZone = parseLocationZone(custAddress);
  
  // Same zone pricing (extremely cheap OOU campus rates)
  if (bizZone === custZone && bizZone !== 'UNKNOWN') {
    return 300;
  }
  
  // Distance-matrix based delivery fee pairings
  const pairings: Record<string, number> = {
    // Main Campus pairings
    'OOU_MAIN_CAMPUS-ITAMERIN': 500,
    'ITAMERIN-OOU_MAIN_CAMPUS': 500,
    
    'OOU_MAIN_CAMPUS-AGO_MARKET': 700,
    'AGO_MARKET-OOU_MAIN_CAMPUS': 700,
    
    'OOU_MAIN_CAMPUS-MINI_CAMPUS': 700,
    'MINI_CAMPUS-OOU_MAIN_CAMPUS': 700,
    
    'OOU_MAIN_CAMPUS-ORU': 800,
    'ORU-OOU_MAIN_CAMPUS': 800,
    
    // Itamerin pairings
    'ITAMERIN-AGO_MARKET': 500, // Ago Market to Itamerin ₦500
    'AGO_MARKET-ITAMERIN': 500, // Ago Market to Itamerin ₦500
    
    'ITAMERIN-ORU': 700,
    'ORU-ITAMERIN': 700,
    
    'ITAMERIN-MINI_CAMPUS': 600,
    'MINI_CAMPUS-ITAMERIN': 600,
    
    // Ago Market pairings
    'AGO_MARKET-ORU': 500,
    'ORU-AGO_MARKET': 500,
    
    'AGO_MARKET-MINI_CAMPUS': 500,
    'MINI_CAMPUS-AGO_MARKET': 500,
    
    // Mini Campus pairings
    'MINI_CAMPUS-ORU': 800,
    'ORU-MINI_CAMPUS': 800
  };
  
  const key = `${bizZone}-${custZone}`;
  if (pairings[key] !== undefined) {
    return pairings[key];
  }
  
  // Default fallback delivery fee if any is UNKNOWN
  return 1000;
}
