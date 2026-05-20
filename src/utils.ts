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
