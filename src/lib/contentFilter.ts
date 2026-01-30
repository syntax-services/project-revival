// Strict content filter to prevent users from sharing social media handles
// This prevents platform migration and keeps communication within String

// Common social media patterns
const SOCIAL_PATTERNS = [
  // Instagram patterns
  /\b(?:ig|insta(?:gram)?|@)\s*[:=\-]?\s*[a-zA-Z0-9._]+\b/gi,
  /@[a-zA-Z0-9._]{3,30}/g, // Direct @ mentions
  
  // WhatsApp patterns
  /\b(?:whatsapp|wa|watsap|whats\s*app)\s*[:=\-]?\s*[\d+\s()-]+/gi,
  
  // Phone number patterns (Nigerian and international)
  /\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
  /\b0[789][01]\d{8}\b/g, // Nigerian mobile numbers
  /\b\d{10,14}\b/g, // Long number sequences
  
  // Email patterns
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  /\b(?:gmail|yahoo|hotmail|outlook)\s*[:=\-]?\s*[a-zA-Z0-9._%+-]+/gi,
  
  // Telegram patterns
  /\b(?:telegram|tg|t\.me)\s*[:=\-/]?\s*[a-zA-Z0-9_]+/gi,
  
  // Twitter/X patterns
  /\b(?:twitter|x\.com|@)\s*[:=\-/]?\s*[a-zA-Z0-9_]+/gi,
  
  // Facebook patterns
  /\b(?:facebook|fb|fb\.com|facebook\.com)\s*[:=\-/]?\s*[a-zA-Z0-9._]+/gi,
  
  // TikTok patterns
  /\b(?:tiktok|tik\s*tok)\s*[:=\-/]?\s*[a-zA-Z0-9._]+/gi,
  
  // Snapchat patterns
  /\b(?:snapchat|snap|sc)\s*[:=\-]?\s*[a-zA-Z0-9._]+/gi,
  
  // LinkedIn patterns
  /\b(?:linkedin|linked\s*in)\s*[:=\-/]?\s*[a-zA-Z0-9._-]+/gi,
  
  // YouTube patterns
  /\b(?:youtube|yt|youtube\.com)\s*[:=\-/]?\s*[a-zA-Z0-9._-]+/gi,
  
  // General social URL patterns
  /(?:https?:\/\/)?(?:www\.)?(?:instagram|twitter|facebook|tiktok|snapchat|linkedin|youtube|t\.me|wa\.me)[^\s]*/gi,
];

// Number word replacements (to catch pronunciation tricks)
const NUMBER_WORDS: Record<string, string[]> = {
  '0': ['zero', 'oh', 'o', 'nil', 'nought', 'ziro', 'zéro'],
  '1': ['one', 'won', 'wan', 'wun', 'uan', 'un'],
  '2': ['two', 'too', 'to', 'tu', 'tuu', 'due', 'doux'],
  '3': ['three', 'tree', 'tri', 'tré', 'thri', 'tre'],
  '4': ['four', 'for', 'fore', 'fo', 'foh', 'qua'],
  '5': ['five', 'fiv', 'faiv', 'cinq', 'fife'],
  '6': ['six', 'siks', 'sixx', 'sis', 'seex'],
  '7': ['seven', 'sevin', 'sevn', 'sept'],
  '8': ['eight', 'eit', 'ate', 'eigt', 'ait', 'huit'],
  '9': ['nine', 'nain', 'nin', 'neuf', 'nayn'],
};

// Build regex for number words
const NUMBER_WORD_PATTERNS: RegExp[] = [];
Object.entries(NUMBER_WORDS).forEach(([, words]) => {
  words.forEach(word => {
    NUMBER_WORD_PATTERNS.push(new RegExp(`\\b${word}\\b`, 'gi'));
  });
});

// Suspicious patterns that might indicate contact sharing
const SUSPICIOUS_PATTERNS = [
  // "Call me", "DM me", "Message me" patterns
  /\b(?:call|text|message|dm|pm|hit|reach|contact)\s*(?:me|us)?\s*(?:on|at|via|@|:)?\s*\d*/gi,
  
  // "My number is", "Add me on" patterns
  /\b(?:my|our)\s*(?:number|digits|contact|handle|username|account)\s*(?:is|are|:)?\s*/gi,
  /\b(?:add|follow|find)\s*(?:me|us)\s*(?:on|at|@)?\s*/gi,
  
  // Attempts to spell out numbers
  /\b(?:zero|one|two|three|four|five|six|seven|eight|nine)\s*[-,.\s]*(?:zero|one|two|three|four|five|six|seven|eight|nine)/gi,
];

export interface ContentFilterResult {
  isClean: boolean;
  violations: string[];
  sanitizedContent: string;
  confidence: number;
}

export function filterContent(content: string): ContentFilterResult {
  const violations: string[] = [];
  let sanitizedContent = content;
  let violationCount = 0;

  // Check social media patterns
  SOCIAL_PATTERNS.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        if (!violations.includes('Social media handle detected')) {
          violations.push('Social media handle detected');
        }
        violationCount++;
        sanitizedContent = sanitizedContent.replace(match, '[REMOVED]');
      });
    }
  });

  // Check for number word sequences (like "oh eight one...")
  let numberWordCount = 0;
  NUMBER_WORD_PATTERNS.forEach(pattern => {
    if (pattern.test(content)) {
      numberWordCount++;
    }
  });
  
  // If we see 4+ number words, it's likely a phone number in disguise
  if (numberWordCount >= 4) {
    violations.push('Potential phone number in words detected');
    violationCount += numberWordCount;
  }

  // Check suspicious patterns
  SUSPICIOUS_PATTERNS.forEach(pattern => {
    if (pattern.test(content)) {
      if (!violations.includes('Suspicious contact sharing attempt')) {
        violations.push('Suspicious contact sharing attempt');
      }
      violationCount++;
    }
  });

  // Calculate confidence (0-1) based on number of violations
  const confidence = Math.min(violationCount / 3, 1);

  return {
    isClean: violations.length === 0,
    violations,
    sanitizedContent,
    confidence,
  };
}

export function isContentSafe(content: string): boolean {
  return filterContent(content).isClean;
}

// Helper to check and get detailed report
export function getContentReport(content: string): {
  safe: boolean;
  message: string;
  details: string[];
} {
  const result = filterContent(content);
  
  if (result.isClean) {
    return {
      safe: true,
      message: 'Content is clean',
      details: [],
    };
  }

  return {
    safe: false,
    message: 'Content contains prohibited information',
    details: result.violations,
  };
}
