export const getWhatsAppLink = (phoneNumber: string): string => {
  if (!phoneNumber) return '#';
  
  // Remove all non-numeric characters
  let cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // Convert 05X... to 9725X...
  if (cleanNumber.startsWith('0')) {
    cleanNumber = '972' + cleanNumber.substring(1);
  } else if (!cleanNumber.startsWith('972')) {
    // If it's just a raw number without 0 or 972, assume Israel prefix
    cleanNumber = '972' + cleanNumber;
  }
  
  return `https://wa.me/${cleanNumber}`;
};

export const isMammashRole = (role?: string): boolean => {
  if (!role) return false;
  // Remove all quotes/ticks to catch variations like ממ"ש, ממ״ש, מ"מש, ממש
  return role.replace(/["'״]/g, '').includes('ממש');
};

export const formatRole = (role: string, gender?: 'זכר' | 'נקבה'): string => {
  if (!role) return '';
  if (gender !== 'נקבה') return role;

  // Exact matches
  const exactMatches: Record<string, string> = {
    'צוער': 'צוערת',
    'מה"מ': 'מה"מית',
    'קמב"צ': 'קמב"צית',
    'קל"ג': 'קל"גית',
    'קח"ן': 'קח"נית',
    'קה"ד': 'קה"דית',
    'קד"ת': 'קד"תית',
    'קא"ג': 'קא"גית',
    'ק\' נשק': 'קצינת נשק',
    'ק\' הגנ"ש': 'קצינת הגנ"ש'
  };

  if (exactMatches[role]) {
    return exactMatches[role];
  }

  // Partial match replacements
  let formatted = role;
  formatted = formatted.replace('קל"ג התנדבויות', 'קל"גית התנדבויות');
  formatted = formatted.replace('מפקדת האקתון', 'מפקדת האקתון'); // Already female
  
  if (isMammashRole(formatted)) {
    // If it contains some variation of Mammash, we can blindly replace "ממ\"ש" if it exists,
    // or just the clean version. For display, we replace ממ"ש if typed exactly.
    formatted = formatted.replace('ממ"ש', 'ממ"שית').replace('ממש', 'ממ"שית');
  }
  
  // If it starts with "א' " (Achrai) -> "אחראית"
  if (formatted.startsWith("א' ")) {
    formatted = formatted.replace("א' ", "אחראית ");
  }

  return formatted;
};

