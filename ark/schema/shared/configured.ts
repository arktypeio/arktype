// what configure() holds and compares of the config it's passed, shared by
// arktype and the runtime a precompiled program configures

const isPlain = (value: object): boolean => {
	const proto = Object.getPrototypeOf(value)
	return proto === Object.prototype || proto === null
}

const copyPlain = (value: unknown): unknown =>
	typeof value !== "object" || value === null ? value
	: Array.isArray(value) ? value.map(copyPlain)
	: isPlain(value) ?
		Object.fromEntries(Object.entries(value).map(([k, v]) => [k, copyPlain(v)]))
	:	value

/**
 * configure()'s argument, copied through its objects and arrays so writing
 * to what was passed after the call, like a keyword's description, changes
 * nothing, as it can't once a Type exists. A locale is kept as passed, as
 * arktype reads one by identity, and so is any other instance, like a Date
 */
export const copyConfig = <config extends object>(config: config): config => {
	const copy: Record<string, unknown> = {}
	for (const k in config) {
		const v = config[k]
		copy[k] = k === "locale" ? v : copyPlain(v)
	}
	return copy as never
}

/**
 * whether a config changes nothing of what's applied, as when a test runner
 * resets its modules and the config module runs again. That creates each
 * function it declares anew, so a function is the same where its source is,
 * unless it's native, like a bound one, whose source is the same for any
 */
export const isSameConfig = (l: unknown, r: unknown): boolean => {
	if (l === r) return true
	if (typeof l === "function" && typeof r === "function") {
		const source = Function.prototype.toString.call(l)
		return (
			source === Function.prototype.toString.call(r) &&
			!/\[native code]\s*}$/.test(source)
		)
	}
	if (typeof l !== "object" || typeof r !== "object" || !l || !r) return false
	const entries = Object.entries(l)
	return (
		entries.length === Object.keys(r).length &&
		entries.every(
			([k, v]) =>
				Object.prototype.hasOwnProperty.call(r, k) &&
				isSameConfig(v, (r as Record<string, unknown>)[k])
		)
	)
}
