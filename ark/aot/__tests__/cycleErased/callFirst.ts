import { and } from "./items.ts"

const throws = (f: () => unknown) => {
	try {
		f()
		return false
	} catch {
		return true
	}
}

export const calledFirst = throws(() => and())
