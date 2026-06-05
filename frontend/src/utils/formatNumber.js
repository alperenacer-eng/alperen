// Türk formatında sayı gösterimi (binlik ayracı nokta, ondalık virgül)
// Örnek: 1234567.89 → "1.234.567,89"

export const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined || value === '') return '0';
  
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  
  // Türk formatı: binlik ayracı nokta, ondalık virgül
  return num.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

// Ondalıklı sayılar için (örn: para, kg)
export const formatDecimal = (value, decimals = 2) => {
  return formatNumber(value, decimals);
};

// Tam sayılar için (örn: adet, stok)
export const formatInteger = (value) => {
  return formatNumber(value, 0);
};

export default formatNumber;
