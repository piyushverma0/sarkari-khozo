import { useState, useEffect } from "react";

const PLACEHOLDER_EXAMPLES = [
  "SSC CGL 2025",
  "PM Kisan Yojana",
  "Startup India Seed Fund",
  "UPSC Prelims",
  "RRB NTPC 2025",
  "IBPS PO Exam",
  "Gujarat Startup Grant",
  "PM SVANidhi Scheme",
];

export const useRotatingPlaceholder = (interval: number = 3000) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % PLACEHOLDER_EXAMPLES.length);
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return `Enter exam, job, or scheme name… e.g., "${PLACEHOLDER_EXAMPLES[currentIndex]}"`;
};
