// Format large numbers in Indian style
export function formatIndianNumber(num: number): string {
  if (num >= 10000000) return `${(num / 10000000).toFixed(1)} crore`;
  if (num >= 100000) return `${(num / 100000).toFixed(1)} lakh`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString('en-IN');
}

// Calculate competition ratio
export function calculateRatio(applicants: number, vacancies: number): string {
  if (!applicants || !vacancies || vacancies === 0) return "N/A";
  const ratio = Math.round(applicants / vacancies);
  return `${ratio.toLocaleString('en-IN')}:1`;
}

// Get competition level for badge styling
export function getCompetitionLevel(ratio: string): "low" | "medium" | "high" {
  if (ratio === "N/A") return "medium";
  const value = parseInt(ratio.split(':')[0].replace(/,/g, ''));
  if (value > 1000) return "high";
  if (value > 100) return "medium";
  return "low";
}

// Validate stats data
export function validateStats(stats: any): boolean {
  // Reasonable ranges
  if (stats.applicants_count) {
    if (stats.applicants_count < 10 || stats.applicants_count > 100000000) {
      return false;
    }
  }
  if (stats.vacancies) {
    if (stats.vacancies < 1 || stats.vacancies > 10000000) {
      return false;
    }
  }
  // Ratio sanity check
  if (stats.applicants_count && stats.vacancies) {
    const ratio = stats.applicants_count / stats.vacancies;
    if (ratio < 1 || ratio > 1000000) return false;
  }
  return true;
}

// Should display stats based on confidence
export function shouldDisplayStats(stats: any): boolean {
  if (!stats) return false;
  return stats.data_confidence === 'verified' || 
         (stats.confidence_score && stats.confidence_score > 0.7);
}

// Get confidence badge variant
export function getConfidenceBadgeVariant(confidence: string): "default" | "outline" | "secondary" {
  if (confidence === 'verified') return "default";
  if (confidence === 'estimated') return "outline";
  return "secondary";
}

// Get confidence label
export function getConfidenceLabel(confidence: string): string {
  if (confidence === 'verified') return "✓ Verified";
  if (confidence === 'estimated') return "≈ Estimated";
  return "👥 Community";
}
