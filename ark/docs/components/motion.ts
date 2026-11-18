export const reducedMotion = (): boolean =>
	matchMedia("(prefers-reduced-motion: reduce)").matches

export const sleep = (ms: number): Promise<unknown> =>
	new Promise(resolve => setTimeout(resolve, ms))
