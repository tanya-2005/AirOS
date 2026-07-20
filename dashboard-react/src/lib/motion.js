// Shared Framer Motion variants so every page animates consistently
// (mirrors the source export's fadeUp keyframe + lift hover timing).

export const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 0.61, 0.36, 1] } },
};

export const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

export const liftHover = {
  rest: { y: 0, boxShadow: "0 0 0 rgba(20,22,24,0)" },
  hover: {
    y: -2,
    boxShadow: "0 14px 40px -22px rgba(20,22,24,.24)",
    transition: { duration: 0.28, ease: [0.22, 0.61, 0.36, 1] },
  },
};

export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 0.61, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};
