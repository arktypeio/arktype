import type { flatMorph as ArkFlatMorph } from "arktype/util"

// small pure helpers used by @ark/aot's entrypoints before checkArktypeVersion()
// runs, so an incompatible arktype (e.g. 2.x without arktype/util) fails with
// the version message rather than an unresolved subpath export

export const throwError: (message: string) => never = message => {
	throw new Error(message)
}

const fileErrors = new WeakSet<Error>()

export const isFileError = (e: unknown): e is Error =>
	e instanceof Error && fileErrors.has(e)

export const parseJsonText = (text: string, path: string): unknown => {
	try {
		return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)
	} catch (e) {
		const error = new Error(`${path} isn't JSON: ${(e as Error).message}`)
		fileErrors.add(error)
		throw error
	}
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
	flatMapEntry: (...args: any[]) => any
): any => {
	const result: any = {}
	const inputIsArray = Array.isArray(o)
	let outputShouldBeArray = false
	const entries = Object.entries(o)
	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i]
		const mapped =
			inputIsArray ?
				flatMapEntry(i, entry[1])
			:	flatMapEntry(entry[0], entry[1], i)
		outputShouldBeArray ||= typeof mapped[0] === "number"
		const flattenedEntries =
			Array.isArray(mapped[0]) || mapped.length === 0 ? mapped : [mapped]
		for (let j = 0; j < flattenedEntries.length; j++) {
			const k = flattenedEntries[j][0]
			const v = flattenedEntries[j][1]
			if (typeof k === "object") (result[k.group] ??= []).push(v)
			else result[k] = v
		}
	}
	return outputShouldBeArray ? Object.values(result) : result
}) as typeof ArkFlatMorph
