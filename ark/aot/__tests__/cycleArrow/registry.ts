import { aliased, and, json } from "./items.ts"

const throws = (f: () => unknown) => {
	try {
		f()
		return false
	} catch {
		return true
	}
}

export const register = () => [
	throws(() => and()),
	throws(() => json()),
	throws(() => aliased())
]
