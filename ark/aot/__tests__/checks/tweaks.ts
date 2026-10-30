import { range } from "./ranges.ts"

// a test enables this to write, where the build can't see, to an object a
// site reads before the site runs
export const tweaks = { enabled: false }

export const tweak = () => {
	if (tweaks.enabled) range.min = 2
}
