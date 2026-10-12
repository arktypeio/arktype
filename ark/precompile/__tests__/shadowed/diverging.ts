import { type } from "arktype"

const accepted = new WeakSet<object>()

// arktype calls it once for an object it accepts, so its validator sees the object again
export const Fresh = type("object").narrow(o => {
	if (accepted.has(o)) return false
	accepted.add(o)
	return true
})
