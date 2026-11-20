import type { flatMorph as ArkFlatMorph } from "arktype/util"

// small pure helpers used by @ark/aot's entrypoints before checkArktypeVersion()
// runs, so an incompatible arktype (e.g. 2.x without arktype/util) fails with
// the version message rather than an unresolved subpath export

export const throwError: (message: string) => never = message => {
	throw new Error(message)
}

export const hasOwn = (o: object, k: PropertyKey): boolean =>
	Object.prototype.hasOwnProperty.call(o, k)

export const capitalize = (s: string): string =>
	s ? s[0].toUpperCase() + s.slice(1) : s

export const printable = (data: unknown): string =>
	typeof data === "string" ? JSON.stringify(data)
	: typeof data === "symbol" ? String(data)
	: data === undefined ? "undefined"
	: data === null ? "null"
	: typeof data === "bigint" ? `${data}n`
	: typeof data === "object" ? JSON.stringify(data)
	: String(data)

export const stringifyPath = (path: readonly PropertyKey[]): string => {
	let result = ""
	for (const segment of path) {
		if (typeof segment === "string" && /^[$A-Z_a-z][\w$]*$/.test(segment))
			result += result ? `.${segment}` : segment
		else
			result += `[${typeof segment === "string" ? JSON.stringify(segment) : String(segment)}]`
	}
	return result
}

export const editsBetween = (a: string, b: string): number => {
	if (Math.abs(a.length - b.length) > 2) return 3
	let twoBack: number[] = []
	let last = Array.from({ length: b.length + 1 }, (_, j) => j)
	for (let i = 1; i <= a.length; i++) {
		const row = [i]
		for (let j = 1; j <= b.length; j++) {
			row[j] = Math.min(
				last[j] + 1,
				row[j - 1] + 1,
				last[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
				i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] ?
					twoBack[j - 2] + 1
				:	3
			)
		}
		twoBack = last
		last = row
	}
	return Math.min(last[b.length], 3)
}

export const flatMorph: typeof ArkFlatMorph = ((
	o: object,
	cb: (k: any, v: any) => any
) => {
	if (Array.isArray(o)) {
		const result: unknown[] = []
		for (let i = 0; i < o.length; i++) {
			const mapped = cb(i, o[i])
			if (Array.isArray(mapped)) result.push(...mapped)
			else result.push(mapped)
		}
		return result
	}
	const result: Record<PropertyKey, unknown> = {}
	for (const k of Object.keys(o)) {
		const mapped = cb(k, (o as Record<string, unknown>)[k])
		if (!Array.isArray(mapped) || !mapped.length) continue
		if (Array.isArray(mapped[0]))
			for (const [mk, mv] of mapped as [PropertyKey, unknown][]) result[mk] = mv
		else {
			const [mk, mv] = mapped as [PropertyKey, unknown]
			result[mk] = mv
		}
	}
	return result
}) as typeof ArkFlatMorph
