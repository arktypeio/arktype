import { hasArkKind, InternalTraversal, type BaseRoot } from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { shareConfig } from "@ark/schema/runtime"
import { hasDomain, noSuggest, printable, throwError } from "@ark/util"
import { configure } from "arktype/internal/config.js"

// a shadowed module imports this before arktype, so claimEntry lets arktype and the runtime load in either order
;(globalThis as Record<string, unknown>)[noSuggest("loadedArktypeEntry")] =
	"both"
shareConfig(configure)

type Outcome = { value: unknown } | { thrown: unknown }

const outcomeOf = (run: () => unknown): Outcome => {
	try {
		return { value: run() }
	} catch (e) {
		return { thrown: e }
	}
}

const settle = (outcome: Outcome): unknown => {
	if ("thrown" in outcome) throw outcome.thrown
	return outcome.value
}

const precompiledByShadowed = new WeakMap<object, unknown>()

const originalByShadowed = new WeakMap<object, unknown>()

// two sites returning one Type and one validator return one value, as arktype's do
const shadowedByPair = new WeakMap<object, WeakMap<object, object>>()

// arktype reads what it holds, like a Type a static helper composes by name, as itself
let arktypeDepth = 0

const inArktype = <t>(run: () => t): t => {
	arktypeDepth++
	try {
		return run()
	} finally {
		arktypeDepth--
	}
}

// e.g. `type(fields)` with `fields = { name: Name }`, whose factory reads `fields.name`
const swapped = (
	value: unknown,
	byShadowed: WeakMap<object, unknown>,
	seen: Map<object, unknown>
): unknown => {
	if (typeof value !== "object" && typeof value !== "function") return value
	if (value === null) return value
	if (byShadowed.has(value)) return byShadowed.get(value)
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
		const result = swapped(descriptor.value, byShadowed, seen)
		if (result === descriptor.value) continue
		descriptor.value = result
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

export const shadow = (
	site: string,
	precompile: (...args: unknown[]) => unknown,
	define: (...args: unknown[]) => unknown,
	// the arguments a factory calls during a validation, which arktype calls once, recording what the validator replays
	callbacks: readonly number[],
	...args: unknown[]
): unknown => {
	const originals = new Map<object, unknown>()
	const counterparts = new Map<object, unknown>()
	return shadowOf(
		site,
		() =>
			inArktype(() =>
				define(
					...args.map((arg, i) =>
						callbacks.includes(i) ?
							callbackOf(arg)
						:	swapped(arg, originalByShadowed, originals)
					)
				)
			),
		() =>
			precompile(
				...args.map((arg, i) =>
					callbacks.includes(i) ?
						callbackOf(arg)
					:	swapped(arg, precompiledByShadowed, counterparts)
				)
			)
	)
}

interface Pair {
	site: string
	original: unknown
	counterpart: unknown
}

const shadowOf = (
	site: string,
	define: () => unknown,
	precompile: () => unknown
): unknown => {
	const defined = outcomeOf(define)
	const precompiled = outcomeOf(precompile)
	const original = "value" in defined ? defined.value : undefined
	const pair: Pair = {
		site,
		original,
		counterpart: "value" in precompiled ? precompiled.value : undefined
	}
	const isType = hasArkKind(original, "root")
	const isHeld =
		hasArkKind(original, "scope") || hasArkKind(original, "generic")
	// e.g. what `User.toJsonSchema()` returns, which a build bakes
	const isData =
		!isHeld && !hasArkKind(original, "module") && typeof original !== "function"
	const observeCreation = (outcome: Outcome) =>
		"thrown" in outcome ? { threw: thrownOf(outcome.thrown) }
		: isType ? attributesOf(outcome.value)
		: isData ? { value: withoutSuffixes(outcome.value) }
		: {}
	compare(
		pair,
		"creation",
		inArktype(() => observeCreation(defined)),
		observeCreation(precompiled)
	)
	if ("thrown" in defined) throw defined.thrown
	if (isData) return original
	// e.g. a Scope, whose validator's factory receives its own
	if (isHeld) {
		precompiledByShadowed.set(original as object, pair.counterpart)
		return original
	}
	const byCounterpart = shadowedByPair.get(original as object) ?? new WeakMap()
	shadowedByPair.set(original as object, byCounterpart)
	const existing = byCounterpart.get(pair.counterpart as object)
	if (existing) return existing
	const shadowed = new Proxy(
		original as object,
		isType ? typeHandlerOf(pair as Pair & { original: BaseRoot })
		: hasArkKind(original, "module") ? moduleHandlerOf(pair)
			// e.g. a TypedFn, whose implementation is a callback
		: {
				apply: (target, self, args) =>
					arktypeDepth ?
						Reflect.apply(target as Function, self, args)
					:	validateBoth(pair, "call", args, true, (fn, args) =>
							Reflect.apply(fn, self, args as unknown[])
						)
			}
	)
	byCounterpart.set(pair.counterpart as object, shadowed)
	precompiledByShadowed.set(shadowed, pair.counterpart)
	originalByShadowed.set(shadowed, original)
	return shadowed
}

const thrownOf = (e: unknown) => (e instanceof Error ? String(e) : e)

// e.g. a validator a Module lacks
const attributesOf = (t: any) => ({
	expression: t?.expression,
	description: t?.description,
	meta: t?.meta
})

const validatedMembers = ["allows", "assert", "traverse", "from"]

const introspectedMembers = ["toJSON", "toJsonSchema", "toString"]

const typeHandlerOf = (
	pair: Pair & { original: BaseRoot }
): ProxyHandler<any> => {
	const membersByKey: Record<PropertyKey, unknown> = Object.create(null)
	// allows runs no morph, so only a validation that can write the input copies it
	const isWritten = inArktype(() => pair.original.transforms)
	const validator =
		(...path: string[]) =>
		(data: unknown) =>
			validateBoth(
				pair,
				path.join(".") || "call",
				data,
				path[0] !== "allows" && isWritten,
				(t, data) => (path.length ? readAt(t, path, [data]) : t(data))
			)
	const introspector =
		(...path: string[]) =>
		(...args: unknown[]) =>
			introspect(pair, path, args)
	const memberOf = (target: BaseRoot, k: PropertyKey): unknown => {
		if (validatedMembers.includes(k as never)) return validator(k as string)
		if (introspectedMembers.includes(k as never))
			return introspector(k as string)
		if (k === "meta") {
			// arktype holds the recorder of each function the program passed
			const meta: Record<PropertyKey, unknown> = { ...target.meta }
			for (const k in meta)
				meta[k] = callbackByWrapper.get(meta[k] as never) ?? meta[k]
			return Object.freeze(meta)
		}
		const counterpart = pair.counterpart as Record<PropertyKey, unknown>
		if (k === "~standard") {
			const standard: Record<string, unknown> = {}
			for (const key in counterpart["~standard"] as object) {
				standard[key] =
					key === "validate" ? validator("~standard", "validate")
					: key === "jsonSchema" ?
						{
							input: introspector("~standard", "jsonSchema", "input"),
							output: introspector("~standard", "jsonSchema", "output")
						}
					:	(target["~standard"] as never)[key]
			}
			return standard
		}
		const value = Reflect.get(target, k, target)
		const read = outcomeOf(() => counterpart[k])
		if (value !== undefined && ("thrown" in read || read.value === undefined)) {
			fail(
				pair,
				`reading ${String(k)}`,
				printable(typeof value),
				"thrown" in read ? `throws ${thrownOf(read.thrown)}` : "undefined",
				"since its validator lacks it"
			)
		}
		return boundTo(target, value)
	}
	return {
		apply: (target, self, args) =>
			arktypeDepth ? Reflect.apply(target, self, args) : validator()(args[0]),
		get: (target, k) => {
			if (arktypeDepth) return boundTo(target, Reflect.get(target, k, target))
			// a getter, read anew
			if (k === "json") return introspect(pair, ["json"])
			if (k in membersByKey) return membersByKey[k]
			const member = inArktype(() => memberOf(target, k))
			membersByKey[k] = member
			return member
		}
	}
}

// e.g. `~standard.jsonSchema.input`, called on the object holding it where args are given
const readAt = (t: any, path: string[], args?: unknown[]) => {
	const holder = path.slice(0, -1).reduce((o, k) => o[k], t)
	const k = path[path.length - 1]
	return args ? holder[k](...args) : holder[k]
}

// a method, which arktype runs on `this` as describe() selects nodes by it, but not a class or a Type arktype holds
const boundTo = (target: object, value: unknown) =>
	(
		typeof value === "function" &&
		Object.getPrototypeOf(value) === Function.prototype &&
		!("prototype" in value)
	) ?
		new Proxy(value, {
			apply: (method, _, args) =>
				inArktype(() => Reflect.apply(method, target, args))
		})
	:	value

const moduleHandlerOf = (pair: Pair): ProxyHandler<any> => {
	const membersByKey: Record<PropertyKey, unknown> = Object.create(null)
	return {
		get: (target, k) => {
			const value = Reflect.get(target, k)
			if (
				arktypeDepth ||
				(!hasArkKind(value, "root") && !hasArkKind(value, "module"))
			)
				return value
			return (membersByKey[k] ??= shadowOf(
				`${pair.site}.${String(k)}`,
				() => value,
				() => (pair.counterpart as Record<PropertyKey, unknown>)[k]
			))
		}
	}
}

// a member read without args, like json, or called with them, compared without arktype's suffix for a function registered under a name another already has, which §2 of the plan leaves out
const introspect = (pair: Pair, path: string[], args?: unknown[]): unknown => {
	const read = (t: unknown) => readAt(t, path, args)
	const observed = (outcome: Outcome) =>
		"thrown" in outcome ?
			observe(outcome)
		:	observe({ value: withoutSuffixes(outcome.value) })
	const arktype = inArktype(() => outcomeOf(() => read(pair.original)))
	const member = outcomeOf(() => readAt(pair.counterpart, path))
	const isBaked = "value" in member && member.value !== undefined
	compare(
		pair,
		`${path.join(".")}${args ? "()" : ""}`,
		observed(arktype),
		observed(
			isBaked ? outcomeOf(() => read(pair.counterpart)) : { value: undefined }
		),
		isBaked ? undefined : "since its validator doesn't bake it"
	)
	return settle(arktype)
}

const withoutSuffixes = (json: unknown): unknown =>
	json === undefined ? json : (
		JSON.parse(JSON.stringify(json).replace(/(\$ark\.\w+)\$\d+/g, "$1"))
	)

interface Call {
	callee: Function
	receiver: unknown
	args: unknown[]
	// each argument as arktype passed it, which its validator must pass too
	copies: unknown[] | undefined
	// arktype's objects by their copies, its arguments' before the call and its result's after
	copied: Map<object, unknown>
	path: PropertyKey[] | undefined
	outcome: Outcome
	// a call writing an argument or an error to its ctx, which the validator's own copy and ctx need too
	isRepeated: boolean
	result: unknown
}

interface Validation {
	// arktype's calls are recorded, then its validator's replayed
	phase: "record" | "replay"
	calls: Call[]
	replayed: number
	// each object arktype's side holds, by the one the validator's side holds in its place
	counterparts: Map<object, unknown>
	isCopied: boolean
	mismatch: [arktype: string, precompiled: string] | undefined
}

// the validation whose callbacks are recorded or replayed, undefined while a callback runs
let validation: Validation | undefined

const wrapperByCallback = new WeakMap<Function, Function>()

const callbackByWrapper = new WeakMap<object, Function>()

// one per function, so its facts, like `name`, `length` and identity, are the program's
const callbackOf = (value: unknown): unknown => {
	if (typeof value !== "function") return value
	let wrapper = wrapperByCallback.get(value)
	if (!wrapper) {
		wrapper = new Proxy(value, {
			apply: (target, receiver, args) =>
				!validation ? settle(callOf(target, receiver, args))
				: validation.phase === "record" ?
					record(validation, target, receiver, args)
				:	replay(validation, target, receiver, args)
		})
		wrapperByCallback.set(value, wrapper)
		callbackByWrapper.set(wrapper, value)
	}
	return wrapper
}

// the program's code, where a Type it reads compares again and a validation it runs is recorded on its own
const callOf = (callee: Function, receiver: unknown, args: unknown[]) => {
	const outerValidation = validation
	const outerDepth = arktypeDepth
	validation = undefined
	arktypeDepth = 0
	try {
		return outcomeOf(() => Reflect.apply(callee, receiver, args))
	} finally {
		validation = outerValidation
		arktypeDepth = outerDepth
	}
}

const ctxOf = (args: unknown[]) =>
	args.find((arg): arg is InternalTraversal => arg instanceof InternalTraversal)

const record = (
	current: Validation,
	callee: Function,
	receiver: unknown,
	args: unknown[]
): unknown => {
	const ctx = ctxOf(args)
	const errorCount = ctx?.currentErrorCount
	const copied = new Map<object, unknown>()
	const copies =
		current.isCopied ? args.map(arg => copyOf(arg, copied)) : undefined
	const outcome = callOf(callee, receiver, args)
	const isRepeated =
		ctx?.currentErrorCount !== errorCount ||
		!!copies?.some(
			(copy, i) => copy !== uncopyable && !isAlike(copy, args[i], new Map())
		)
	current.calls.push({
		callee,
		receiver,
		args,
		copies,
		copied,
		path: ctx && [...ctx.path],
		outcome,
		isRepeated,
		result:
			"value" in outcome && copies && !isRepeated ?
				copyOf(outcome.value, copied)
			:	uncopyable
	})
	return settle(outcome)
}

const replay = (
	current: Validation,
	callee: Function,
	receiver: unknown,
	args: unknown[]
): unknown => {
	const call = current.calls[current.replayed++]
	const ctx = ctxOf(args)
	// the validator's objects by the copies of arktype's they stand for, like the input reached through an argument
	const counterpartsByCopy = new Map<object, unknown>()
	for (const [original, copy] of call?.copied ?? []) {
		if (current.counterparts.has(original))
			counterpartsByCopy.set(copy as object, current.counterparts.get(original))
	}
	const corresponds = (
		original: unknown,
		counterpart: unknown,
		copy?: unknown
	) =>
		copy === undefined || copy === uncopyable ?
			isAlike(original, counterpart, current.counterparts)
		:	isAlike(copy, counterpart, counterpartsByCopy)
	const describe = (callee: Function, args: unknown[], path?: PropertyKey[]) =>
		`${callee.name || "a function"}(${args.map(arg => (arg instanceof InternalTraversal ? "ctx" : printable(arg))).join(", ")})${path?.length ? ` at ${printable(path)}` : ""}`
	if (
		!call ||
		call.callee !== callee ||
		!corresponds(call.receiver, receiver) ||
		call.args.length !== args.length ||
		!isAlike(call.path, ctx && [...ctx.path], new Map()) ||
		call.args.some(
			(arg, i) =>
				!(arg instanceof InternalTraversal) &&
				!corresponds(arg, args[i], call.copies?.[i])
		)
	) {
		current.mismatch ??= [
			call ?
				`calls ${describe(call.callee, call.copies ?? call.args, call.path)}`
			:	"makes no call",
			`calls ${describe(callee, args, ctx && [...ctx.path])}`
		]
		throw mismatched
	}
	if (!call.isRepeated) {
		if ("thrown" in call.outcome) throw call.outcome.thrown
		if (call.result === uncopyable) return call.outcome.value
		const result = copyOf(call.result, counterpartsByCopy)
		for (const [original, copy] of call.copied) {
			if (counterpartsByCopy.has(copy as object)) {
				current.counterparts.set(
					original,
					counterpartsByCopy.get(copy as object)
				)
			}
		}
		return result
	}
	const outcome = callOf(callee, receiver, args)
	if (!isAlike(observe(call.outcome), observe(outcome), current.counterparts)) {
		current.mismatch ??= [
			`${describe(callee, call.args)} gives ${printable(observe(call.outcome))}`,
			`${describe(callee, args)} gives ${printable(observe(outcome))}`
		]
		throw mismatched
	}
	return settle(outcome)
}

// thrown through the validator, which a mismatch in its calls stops
const mismatched = Symbol("mismatched")

const validateBoth = (
	pair: Pair,
	member: string,
	data: unknown,
	isWritten: boolean,
	run: (t: any, data: unknown) => unknown
): unknown => {
	const counterparts = new Map<object, unknown>()
	const copy = isWritten ? copyOf(data, counterparts) : uncopyable
	if (copy === uncopyable) counterparts.clear()
	const current: Validation = {
		phase: "record",
		calls: [],
		replayed: 0,
		counterparts,
		isCopied: copy !== uncopyable,
		mismatch: undefined
	}
	const outer = validation
	validation = current
	let arktype: Outcome
	let precompiled: Outcome
	try {
		arktype = inArktype(() => outcomeOf(() => run(pair.original, data)))
		current.phase = "replay"
		precompiled = outcomeOf(() =>
			run(pair.counterpart, current.isCopied ? copy : data)
		)
	} finally {
		validation = outer
	}
	const unreplayed = current.calls[current.replayed]
	current.mismatch ??= unreplayed && [
		`calls ${unreplayed.callee.name || "a function"}`,
		"makes no call"
	]
	const observation = () => `${member}(${printable(data)})`
	const reason =
		isWritten && !current.isCopied ?
			"or its validator saw what arktype's morphs wrote to the input, which it can't copy"
		:	undefined
	if (current.mismatch) fail(pair, observation(), ...current.mismatch, reason)
	const arktypeObserved = inArktype(() => observe(arktype))
	const precompiledObserved = observe(precompiled)
	if (current.isCopied) {
		arktypeObserved.input = data
		precompiledObserved.input = copy
	}
	compare(
		pair,
		observation,
		arktypeObserved,
		precompiledObserved,
		reason,
		counterparts
	)
	return settle(arktype)
}

const observe = (outcome: Outcome): Record<string, unknown> => {
	if ("thrown" in outcome) return { threw: thrownOf(outcome.thrown) }
	const { value } = outcome
	if (!hasArkKind(value, "errors")) return { out: value }
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
	pair: Pair,
	// e.g. a validation's, printing its input only where they differ
	observation: string | (() => string),
	arktype: unknown,
	precompiled: unknown,
	reason?: string,
	counterparts = new Map<object, unknown>()
): void => {
	if (!isAlike(arktype, precompiled, counterparts)) {
		fail(
			pair,
			typeof observation === "string" ? observation : observation(),
			printable(arktype),
			printable(precompiled),
			reason
		)
	}
}

const fail = (
	pair: Pair,
	observation: string,
	arktype: string,
	precompiled: string,
	// e.g. where one side shares an object the other copies
	reason = arktype === precompiled ? "though each prints alike" : undefined
): never =>
	throwError(
		writeShadowMismatchMessage(
			pair.site,
			observation,
			arktype,
			precompiled,
			reason ? `, ${reason}` : ""
		)
	)

const uncopyable = Symbol("uncopyable")

// what a copy keeps, which an instance's private fields or a builtin's internal slots aren't
const copiedProtos: unknown[] = [
	Object.prototype,
	null,
	Array.prototype,
	Date.prototype
]

const copyOf = (value: unknown, seen: Map<object, unknown>): unknown => {
	if (typeof value === "function") return uncopyable
	if (typeof value !== "object" || value === null) return value
	if (seen.has(value)) return seen.get(value)
	const proto = Object.getPrototypeOf(value)
	if (!copiedProtos.includes(proto)) return uncopyable
	const copy =
		Array.isArray(value) ? []
		: value instanceof Date ? new Date(value.getTime())
		: Object.create(proto)
	seen.set(value, copy)
	if (isIndexed(value)) {
		for (let i = 0; i < value.length; i++) {
			const copied = copyOf(value[i], seen)
			if (copied === uncopyable) return uncopyable
			copy.push(copied)
		}
	} else {
		for (const k of Reflect.ownKeys(value)) {
			const descriptor = Object.getOwnPropertyDescriptor(value, k)!
			if (!("value" in descriptor)) return uncopyable
			const copied = copyOf(descriptor.value, seen)
			if (copied === uncopyable) return uncopyable
			if (
				descriptor.writable &&
				descriptor.enumerable &&
				descriptor.configurable
			)
				copy[k] = copied
			else Object.defineProperty(copy, k, { ...descriptor, value: copied })
		}
	}
	return Object.isFrozen(value) ? Object.freeze(copy) : copy
}

// an array holding each of its indices and no other key, read by index, since listing its keys as strings costs more than copying them
const isIndexed = (value: object): value is unknown[] => {
	if (
		!Array.isArray(value) ||
		Object.keys(value).length !== value.length ||
		Object.getOwnPropertySymbols(value).length
	)
		return false
	for (let i = 0; i < value.length; i++) if (!(i in value)) return false
	return true
}

const comparedProtos: unknown[] = [
	...copiedProtos,
	Map.prototype,
	Set.prototype,
	RegExp.prototype,
	Error.prototype
]

// a function is alike any other, since the runtime holds its own copy of each arktype holds, like a matcher's onFail
const isAlike = (
	l: unknown,
	r: unknown,
	counterparts: Map<object, unknown>,
	compared = new Set<object>()
): boolean => {
	if (typeof l === "function" || typeof r === "function")
		return typeof l === typeof r
	if (!hasDomain(l, "object") || !hasDomain(r, "object")) return Object.is(l, r)
	const counterpart = counterparts.get(l)
	// an object both sides share, like an input neither copies
	if (l === r) return counterpart === undefined || counterpart === r
	if (counterpart === undefined) counterparts.set(l, r)
	else if (counterpart !== r) return false
	if (compared.has(l)) return true
	compared.add(l)
	const proto = Object.getPrototypeOf(l)
	if (proto !== Object.getPrototypeOf(r)) return false
	if (l instanceof Date) return Object.is(l.getTime(), (r as Date).getTime())
	if (l instanceof RegExp || l instanceof Error) return String(l) === String(r)
	if (!comparedProtos.includes(proto) && String(l) !== String(r)) return false
	if (l instanceof Map || l instanceof Set) {
		const rEntries = [...(r as Map<unknown, unknown>)]
		const lEntries = [...l]
		if (
			lEntries.length !== rEntries.length ||
			lEntries.some(
				(entry, i) => !isAlike(entry, rEntries[i], counterparts, compared)
			)
		)
			return false
	}
	if (isIndexed(l)) {
		return (
			isIndexed(r) &&
			l.length === r.length &&
			l.every((v, i) => isAlike(v, r[i], counterparts, compared))
		)
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
					isAlike(lDescriptor.value, rDescriptor.value, counterparts, compared))
			)
		})
	)
}

export const writeShadowMismatchMessage = <
	site extends string,
	observation extends string,
	arktype extends string,
	precompiled extends string,
	reason extends string
>(
	site: site,
	observation: observation,
	arktype: arktype,
	precompiled: precompiled,
	reason: reason
): writeShadowMismatchMessage<
	site,
	observation,
	arktype,
	precompiled,
	reason
> =>
	`${site} diverges from arktype at ${observation}${reason}: arktype gives ${arktype}, its validator ${precompiled}`

export type writeShadowMismatchMessage<
	site extends string,
	observation extends string,
	arktype extends string,
	precompiled extends string,
	reason extends string
> = `${site} diverges from arktype at ${observation}${reason}: arktype gives ${arktype}, its validator ${precompiled}`
