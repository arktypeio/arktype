export const reducedMotion = (): boolean =>
	matchMedia("(prefers-reduced-motion: reduce)").matches
