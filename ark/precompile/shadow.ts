import { hasArkKind } from "@ark/schema"
import { printable, throwError } from "@ark/util"

type Outcome = { value: unknown } | { thrown: unknown }

const outcomeOf = (run: () => unknown): Outcome => {
	try {
		return { value: run() }
	} catch (e) {
		return { thrown: e }
	}
}

// a factory receives the validator where the program holds arktype's value
const precompiledByShadowed = new WeakMap<object, unknown>()

// e.g. `type(fields)` with `fields = { name: Name }`, whose factory reads `fields.name`
const precompiledOf = (value: unknown, seen: Map<object, unknown>): unknown => {
	if (typeof value !== "object" && typeof value !== "function") return value
	if (value === null) return value
	if (precompiledByShadowed.has(value)) return precompiledByShadowed.get(value)
	const proto = Object.getPrototypeOf(value)
	if (!Array.isArray(value) && proto !== Object.prototype && proto !== null)
		return value
	if (seen.has(value)) return seen.get(value)
	seen.set(value, value)
	const descriptors = Object.getOwnPropertyDescriptors(value)
	let isSwapped = false
	for (const k of Reflect.ownKeys(descriptors)) {
		const descriptor = descriptors[k as never] as PropertyDescriptor
		if (!("value" in descriptor)) continue
		const swapped = precompiledOf(descriptor.value, seen)
		if (swapped === descriptor.value) continue
		descriptor.value = swapped
		isSwapped = true
	}
	if (!isSwapped) return value
	const copy = Object.defineProperties(
		Array.isArray(value) ? [] : Object.create(proto),
		descriptors
	)
	seen.set(value, copy)
	return Object.isFrozen(value) ? Object.freeze(copy) : copy
}

// a site in shadow mode, which arktype and its factory create from the same holes, each evaluated once
export const shadow = (
	site: string,
	precompile: (...args: unknown[]) => unknown,
	define: (...args: unknown[]) => unknown,
	...args: unknown[]
): unknown => {
	const seen = new Map<object, unknown>()
	return shadowOf(
		site,
		() => define(...args),
		() => precompile(...args.map(arg => precompiledOf(arg, seen)))
	)
}

const shadowOf = (
	site: string,
	define: () => unknown,
	precompile: () => unknown
): unknown => {
	const original = outcomeOf(define)
	const precompiled = outcomeOf(precompile)
	compare(
		site,
		"creation",
		observeCreation(original),
		observeCreation(precompiled)
	)
	if ("thrown" in original) throw original.thrown
	const value = original.value
	const pair: Pair = {
		site,
		original: value,
		counterpart: (precompiled as { value: unknown }).value
	}
	if (hasArkKind(value, "root")) {
		compare(
			site,
			"creation",
			attributesOf(value),
			attributesOf(pair.counterpart)
		)
		return registerShadow(new Proxy(value, typeHandlerOf(pair)), pair)
	}
	if (hasArkKind(value, "module"))
		return registerShadow(new Proxy(value, moduleHandlerOf(pair)), pair)
	if (hasArkKind(value, "scope") || hasArkKind(value, "generic"))
		return registerShadow(value, pair)
	// e.g. a TypedFn, whose implementation arktype and its validator each call
	if (typeof value === "function") {
		return registerShadow(
			new Proxy(value, {
				apply: (_, self, args) =>
					validateBoth(pair, "call", args, false, (fn, args) =>
						Reflect.apply(fn, self, args as unknown[])
					)
			}),
			pair
		)
	}
	compare(site, "creation", { value }, { value: pair.counterpart })
	return value
}

interface Pair {
	site: string
	original: any
	counterpart: any
}

const registerShadow = <value extends object>(
	shadowed: value,
	pair: Pair
): value => {
	precompiledByShadowed.set(shadowed, pair.counterpart)
	return shadowed
}

const observeCreation = (outcome: Outcome) =>
	"thrown" in outcome ? { threw: String(outcome.thrown) } : { created: true }

const attributesOf = (t: any) => ({
	expression: t.expression,
	description: t.description,
	meta: t.meta
})

const validatedMembers = ["allows", "assert", "traverse", "from"]

const introspectedMembers = ["toJSON", "toJsonSchema"]

const typeHandlerOf = (pair: Pair): ProxyHandler<any> => {
	const membersByKey: Record<PropertyKey, unknown> = {}
	const isWritten: boolean = pair.original.transforms
	return {
		apply: (target, self, args) =>
			args.length === 1 ?
				validateBoth(pair, "call", args[0], isWritten, (t, data) => t(data))
			:	Reflect.apply(target, self, args),
		get: (target, k) => {
			if (k in membersByKey) return membersByKey[k]
			if (validatedMembers.includes(k as never)) {
				return (membersByKey[k] = (data: unknown) =>
					validateBoth(pair, k as string, data, isWritten, (t, data) =>
						t[k](data)
					))
			}
			if (introspectedMembers.includes(k as never)) {
				return (membersByKey[k] = (...args: unknown[]) =>
					introspectBoth(pair, `${k as string}()`, t => t[k](...args)))
			}
			if (k === "json") return introspectBoth(pair, "json", t => t.json)
			if (k !== "~standard") return Reflect.get(target, k)
			const read = (t: any) => t["~standard"]
			return (membersByKey[k] = {
				...read(target),
				validate: (data: unknown) =>
					validateBoth(pair, "~standard.validate", data, isWritten, (t, data) =>
						read(t).validate(data)
					),
				jsonSchema: {
					input: (opts: unknown) =>
						introspectBoth(pair, "~standard.jsonSchema.input()", t =>
							read(t).jsonSchema.input(opts)
						),
					output: (opts: unknown) =>
						introspectBoth(pair, "~standard.jsonSchema.output()", t =>
							read(t).jsonSchema.output(opts)
						)
				}
			})
		}
	}
}

const moduleHandlerOf = (pair: Pair): ProxyHandler<any> => {
	const membersByKey: Record<PropertyKey, unknown> = {}
	return {
		get: (target, k) => {
			if (k in membersByKey) return membersByKey[k]
			const value = Reflect.get(target, k)
			if (!hasArkKind(value, "root") && !hasArkKind(value, "module"))
				return value
			return (membersByKey[k] = shadowOf(
				`${pair.site}.${String(k)}`,
				() => value,
				() => pair.counterpart[k]
			))
		}
	}
}

const introspectBoth = (
	pair: Pair,
	observation: string,
	read: (t: any) => unknown
): unknown => {
	const arktype = outcomeOf(() => read(pair.original))
	const precompiled = outcomeOf(() => read(pair.counterpart))
	compare(
		pair.site,
		observation,
		observe(arktype, undefined),
		observe(precompiled, undefined)
	)
	if ("thrown" in arktype) throw arktype.thrown
	return arktype.value
}

// a morph can write the input, so its validator runs on a copy taken before arktype runs
const validateBoth = (
	pair: Pair,
	member: string,
	data: unknown,
	isWritten: boolean,
	run: (t: any, data: unknown) => unknown
): unknown => {
	const copy = isWritten ? copyInput(data, new Map()) : data
	const isCopied = copy !== uncopyable
	const precompiledData = isCopied ? copy : data
	const described = isWritten ? printable(data) : undefined
	const arktype = outcomeOf(() => run(pair.original, data))
	const precompiled = outcomeOf(() => run(pair.counterpart, precompiledData))
	const arktypeObserved = observe(arktype, data)
	const precompiledObserved = observe(precompiled, precompiledData)
	if (isWritten && isCopied) {
		arktypeObserved.input = data
		precompiledObserved.input = precompiledData
	}
	if (!observesAlike(arktypeObserved, precompiledObserved)) {
		throwError(
			(isCopied ? writeShadowMismatchMessage : writeUncopiedInputMessage)(
				pair.site,
				`${member}(${described ?? printable(data)})`,
				printable(arktypeObserved),
				printable(precompiledObserved)
			)
		)
	}
	if ("thrown" in arktype) throw arktype.thrown
	return arktype.value
}

const observe = (outcome: Outcome, input: unknown): Record<string, unknown> => {
	if ("thrown" in outcome) return { threw: String(outcome.thrown) }
	const { value } = outcome
	if (!hasArkKind(value, "errors"))
		return { out: value, isInput: value === input }
	return {
		summary: value.summary,
		issues: value.issues.map(e => ({
			code: e.code,
			path: [...e.path],
			data: e.data,
			expected: e.expected,
			actual: e.actual,
			problem: e.problem,
			message: e.message
		}))
	}
}

const compare = (
	site: string,
	observation: string,
	arktype: unknown,
	precompiled: unknown
): void => {
	if (!observesAlike(arktype, precompiled)) {
		throwError(
			writeShadowMismatchMessage(
				site,
				observation,
				printable(arktype),
				printable(precompiled)
			)
		)
	}
}

const uncopyable = Symbol("uncopyable")

const copiedProtos: unknown[] = [
	Object.prototype,
	null,
	Array.prototype,
	Date.prototype,
	Map.prototype,
	Set.prototype
]

// a copy would miss an instance's private fields and share a function a morph can write, so an input holding either isn't copied
const copyInput = (value: unknown, seen: Map<object, unknown>): unknown => {
	if (typeof value === "function") return uncopyable
	if (typeof value !== "object" || value === null) return value
	if (seen.has(value)) return seen.get(value)
	const proto = Object.getPrototypeOf(value)
	if (!copiedProtos.includes(proto)) return uncopyable
	const copy =
		Array.isArray(value) ? []
		: value instanceof Date ? new Date(value.getTime())
		: value instanceof Map ? new Map()
		: value instanceof Set ? new Set()
		: Object.create(proto)
	seen.set(value, copy)
	if (value instanceof Map) {
		for (const [k, v] of value) {
			const copiedKey = copyInput(k, seen)
			const copiedValue = copyInput(v, seen)
			if (copiedKey === uncopyable || copiedValue === uncopyable)
				return uncopyable
			copy.set(copiedKey, copiedValue)
		}
	} else if (value instanceof Set) {
		for (const v of value) {
			const copied = copyInput(v, seen)
			if (copied === uncopyable) return uncopyable
			copy.add(copied)
		}
	}
	const descriptors = Object.getOwnPropertyDescriptors(value)
	for (const k of Reflect.ownKeys(descriptors)) {
		const descriptor = descriptors[k as never] as PropertyDescriptor
		if (!("value" in descriptor)) return uncopyable
		descriptor.value = copyInput(descriptor.value, seen)
		if (descriptor.value === uncopyable) return uncopyable
	}
	Object.defineProperties(copy, descriptors)
	if (Object.isFrozen(value)) Object.freeze(copy)
	else if (Object.isSealed(value)) Object.seal(copy)
	else if (!Object.isExtensible(value)) Object.preventExtensions(copy)
	return copy
}

// a function is equal to any other, since the runtime holds its own copy of each arktype holds, like a matcher's onFail
const observesAlike = (
	l: unknown,
	r: unknown,
	seen = new Map<object, object>()
): boolean => {
	if (Object.is(l, r)) return true
	if (typeof l === "function") return typeof r === "function"
	if (
		typeof l !== "object" ||
		typeof r !== "object" ||
		l === null ||
		r === null
	)
		return false
	if (seen.get(l) === r) return true
	seen.set(l, r)
	if (Object.getPrototypeOf(l) !== Object.getPrototypeOf(r)) return false
	if (l instanceof Date) return Object.is(l.getTime(), (r as Date).getTime())
	if (l instanceof RegExp || l instanceof Error) return String(l) === String(r)
	if (l instanceof Map || l instanceof Set) {
		const rEntries = [...(r as Map<unknown, unknown>)]
		const lEntries = [...l]
		if (
			lEntries.length !== rEntries.length ||
			lEntries.some((entry, i) => !observesAlike(entry, rEntries[i], seen))
		)
			return false
	}
	const lKeys = Reflect.ownKeys(l)
	const rKeys = Reflect.ownKeys(r)
	return (
		lKeys.length === rKeys.length &&
		lKeys.every((k, i) => {
			if (k !== rKeys[i]) return false
			const lDescriptor = Object.getOwnPropertyDescriptor(l, k)!
			const rDescriptor = Object.getOwnPropertyDescriptor(r, k)!
			return (
				lDescriptor.enumerable === rDescriptor.enumerable &&
				"value" in lDescriptor === "value" in rDescriptor &&
				(!("value" in lDescriptor) ||
					observesAlike(lDescriptor.value, rDescriptor.value, seen))
			)
		})
	)
}

export const writeShadowMismatchMessage = <
	site extends string,
	observation extends string,
	arktype extends string,
	precompiled extends string
>(
	site: site,
	observation: observation,
	arktype: arktype,
	precompiled: precompiled
): writeShadowMismatchMessage<site, observation, arktype, precompiled> =>
	`${site} diverges from arktype at ${observation}: arktype gives ${arktype}, its validator ${precompiled}`

export type writeShadowMismatchMessage<
	site extends string,
	observation extends string,
	arktype extends string,
	precompiled extends string
> = `${site} diverges from arktype at ${observation}: arktype gives ${arktype}, its validator ${precompiled}`

export const writeUncopiedInputMessage = <
	site extends string,
	observation extends string,
	arktype extends string,
	precompiled extends string
>(
	site: site,
	observation: observation,
	arktype: arktype,
	precompiled: precompiled
): writeUncopiedInputMessage<site, observation, arktype, precompiled> =>
	`${site} can't be compared with arktype at ${observation}, since its validator received the input as arktype's morphs left it, which it can't copy: arktype gives ${arktype}, its validator ${precompiled}`

export type writeUncopiedInputMessage<
	site extends string,
	observation extends string,
	arktype extends string,
	precompiled extends string
> = `${site} can't be compared with arktype at ${observation}, since its validator received the input as arktype's morphs left it, which it can't copy: arktype gives ${arktype}, its validator ${precompiled}`
