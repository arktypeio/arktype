import { and, json, leaf, member, scoped } from "./items.ts"

const throws = (f: () => unknown) => {
	try {
		f()
		return false
	} catch {
		return true
	}
}

// runs before items.ts's body, which imports this module after arktype
export const calledFirst = [
	throws(() => and()),
	throws(() => scoped()),
	throws(() => member()),
	throws(() => json()),
	throws(() => leaf())
]
