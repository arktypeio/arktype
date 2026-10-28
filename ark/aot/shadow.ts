import {
	applyCyclic,
	ArkTraversal,
	hasArkKind,
	InternalTraversal,
	type BaseRoot,
	type Traversal
} from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { ArkErrors, shareConfig } from "@ark/schema/runtime"
import { arkKind, hasDomain, includes, printable } from "@ark/util"
import { configure } from "arktype/internal/config.js"
import {
	introspectionMembers,
	keywordMetas
} from "arktype/internal/standalone.ts"
import {
	keptIssuesOf,
	pathKeyOf,
	thrownIssuesOf,
	type KeptIssue
} from "./issues.ts"

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
	return failureByErrors.get(outcome.value as object) ?? outcome.value
}

const precompiledByShadowed = new WeakMap<object, unknown>()

const originalByShadowed = new WeakMap<object, unknown>()

// two sites returning one Type and one validator return one value, as arktype's do
const shadowedByPair = new WeakMap<object, WeakMap<object, object>>()

// arktype reads what it holds as itself, like a Type a helper composes
let arktypeDepth = 0

const inArktype = <t>(run: () => t): t => {
	arktypeDepth++
	try {
		return run()
	} finally {
		arktypeDepth--
	}
}

// e.g. `type(fields)` with `fields = { name: Name }`
const swappedOf = (
	value: unknown,
	byShadowed: WeakMap<object, unknown>,
	seen: Map<object, unknown>
): unknown => {
	if (
		value === null ||
		(typeof value !== "object" && typeof value !== "function")
	)
		return value
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

// e.g. members.meta false, so a validator's meta isn't compared
export interface ShadowContract {
	members?: { meta?: boolean }
	mutatesInput?: true | "always"
	errors?: "first" | "none"
}

export const shadow = (
	site: string,
	precompile: (...args: unknown[]) => unknown,
	define: (...args: unknown[]) => unknown,
	callbacks: readonly number[],
	...args: unknown[]
): unknown => shadowUnder({}, site, precompile, define, callbacks, ...args)

export const shadowUnder = (
	contract: ShadowContract,
	site: string,
	precompile: (...args: unknown[]) => unknown,
	define: (...args: unknown[]) => unknown,
	// indices of the args a validation calls
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
		contract,
		site,
		() => inArktype(() => define(...swappedBy(originalByShadowed))),
		() => precompile(...swappedBy(precompiledByShadowed))
	)
}

interface Pair {
	contract: ShadowContract
	site: string
	original: unknown
	counterpart: unknown
}

const shadowOf = (
	contract: ShadowContract,
	site: string,
	define: () => unknown,
	precompile: () => unknown
): unknown => {
	const defined = outcomeOf(define)
	const precompiled = outcomeOf(precompile)
	// e.g. `type(User, "|", Num).exclude(Num)` returns the Proxy arktype held
	const original =
		"value" in defined ?
			(originalByShadowed.get(defined.value as never) ?? defined.value)
		:	undefined
	const pair: Pair = {
		contract,
		site,
		original,
		counterpart: "value" in precompiled ? precompiled.value : undefined
	}
	const isType = hasArkKind(original, "root")
	// e.g. not a validator, where arktype threw creating its Type
	const isData =
		"value" in defined && !isHeld(original) && typeof original !== "function"
	const observeCreation = (outcome: Outcome) =>
		"thrown" in outcome ? { threw: thrownOf(outcome.thrown) }
		: isType && contract.members?.meta !== false ?
			{ meta: bakedMetaOf(outcome.value) }
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

// a validator bakes a Type's meta, but not a keyword's
const bakedMetaOf = (t: unknown) => {
	const meta = (t as { meta?: object } | undefined)?.meta
	return meta && keywordMetas().has(meta) ? {} : meta
}

// known by arkKind, as an errors "none" runtime's don't extend the runtime's
const isErrors = (value: unknown): value is ArkErrors =>
	value instanceof ArkErrors || hasArkKind(value, "errors")

// a Standard Schema failure, compared as errors holding its issues
const failureByErrors = new WeakMap<object, unknown>()

const asErrors = (result: any): unknown => {
	if (!result.issues) return result
	const errors = {
		[arkKind]: "errors",
		issues: result.issues,
		_: result.issues
	}
	failureByErrors.set(errors, result)
	return errors
}

const validatedMembers = ["allows", "assert", "traverse", "from"] as const

const introspectedMembers = ["toJSON", "toJsonSchema", "toString"] as const

// e.g. json off a validator whose build doesn't bake it
const isUnbaked = (counterpart: unknown, k: PropertyKey): boolean =>
	typeof counterpart === "function" &&
	includes(introspectionMembers, k) &&
	!Object.getOwnPropertyDescriptor(counterpart, k)

const droppableMembers = [
	"assert",
	"traverse",
	"from",
	"meta",
	"~standard"
] as const

const typeHandlerOf = (
	pair: Pair & { original: BaseRoot }
): ProxyHandler<any> => {
	const membersByKey: Record<PropertyKey, unknown> = Object.create(null)
	// allows runs no morph, so only a validation that can write the input copies it
	const isWritten = inArktype(() => pair.original.tfs)
	const validator =
		(...path: string[]) =>
		(data: unknown) =>
			validateBoth(
				pair,
				path.join(".") || "call",
				data,
				path[0] !== "allows" && isWritten,
				(t, data) =>
					path[0] === "~standard" ? asErrors(readAt(t, path, [data]))
					: path.length ? readAt(t, path, [data])
					: t(data)
			)
	const introspector =
		(...path: string[]) =>
		(...args: unknown[]) =>
			introspect(pair, path, args)
	const memberOf = (target: BaseRoot, k: PropertyKey): unknown => {
		const counterpart = pair.counterpart as Record<PropertyKey, unknown>
		if (includes(droppableMembers, k) && !(k in counterpart))
			return boundTo(target, checkedMember(pair, target, k))
		if (includes(validatedMembers, k)) return validator(k)
		if (
			includes(introspectedMembers, k) &&
			!isUnbaked(counterpart, k) &&
			"value" in outcomeOf(() => counterpart[k])
		)
			return introspector(k)
		if (k === "meta") {
			if (keywordMetas().has(target.meta)) {
				compare(
					pair,
					"meta",
					target.meta,
					counterpart.meta,
					"since its validator doesn't bake a keyword's"
				)
			}
			// arktype holds the recorder of each function the program passed
			const meta: Record<PropertyKey, unknown> = { ...target.meta }
			for (const k in meta)
				meta[k] = callbackByWrapper.get(meta[k] as never) ?? meta[k]
			return Object.freeze(meta)
		}
		if (k === "~standard") {
			const { validate, ...standard } = counterpart["~standard"] as Record<
				string,
				unknown
			>
			return {
				...standard,
				validate: validate && validator("~standard", "validate"),
				...("jsonSchema" in standard && {
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
	const read = outcomeOf(() =>
		isUnbaked(pair.counterpart, k) ? undefined : (
			(pair.counterpart as Record<PropertyKey, unknown>)[k]
		)
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
		// e.g. `"json" in T`, false for a validator whose build drops it
		if (
			!arktypeDepth &&
			!(
				Reflect.has(target, k) &&
				hasDomain(pair.counterpart, "object") &&
				k in pair.counterpart &&
				!isUnbaked(pair.counterpart, k)
			)
		)
			checkedMember(pair, target, k, `checking for ${String(k)} with in`)
		return Reflect.has(target, k)
	}

const readAt = (t: any, path: string[], args?: unknown[]) => {
	const holder = path.slice(0, -1).reduce((o, k) => o[k], t)
	const k = path[path.length - 1]
	return args ? holder[k](...args) : holder[k]
}

// binds a method, as describe() selects nodes by `this`
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

// e.g. a Module, Scope or Generic, whose members its validator must have
const heldHandlerOf = (pair: Pair): ProxyHandler<any> => {
	const membersByKey: Record<PropertyKey, unknown> = Object.create(null)
	return {
		get: (target, k) => {
			if (arktypeDepth) return Reflect.get(target, k)
			const value = checkedMember(pair, target, k)
			if (!hasArkKind(value, "root") && !isHeld(value))
				return boundTo(target, value)
			return (membersByKey[k] ??= shadowOf(
				pair.contract,
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

// a member read, like json, or called, compared without registry suffixes
const introspect = (pair: Pair, path: string[], args?: unknown[]): unknown => {
	const read = (t: unknown) => readAt(t, path, args)
	const observed = (outcome: Outcome) =>
		"thrown" in outcome ?
			observe(outcome)
		:	observe({ value: withoutSuffixes(outcome.value) })
	const arktype = inArktype(() => outcomeOf(() => read(pair.original)))
	const member = outcomeOf(() =>
		isUnbaked(pair.counterpart, path[0]) ? undefined : (
			readAt(pair.counterpart, path)
		)
	)
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
	// e.g. a call adding a ctx error, which runs again for the validator
	isRepeated: boolean
}

interface Validation {
	// "run" once an errors "none" validator passes where arktype's Apply began
	phase: "record" | "replay" | "run"
	// whether arktype failed under errors "none", whose validator runs no Apply
	skipsApply: boolean
	calls: Call[]
	replayed: number
	// each of arktype's objects by the one the validator holds in its place
	counterparts: Map<object, unknown>
	isCopied: boolean
	mismatch: [arktype: string, precompiled: string] | undefined
}

// the validation recording or replaying callbacks, unset while one runs
let validation: Validation | undefined

const wrapperByCallback = new WeakMap<Function, Function>()

const callbackByWrapper = new WeakMap<object, Function>()

// one per function, so its `name`, `length` and identity are the program's
const callbackOf = (value: unknown): unknown => {
	if (typeof value !== "function") return value
	let wrapper = wrapperByCallback.get(value)
	if (!wrapper) {
		wrapper = new Proxy(value, {
			apply: (target, receiver, args) =>
				!validation || validation.phase === "run" ?
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
		errN: ctx.errN,
		errors: ctx._errors?._.map(e => [e.code, ...e.path]) ?? [],
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
		ctx?.errN !== ctxState?.errN ||
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

// e.g. an in-place morph's, through its arguments or what it returned
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
		if (current.skipsApply) {
			current.phase = "run"
			return settle(outcomeOfCall(callee, receiver, args))
		}
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
	// e.g. an object the call created, standing for none of the validator's
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
		skipsApply: false,
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
		current.skipsApply = pair.contract.errors === "none" && fails(arktype)
		precompiled = outcomeOf(() =>
			run(pair.counterpart, current.isCopied ? copy : data)
		)
	} finally {
		validation = outer
	}
	// errors "first" stops at any one issue, before calls arktype makes after it
	const stopsEarly = pair.contract.errors === "first" && fails(arktype)
	const unreplayed =
		current.skipsApply || stopsEarly ?
			undefined
		:	current.calls[current.replayed]
	current.mismatch ??= unreplayed && [describeCall(unreplayed), "makes no call"]
	const observation = () =>
		`${member}(${printable(data)})${isWritten ? ", the input as arktype's morphs left it" : ""}`
	const reason =
		isWritten && !current.isCopied ?
			"which its validator received too, since it can't be copied"
		:	undefined
	if (current.mismatch) fail(pair, observation(), ...current.mismatch, reason)
	const writesInput = !!pair.contract.mutatesInput
	const arktypeObserved = inArktype(() => observe(arktype, writesInput))
	const precompiledObserved = observe(precompiled, writesInput)
	// errors "none" fails with one root issue, compared without its data
	if (current.skipsApply) {
		arktypeObserved.issues = [{ code: "predicate", path: [] }]
		const { issues } = precompiledObserved
		if (issues) {
			precompiledObserved.issues = issues.map(({ code, path }) => ({
				code,
				path
			}))
		}
	}
	if (stopsEarly) {
		const { issues } = precompiledObserved
		const { issues: all } = inArktype(() =>
			observe(arktype, writesInput, false)
		)
		const found =
			issues &&
			(firstIssueOf(issues, all!, counterparts) ??
				(hasArkKind(pair.original, "root") ?
					firstIssueOf(
						issues,
						comparedOf(allIssuesOf(pair.original, data), writesInput),
						counterparts
					)
				:	undefined))
		if (found) arktypeObserved.issues = found
	}
	// a validator writing its input in place leaves it unlike arktype's
	if (current.isCopied && !pair.contract.mutatesInput && !current.skipsApply) {
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

const fails = (outcome: Outcome) =>
	"thrown" in outcome ?
		thrownIssuesOf(outcome.thrown) !== undefined
	:	isErrors(outcome.value)

// the issues errors "all" finds, any of which errors "first" can return
const allIssuesOf = (original: BaseRoot, data: unknown): KeptIssue[] =>
	inArktype(() => {
		const ctx = new ArkTraversal(data, original.$.cfg)
		if (original.hasAlias) applyCyclic(original, data, ctx)
		else original.tApply(data, ctx)
		return ctx._errors ? keptIssuesOf(ctx._errors as never, false) : []
	})

// arktype's issues alike a first-issue validator's, all at one path
const firstIssueOf = (
	found: ObservedIssue[],
	issues: ObservedIssue[],
	counterparts: Map<object, unknown>
): ObservedIssue[] | undefined => {
	const unmatched = [...issues]
	const matched: ObservedIssue[] = []
	for (const issue of found) {
		const i = unmatched.findIndex(
			candidate =>
				pathKeyOf(candidate.path) === pathKeyOf(found[0].path) &&
				isAlike(candidate, issue, new Map(counterparts), false)
		)
		if (i === -1) return
		matched.push(...unmatched.splice(i, 1))
	}
	return matched.length ? matched : undefined
}

type ObservedIssue = Omit<KeptIssue, "data">

interface Observation {
	threw?: unknown
	issues?: ObservedIssue[]
	out?: unknown
	input?: unknown
}

const observe = (
	outcome: Outcome,
	writesInput = false,
	grouped = true
): Observation => {
	if ("thrown" in outcome) {
		const issues = thrownIssuesOf(outcome.thrown, grouped)
		return issues ?
				{ threw: "TraversalError", issues: comparedOf(issues, writesInput) }
			:	{ threw: thrownOf(outcome.thrown) }
	}
	const { value } = outcome
	return isErrors(value) ?
			{ issues: comparedOf(keptIssuesOf(value as never, grouped), writesInput) }
		:	{ out: value }
}

// writing its input, a validator can change data an issue holds
const comparedOf = (issues: KeptIssue[], writesInput: boolean) =>
	writesInput ?
		issues.map(issue =>
			hasDomain(issue.data, "object") ? { ...issue, data: undefined } : issue
		)
	:	issues

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
	// also raised where a fallback or `expect(...).toThrow()` can't catch it
	queueMicrotask(() => {
		throw error
	})
	throw error
}

const uncopyable = Symbol("uncopyable")

// copyable prototypes, unlike an instance's private fields or slots
const copiedProtos: unknown[] = [
	Object.prototype,
	null,
	Array.prototype,
	Date.prototype,
	Map.prototype,
	Set.prototype
]

const copyOf = (value: unknown, seen: Map<object, unknown>): unknown => {
	const size = seen.size
	try {
		return copyOrThrow(value, seen)
	} catch {
		for (const k of [...seen.keys()].slice(size)) seen.delete(k)
		return uncopyable
	}
}

const copyOrThrow = (value: unknown, seen: Map<object, unknown>): any => {
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
	if (value instanceof Map) {
		for (const [k, v] of value)
			copy.set(copyOrThrow(k, seen), copyOrThrow(v, seen))
	}
	if (value instanceof Set)
		for (const v of value) copy.add(copyOrThrow(v, seen))
	if (isIndexed(value)) {
		for (let i = 0; i < value.length; i++)
			copy.push(copyOrThrow(value[i], seen))
	} else {
		for (const k of Reflect.ownKeys(value)) {
			const descriptor = Object.getOwnPropertyDescriptor(value, k)!
			if (!("value" in descriptor)) throw uncopyable
			const copied = copyOrThrow(descriptor.value, seen)
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

// functions are alike, as the runtime holds its own copies
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
