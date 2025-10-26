/**
 * Formats a view count number into a human-readable string
 * Examples: 1234 -> "1.2K", 1000000 -> "1M", 500 -> "500"
 */
export const formatViewCount = (count: number): string => {
  if (count < 1000) {
    return count.toString();
  }
  
  if (count < 1000000) {
    const thousands = count / 1000;
    return `${thousands % 1 === 0 ? thousands : thousands.toFixed(1)}K`;
  }
  
  const millions = count / 1000000;
  return `${millions % 1 === 0 ? millions : millions.toFixed(1)}M`;
};