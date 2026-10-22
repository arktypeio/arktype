// a test enables this to write to an object a site reads before the site runs
export const tweaks = { enabled: false }

export const tweak = (range: { min: number }) => {
	if (tweaks.enabled) range.min = 2
}
