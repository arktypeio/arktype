import {
	hasArkKind,
	InternalTraversal,
	type BaseRoot,
	type Traversal
} from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { shareConfig } from "@ark/schema/runtime"
import { hasDomain, printable } from "@ark/util"
import { configure } from "arktype/internal/config.js"

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
const swappedOf = (
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
		const result = swappedOf(descriptor.value, byShadowed, seen)
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
	const passed = args.map((arg, i) =>
		callbacks.includes(i) ? callbackOf(arg) : arg
	)
	const swappedBy = (byShadowed: WeakMap<object, unknown>) => {
		const seen = new Map<object, unknown>()
		return passed.map(arg => swappedOf(arg, byShadowed, seen))
	}
	return shadowOf(
		site,
		() => inArktype(() => define(...swappedBy(originalByShadowed))),
		() => precompile(...swappedBy(precompiledByShadowed))
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
	// e.g. `type(User, "|", Num).exclude(Num)`, where arktype returns the Proxy it held
	const original =
		"value" in defined ?
			(originalByShadowed.get(defined.value as never) ?? defined.value)
		:	undefined
	const pair: Pair = {
		site,
		original,
		counterpart: "value" in precompiled ? precompiled.value : undefined
	}
	const isType = hasArkKind(original, "root")
	// e.g. what `User.toJsonSchema()` returns, which a build bakes
	const isData = !isHeld(original) && typeof original !== "function"
	const observeCreation = (outcome: Outcome) =>
		"thrown" in outcome ? { threw: thrownOf(outcome.thrown) }
		: isType ? { meta: (outcome.value as { meta?: unknown } | undefined)?.meta }
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
	const nodes =
		isType ? inArktype(() => [original, ...original.references]) : []
	for (const value of nodes.flatMap(node => Object.values(node.meta))) {
		if (typeof value === "function")
			writers.add(callbackByWrapper.get(value) ?? value)
	}
	const byCounterpart = shadowedByPair.get(original as object) ?? new WeakMap()
	shadowedByPair.set(original as object, byCounterpart)
	const existing = byCounterpart.get(pair.counterpart as object)
	if (existing) return existing
	const shadowed = new Proxy(
		original as object,
		isType ? typeHandlerOf(pair as Pair & { original: BaseRoot })
		: isHeld(original) ? heldHandlerOf(pair)
			// e.g. a TypedFn, whose implementation is a callback
		: {
				...heldHandlerOf(pair),
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
		const counterpart = pair.counterpart as Record<PropertyKey, unknown>
		if (
			introspectedMembers.includes(k as never) &&
			"value" in outcomeOf(() => counterpart[k])
		)
			return introspector(k as string)
		if (k === "meta") {
			// arktype holds the recorder of each function the program passed
			const meta: Record<PropertyKey, unknown> = { ...target.meta }
			for (const k in meta)
				meta[k] = callbackByWrapper.get(meta[k] as never) ?? meta[k]
			return Object.freeze(meta)
		}
		if (k === "~standard") {
			const { validate, jsonSchema, ...standard } = counterpart[
				"~standard"
			] as Record<string, unknown>
			return {
				...standard,
				validate: validate && validator("~standard", "validate"),
				...(jsonSchema !== undefined && {
					jsonSchema: {
						input: introspector("~standard", "jsonSchema", "input"),
						output: introspector("~standard", "jsonSchema", "output")
					}
				})
			}
		}
		return boundTo(target, checkedMember(pair, target, k))
	}
	return {
		apply: (target, self, args) =>
			arktypeDepth ? Reflect.apply(target, self, args) : validator()(args[0]),
		has: hasOf(pair),
		get: (target, k) => {
			if (arktypeDepth) return boundTo(target, Reflect.get(target, k, target))
			// a getter, read anew
			if (k === "json" || k === "expression" || k === "description")
				return introspect(pair, [k])
			if (k in membersByKey) return membersByKey[k]
			const member = inArktype(() => memberOf(target, k))
			membersByKey[k] = member
			return member
		}
	}
}

const checkedMember = (
	pair: Pair,
	target: object,
	k: PropertyKey,
	observation = `reading ${String(k)}`
): unknown => {
	const value = inArktype(() => Reflect.get(target, k, target))
	const read = outcomeOf(
		() => (pair.counterpart as Record<PropertyKey, unknown>)[k]
	)
	if (value !== undefined && ("thrown" in read || read.value === undefined)) {
		fail(
			pair,
			observation,
			printable(typeof value),
			"thrown" in read ? `throws ${thrownOf(read.thrown)}` : "undefined",
			"since its validator lacks it"
		)
	}
	return value
}

const hasOf =
	(pair: Pair) =>
	(target: object, k: PropertyKey): boolean => {
		// e.g. `"json" in T`, which a validator answers with the getter that throws where its build doesn't list it
		if (
			!arktypeDepth &&
			!(
				Reflect.has(target, k) &&
				hasDomain(pair.counterpart, "object") &&
				k in pair.counterpart
			)
		)
			checkedMember(pair, target, k, `checking for ${String(k)} with in`)
		return Reflect.has(target, k)
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

// e.g. a Module, a Scope or a Generic, whose members arktype's have only where its validator's do
const heldHandlerOf = (pair: Pair): ProxyHandler<any> => {
	const membersByKey: Record<PropertyKey, unknown> = Object.create(null)
	return {
		get: (target, k) => {
			if (arktypeDepth) return Reflect.get(target, k)
			const value = checkedMember(pair, target, k)
			if (!hasArkKind(value, "root") && !isHeld(value))
				return boundTo(target, value)
			return (membersByKey[k] ??= shadowOf(
				`${pair.site}.${String(k)}`,
				() => value,
				() => (pair.counterpart as Record<PropertyKey, unknown>)[k]
			))
		},
		has: hasOf(pair),
		// e.g. a Generic, which a validator holds as a reference it can't call
		apply: (target, self, args) =>
			arktypeDepth ?
				inArktype(() => Reflect.apply(target, self, args))
			:	fail(
					pair,
					"calling it",
					printable("function"),
					printable(typeof pair.counterpart),
					"since its validator can't be called"
				)
	}
}

const isHeld = (value: unknown) =>
	hasArkKind(value, "module") ||
	hasArkKind(value, "scope") ||
	hasArkKind(value, "generic")

// a member read without args, like json, or called with them, compared without arktype's registration suffixes
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
		observed(isBaked ? outcomeOf(() => read(pair.counterpart)) : member),
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
	copied: Map<object, unknown>
	copiedAfter: Map<object, unknown>
	written: unknown[]
	ctx: ReturnType<typeof ctxStateOf>
	root: unknown
	outcome: Outcome
	result: unknown
	// e.g. a call adding a ctx error or setting a Date's time, which runs again for the validator
	isRepeated: boolean
}

interface Validation {
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

// e.g. a meta's `message`, with which each side writes its own errors
const writers = new WeakSet<Function>()

// one per function, so its facts, like `name`, `length` and identity, are the program's
const callbackOf = (value: unknown): unknown => {
	if (typeof value !== "function") return value
	let wrapper = wrapperByCallback.get(value)
	if (!wrapper) {
		wrapper = new Proxy(value, {
			apply: (target, receiver, args) =>
				!validation || writers.has(target) ?
					settle(outcomeOfCall(target, receiver, args))
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
const outcomeOfCall = (
	callee: Function,
	receiver: unknown,
	args: unknown[]
) => {
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
	args.find((arg): arg is Traversal => arg instanceof InternalTraversal)

const ctxStateOf = (
	ctx: Traversal | undefined,
	copied?: Map<object, unknown>
) =>
	ctx && {
		path: [...ctx.path],
		errorCount: ctx.currentErrorCount,
		errors: ctx._errors?._added.map(e => [e.code, ...e.path]) ?? [],
		data: copied?.get(ctx.data as never) ?? ctx.data
	}

const record = (
	current: Validation,
	callee: Function,
	receiver: unknown,
	args: unknown[]
): unknown => {
	const copied = new Map<object, unknown>()
	const copies =
		current.isCopied ? args.map(arg => copyOf(arg, copied)) : undefined
	const ctx = ctxOf(args)
	const ctxState = ctxStateOf(ctx, copied)
	const outcome = outcomeOfCall(callee, receiver, args)
	const copiedAfter = new Map<object, unknown>()
	// e.g. a key set to a new object that prints alike, which assignment repeats too
	const originalByCopy = new Map([...copied].map(([o, c]) => [c as object, o]))
	const written = (copies ?? []).flatMap((copy, i) =>
		copy !== uncopyable && !isAlike(copy, args[i], originalByCopy, true) ?
			[copyOf(args[i], copiedAfter)]
		:	[]
	)
	const result =
		"value" in outcome && copies ?
			copyOf(outcome.value, copiedAfter)
		:	uncopyable
	const isRepeated =
		ctx?.currentErrorCount !== ctxState?.errorCount ||
		!isReplayable({ copies, copied, copiedAfter, written, result })
	current.calls.push({
		callee,
		receiver,
		args,
		copies,
		copied,
		copiedAfter,
		written,
		ctx: ctxState,
		root: ctx?.root,
		outcome,
		result,
		isRepeated
	})
	return settle(outcome)
}

type Writes = Pick<Call, "copied" | "copiedAfter" | "written" | "result">

// e.g. not a key moved or a Date's time set
const isReplayable = (call: Writes & Pick<Call, "copies">) => {
	if (!call.written.length) return true
	if (call.written.includes(uncopyable)) return false
	const counterparts = new Map<object, unknown>()
	for (const copy of call.copies ?? []) copyOf(copy, counterparts)
	relate(counterparts, call.copied)
	const states = [...call.written, call.result]
	const replayed = outcomeOf(() => {
		writeAll(call, counterparts)
		return states.map(state => copyOf(state, counterparts))
	})
	return "value" in replayed && isAlike(states, replayed.value, new Map(), true)
}

// e.g. an in-place morph's, through its arguments or an object it detached from them and returned
const writeAll = (call: Writes, counterparts: Map<object, unknown>) => {
	relate(counterparts, call.copiedAfter)
	if (!call.written.length) return
	// e.g. not ctx.root's, which the call reached but didn't receive
	const received = new Set<unknown>()
	for (const [o, c] of call.copiedAfter) if (call.copied.has(o)) received.add(c)
	const visited = new Set<object>()
	for (const state of [...call.written, call.result])
		writeOnto(state, counterparts, received, visited)
}

const replay = (
	current: Validation,
	callee: Function,
	receiver: unknown,
	args: unknown[]
): unknown => {
	const call = current.calls[current.replayed++]
	const ctx = ctxOf(args)
	const ctxState = ctxStateOf(ctx)
	const { counterparts } = current
	if (call) relate(counterparts, call.copied)
	const originals = new Map<object, unknown>()
	// e.g. a cyclic node's, piped from a parsed string, which no copy holds
	if (call && hasDomain(call.root, "object") && !counterparts.has(call.root))
		counterparts.set(call.root, ctx?.root)
	const isOtherRoot =
		!!call &&
		!Object.is(counterparts.get(call.root as never) ?? call.root, ctx?.root)
	// e.g. an argument's copy, as arktype passed it before the call wrote it
	const corresponds = (
		original: unknown,
		counterpart: unknown,
		copy?: unknown
	) =>
		isAlike(
			copy === undefined || copy === uncopyable ? original : copy,
			counterpart,
			counterparts,
			true,
			originals
		)
	if (
		!call ||
		call.callee !== callee ||
		!isAlike(call.receiver, receiver, counterparts, false) ||
		call.args.length !== args.length ||
		isOtherRoot ||
		!corresponds(call.ctx, ctxState) ||
		call.args.some(
			(arg, i) =>
				!(arg instanceof InternalTraversal) &&
				!corresponds(arg, args[i], call.copies?.[i])
		)
	) {
		current.mismatch ??= [
			call ? describeCall(call) : "makes no call",
			`${describeCall({ callee, args, ctx: ctxState })}${isOtherRoot ? " with another ctx.root" : ""}`
		]
		throw mismatched
	}
	relate(counterparts, call.copied)
	if (call.isRepeated) {
		const outcome = outcomeOfCall(callee, receiver, args)
		// as the call left it, since arktype's later calls can write what it returned
		const recorded =
			"value" in call.outcome && call.result !== uncopyable ?
				{ value: call.result }
			:	call.outcome
		if (!isAlike(observe(recorded), observe(outcome), new Map(), true)) {
			current.mismatch ??= [
				`${describeCall(call)}, which gives ${printable(observe(recorded))}`,
				`${describeCall({ callee, args })}, which gives ${printable(observe(outcome))}`
			]
			throw mismatched
		}
		return settle(outcome)
	}
	writeAll(call, counterparts)
	if ("thrown" in call.outcome) throw call.outcome.thrown
	const result =
		call.result === uncopyable ?
			call.outcome.value
		:	copyOf(call.result, counterparts)
	relate(counterparts, call.copiedAfter)
	return result
}

const relate = (
	counterparts: Map<object, unknown>,
	copied: Map<object, unknown>
) => {
	for (const [original, copy] of copied) {
		const counterpart =
			counterparts.get(original) ?? counterparts.get(copy as object)
		if (counterpart === undefined) continue
		counterparts.set(original, counterpart)
		counterparts.set(copy as object, counterpart)
	}
}

const writeOnto = (
	state: unknown,
	counterparts: Map<object, unknown>,
	received: Set<unknown>,
	visited = new Set<object>()
): void => {
	if (!hasDomain(state, "object") || visited.has(state)) return
	visited.add(state)
	const values = state as Record<PropertyKey, unknown>
	for (const k of Reflect.ownKeys(state))
		writeOnto(values[k], counterparts, received, visited)
	// e.g. an object the call created, which holds objects it wrote but stands for none of the validator's
	if (!received.has(state)) return
	const target = counterparts.get(state) as Record<PropertyKey, unknown>
	for (const k of Reflect.ownKeys(target))
		if (!Object.prototype.hasOwnProperty.call(state, k)) delete target[k]
	for (const k of Reflect.ownKeys(state)) {
		const next = copyOf(values[k], counterparts)
		if (!Object.is(target[k], next)) target[k] = next
	}
}

const describeCall = (
	call: Pick<Call, "callee" | "args"> & Partial<Pick<Call, "copies" | "ctx">>
) =>
	`calls ${call.callee.name || "a function"}(${call.args
		.map((arg, i) =>
			arg instanceof InternalTraversal ?
				`ctx ${printable(call.ctx)}`
			:	printable(
					call.copies?.[i] === uncopyable ? arg : (call.copies?.[i] ?? arg)
				)
		)
		.join(", ")})`

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
	// e.g. ctx.root, which both sides share where it isn't copied
	if (copy === uncopyable && hasDomain(data, "object"))
		counterparts.set(data, data)
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
	current.mismatch ??= unreplayed && [describeCall(unreplayed), "makes no call"]
	const observation = () =>
		`${member}(${printable(data)})${isWritten ? ", the input as arktype's morphs left it" : ""}`
	const reason =
		isWritten && !current.isCopied ?
			"which its validator received too, since it can't be copied"
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
	if (!isAlike(arktype, precompiled, counterparts, false, new Map())) {
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
	reason = arktype === precompiled ? "though each prints alike" : undefined
): never => {
	const error = new Error(
		`${pair.site} diverges from arktype at ${observation}${reason ? `, ${reason}` : ""}: arktype gives ${arktype}, its validator ${precompiled}`
	)
	// raised where the program can't catch it too, as a fallback or `expect(...).toThrow()` would
	queueMicrotask(() => {
		throw error
	})
	throw error
}

const uncopyable = Symbol("uncopyable")

// what a copy keeps, which an instance's private fields or a builtin's internal slots aren't
const copiedProtos: unknown[] = [
	Object.prototype,
	null,
	Array.prototype,
	Date.prototype,
	Map.prototype,
	Set.prototype
]

// e.g. an object holding a class instance or a Proxy whose trap throws, of which no copy is left half made
const copyOf = (value: unknown, seen: Map<object, unknown>): unknown => {
	const size = seen.size
	try {
		return _copyOf(value, seen)
	} catch {
		if (seen.size > size)
			for (const k of [...seen.keys()].slice(size)) seen.delete(k)
		return uncopyable
	}
}

const _copyOf = (value: unknown, seen: Map<object, unknown>): any => {
	if (typeof value === "function") throw uncopyable
	if (typeof value !== "object" || value === null) return value
	if (seen.has(value)) return seen.get(value)
	const proto = Object.getPrototypeOf(value)
	if (!copiedProtos.includes(proto)) throw uncopyable
	const copy =
		Array.isArray(value) ? []
		: value instanceof Date ? new Date(value.getTime())
		: value instanceof Map || value instanceof Set ? new proto.constructor()
		: Object.create(proto)
	seen.set(value, copy)
	if (value instanceof Map)
		for (const [k, v] of value) copy.set(_copyOf(k, seen), _copyOf(v, seen))
	if (value instanceof Set) for (const v of value) copy.add(_copyOf(v, seen))
	if (isIndexed(value))
		for (let i = 0; i < value.length; i++) copy.push(_copyOf(value[i], seen))
	else {
		for (const k of Reflect.ownKeys(value)) {
			const descriptor = Object.getOwnPropertyDescriptor(value, k)!
			if (!("value" in descriptor)) throw uncopyable
			const copied = _copyOf(descriptor.value, seen)
			if (
				descriptor.writable &&
				descriptor.enumerable &&
				descriptor.configurable
			)
				copy[k] = copied
			else Object.defineProperty(copy, k, { ...descriptor, value: copied })
		}
	}
	if (Object.isFrozen(value)) Object.freeze(copy)
	else if (!Object.isExtensible(value)) Object.preventExtensions(copy)
	return copy
}

// read by index, since listing an array's keys as strings costs more than copying it
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
	RegExp.prototype,
	Error.prototype
]

// a function is alike any other, since the runtime holds its own copy of each arktype holds, like a matcher's onFail
const isAlike = (
	l: unknown,
	r: unknown,
	counterparts: Map<object, unknown>,
	// e.g. an argument's copy, which keeps its source's attributes
	isCopy: boolean,
	// arktype's object by each validator object, which no two of arktype's share
	originals?: Map<object, unknown>,
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
	if (originals) {
		if ((originals.get(r) ?? l) !== l) return false
		originals.set(r, l)
	}
	if (compared.has(l)) return true
	compared.add(l)
	const alike = (left: unknown, right: unknown) =>
		isAlike(left, right, counterparts, isCopy, originals, compared)
	const proto = Object.getPrototypeOf(l)
	if (
		proto !== Object.getPrototypeOf(r) ||
		(isCopy && Object.isExtensible(l) !== Object.isExtensible(r))
	)
		return false
	if (l instanceof Date) return Object.is(l.getTime(), (r as Date).getTime())
	if (l instanceof RegExp || l instanceof Error) return String(l) === String(r)
	if (!comparedProtos.includes(proto) && String(l) !== String(r)) return false
	if (
		(l instanceof Map || l instanceof Set) &&
		!alike([...l], [...(r as Set<unknown>)])
	)
		return false
	if (isIndexed(l)) {
		return (
			isIndexed(r) && l.length === r.length && l.every((v, i) => alike(v, r[i]))
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
				(!isCopy ||
					(lDescriptor.writable === rDescriptor.writable &&
						lDescriptor.configurable === rDescriptor.configurable)) &&
				"value" in lDescriptor === "value" in rDescriptor &&
				(!("value" in lDescriptor) ||
					alike(lDescriptor.value, rDescriptor.value))
			)
		})
	)
}
