import {
	foreignTypesByMorph,
	ToJsonSchema,
	writeNullableJsonSchema,
	writeUnionJsonSchema,
	type BaseNode,
	type BaseRoot,
	type JsonSchema,
	type UnionJsonSchemaWriters
} from "@ark/schema"
import { hasDomain, isArray, prototypeOf, type Fn } from "@ark/util"

// what writing a Type's JSON Schema hands a fallback and does with what it
// returns, so a validator can write it again with the fallback a call passes

type Ref = { hole: number } | { object: number } | { value: unknown }

// a key, or where the keys of a fallback's result were copied in
type Entry = { key: string; ref: Ref } | { spread: number }

// each object the writer made, by id, as it was at a step
type States = Entry[][]

// each object the writer changed or made since the last step, by ascending id
type Changes = [id: number, entries: Entry[]][]

type Step =
	| { call: number; code: string; ctx: number; changes: Changes }
	// a union written from a fallback's result, which it reads
	| {
			write: keyof UnionJsonSchemaWriters
			hole: number
			args: Ref[]
			changes: Changes
	  }
	| { set: number; key: string; ref: Ref; changes: Changes }
	| { delete: number; key: string; changes: Changes }

export interface FallbackTrace {
	steps: Step[]
	result: Ref
	changes: Changes
	// each object as the writer finished it
	states: States
	arrays: boolean[]
}

const replayRefusal = new Error("refused")

// a Type reusing another at each level calls a fallback and holds objects that
// double per level, each read for every call, so reads grow as their product
const maxTracedReads = 1 << 24

// each target's trace would read as many
const tooDeep = new WeakSet<BaseRoot>()

const refuseReplay = (): never => {
	throw replayRefusal
}

const stringKeyOf = (key: string | symbol): string =>
	typeof key === "string" ? key : refuseReplay()

// a fallback's result is checked for nullish where an index's key is a morph,
// and its error is rewritten where a Type is another arktype's
const isUnreplayable = (node: BaseNode): boolean =>
	node.is("index") ?
		node.signature.branches.some(branch => branch.is("morph"))
	:	node.is("morph") && foreignTypesByMorph.has(node.piped[0] as never)

const writersByName: UnionJsonSchemaWriters = {
	union: writeUnionJsonSchema,
	nullable: writeNullableJsonSchema
}

const isUnchanged = (
	keys: string[],
	o: Record<string, unknown>,
	keysRead: string[] | undefined,
	valuesRead: unknown[]
): boolean => {
	if (keys.length !== keysRead?.length) return false
	for (let i = 0; i < keys.length; i++) {
		if (keys[i] !== keysRead[i] || !Object.is(o[keys[i]], valuesRead[i]))
			return false
	}
	return true
}

// writes with a fallback whose results are opaque, recording where each is
// put, or undefined where arktype reads one other than to write a union, as
// what it writes would then depend on what a call's fallback returns
export const traceFallbacks = (
	root: BaseRoot,
	write: (
		fallback: ToJsonSchema.UniversalFallback,
		writers: UnionJsonSchemaWriters
	) => unknown,
	// as arktype's error does, whose message is all that's kept
	printsResults?: true
): FallbackTrace | undefined => {
	if (tooDeep.has(root) || root.references.some(isUnreplayable)) return
	const objects: object[] = []
	const ids = new Map<object, number>()
	const holes = new Map<object, number>()
	const markers = new Map<string, number>()
	const copies: number[] = []
	const steps: Step[] = []
	// writing a union, where any read of a result is one it replays
	let isWritingUnion = false

	const refOf = (value: unknown): Ref => {
		if (typeof value !== "object" || value === null) return { value }
		const hole = holes.get(value)
		if (hole !== undefined) return { hole }
		let id = ids.get(value)
		if (id === undefined) {
			const prototype = prototypeOf(value)
			if (prototype !== Object.prototype && prototype !== Array.prototype)
				return { value }
			if (Object.getOwnPropertySymbols(value).length) refuseReplay()
			ids.set(value, (id = objects.length))
			objects.push(value)
		}
		return { object: id }
	}

	const states: States = []
	const keysRead: string[][] = []
	const valuesRead: unknown[][] = []
	let reads = 0

	// discovering objects as it reads them, so changes hold each reachable one
	const changesSinceLastStep = (): Changes => {
		const changes: Changes = []
		// its result is only printed where it stops arktype's write
		if (printsResults) return changes
		for (let id = 0; id < objects.length; id++) {
			if (++reads > maxTracedReads) {
				tooDeep.add(root)
				refuseReplay()
			}
			const o = objects[id] as Record<string, unknown>
			const keys = Object.keys(o)
			if (isUnchanged(keys, o, keysRead[id], valuesRead[id])) continue
			const values = keys.map(key => o[key])
			keysRead[id] = keys
			valuesRead[id] = values
			states[id] = keys.map((key, i) => {
				const spread = markers.get(key)
				return spread === undefined ?
						{ key, ref: refOf(values[i]) }
					:	{ spread }
			})
			changes.push([id, states[id]])
		}
		return changes
	}

	const unwritten = () => {
		const hole = copies.length
		// a key no schema has, copied wherever the result's keys are
		const marker = `\0fallback${hole}`
		copies.push(0)
		markers.set(marker, hole)
		const result = new Proxy(
			{ [marker]: true },
			{
				set: (_, key, value) => {
					if (isWritingUnion) refuseReplay()
					steps.push({
						set: hole,
						key: stringKeyOf(key),
						ref: refOf(value),
						changes: changesSinceLastStep()
					})
					return true
				},
				deleteProperty: (_, key) => {
					if (isWritingUnion) refuseReplay()
					steps.push({
						delete: hole,
						key: stringKeyOf(key),
						changes: changesSinceLastStep()
					})
					return true
				},
				ownKeys: target => {
					if (isWritingUnion) refuseReplay()
					copies[hole]++
					return Reflect.ownKeys(target)
				},
				getOwnPropertyDescriptor: (target, key) =>
					key === marker || printsResults ?
						Reflect.getOwnPropertyDescriptor(target, key)
					:	refuseReplay(),
				get: (target, key) =>
					key === marker ||
					(printsResults ? Reflect.get(target, key) : refuseReplay()),
				has: (target, key) =>
					printsResults ? Reflect.has(target, key) : refuseReplay(),
				getPrototypeOf: target =>
					printsResults ? Reflect.getPrototypeOf(target) : refuseReplay(),
				isExtensible: target =>
					printsResults ? Reflect.isExtensible(target) : refuseReplay(),
				defineProperty: refuseReplay,
				setPrototypeOf: refuseReplay,
				preventExtensions: refuseReplay
			}
		)
		holes.set(result, hole)
		return { hole, result }
	}

	const fallback: ToJsonSchema.UniversalFallback = ctx => {
		const { object } = refOf(ctx) as { object: number }
		const changes = changesSinceLastStep()
		const { hole, result } = unwritten()
		steps.push({ call: hole, code: ctx.code, ctx: object, changes })
		return result as JsonSchema
	}

	// holding the keys of a result, copied in
	const copiesResult = (value: unknown) =>
		hasDomain(value, "object") &&
		!holes.has(value) &&
		Object.keys(value).some(key => markers.has(key))

	// written as arktype does where it reads no fallback's result, else as
	// the replay runs
	const writers = Object.fromEntries(
		Object.entries(writersByName).map(([name, writeArktypes]) => [
			name,
			(...args: unknown[]) => {
				if (![args[0]].flat().some(copiesResult)) {
					isWritingUnion = true
					try {
						return (writeArktypes as Fn)(...args)
					} catch (e) {
						if (e !== replayRefusal) throw e
					} finally {
						isWritingUnion = false
					}
				}
				const { hole, result } = unwritten()
				steps.push({
					write: name as keyof UnionJsonSchemaWriters,
					hole,
					args: args.map((arg, i) =>
						refOf(
							// a union's meta, whose functions, like onFail, no
							// schema holds
							name === "union" && i > 1 ?
								Object.fromEntries(
									Object.entries(arg as object).filter(
										([, v]) => typeof v !== "function"
									)
								)
							:	arg
						)
					),
					changes: changesSinceLastStep()
				})
				return result as JsonSchema
			}
		])
	) as never as UnionJsonSchemaWriters

	let trace: FallbackTrace
	try {
		const result = refOf(write(fallback, writers))
		const changes = changesSinceLastStep()
		trace = { steps, result, changes, states, arrays: objects.map(isArray) }
	} catch (e) {
		if (e === replayRefusal) return
		throw e
	}
	return !printsResults && isOpaque(trace, copies) ? trace : undefined
}

// each read of a result's keys copied them somewhere, a default value's
// result is only written as a default, which arktype omits where undefined,
// and no definition is a result, which arktype checks is set to reference it
const isOpaque = (trace: FallbackTrace, copies: number[]): boolean => {
	const landed = copies.map(() => new Set<number>())
	const defaults = new Set(
		trace.steps.flatMap(step =>
			"code" in step && step.code === "defaultValue" ? [step.call] : []
		)
	)
	const isDefault = (ref: Ref) => "hole" in ref && defaults.has(ref.hole)
	for (const { changes } of [...trace.steps, trace]) {
		for (const [id, entries] of changes) {
			for (const entry of entries) {
				if ("spread" in entry) {
					if (trace.arrays[id] || defaults.has(entry.spread)) return false
					landed[entry.spread].add(id)
				} else if (
					isDefault(entry.ref) &&
					(trace.arrays[id] || entry.key !== "default")
				)
					return false
			}
		}
	}
	const holdsResult = (ref: Ref | undefined, key: string) => {
		if (!ref || !("object" in ref)) return false
		const defs = trace.states[ref.object].find(
			entry => "key" in entry && entry.key === key
		)
		return (
			!!defs &&
			"ref" in defs &&
			"object" in defs.ref &&
			trace.states[defs.ref.object].some(
				entry => "spread" in entry || "hole" in entry.ref
			)
		)
	}
	return (
		!holdsResult(trace.result, "$defs") &&
		!holdsResult(trace.result, "definitions") &&
		trace.steps.every(
			step =>
				!("code" in step) ||
				step.code !== "defs" ||
				!holdsResult({ object: step.ctx }, "defs")
		) &&
		!isDefault(trace.result) &&
		trace.steps.every(step =>
			"set" in step ? !isDefault(step.ref) || step.key === "default"
			: "args" in step ? !step.args.some(isDefault)
			: true
		) &&
		copies.every((count, hole) => count <= landed[hole].size)
	)
}

// what a call passing no handler for a code runs, given the code and the call
export type WriteHandler = (code: string, call?: number) => string | undefined

// a function of the call's fallback, making each object the writer did as it
// was when anything the fallback can run could read it
export const writeReplay = (
	trace: FallbackTrace,
	writeValue: (value: unknown) => string,
	handlerOf: WriteHandler
): string | undefined => {
	const { steps, arrays } = trace
	const defaults = new Set(
		steps.flatMap(step =>
			"code" in step && step.code === "defaultValue" ? [step.call] : []
		)
	)
	const references = arrays.map(() => new Set<string>())
	const stateCounts = arrays.map(() => 0)
	const count = (ref: Ref, by: string) => {
		if ("object" in ref) references[ref.object].add(by)
	}
	for (const [i, step] of [...steps, trace].entries()) {
		for (const [id, entries] of step.changes) {
			stateCounts[id]++
			for (const entry of entries)
				if ("ref" in entry) count(entry.ref, `${id} ${entry.key}`)
		}
		if ("code" in step) count({ object: step.ctx }, `call ${i}`)
		else if ("args" in step)
			for (const [j, arg] of step.args.entries()) count(arg, `write ${i} ${j}`)
		else if ("ref" in step) count(step.ref, `set ${i}`)
	}
	count(trace.result, "result")
	// an object read once and never changed is written where it's read
	const inlines = references.map(
		(by, id) => by.size === 1 && stateCounts[id] === 1
	)

	const statements: string[] = []
	// each object as of the step about to run
	const states: States = []
	const written: Entry[][] = []

	const isDefault = (ref: Ref) => "hole" in ref && defaults.has(ref.hole)

	const expressionOf = (ref: Ref): string =>
		"hole" in ref ? `h${ref.hole}`
		: "object" in ref ? objectAt(ref.object)
		: writeValue(ref.value)

	const objectAt = (id: number): string => {
		if (inlines[id]) return literalOf(id)
		if (!written[id]) {
			statements.push(`const o${id} = ${literalOf(id)}`)
			written[id] = states[id]
		}
		return `o${id}`
	}

	const literalOf = (id: number): string => {
		const entries = states[id]
		if (arrays[id])
			return `[${entries.map(entry => expressionOf((entry as { ref: Ref }).ref)).join(", ")}]`
		return `{ ${entries
			.map(entry => {
				if ("spread" in entry) return `...h${entry.spread}`
				const value = expressionOf(entry.ref)
				const key = keyText(entry.key)
				return isDefault(entry.ref) ?
						`...(${value} !== void 0 && { ${key}: ${value} })`
					:	`${key}: ${value}`
			})
			.join(", ")} }`
	}

	const assignKey = (target: string, key: string, ref: Ref) => {
		const value = expressionOf(ref)
		const assignment = `${target}[${JSON.stringify(key)}] = ${value}`
		statements.push(
			isDefault(ref) ? `if (${value} !== void 0) ${assignment}` : assignment
		)
	}

	// what changed in each object written so far, as of the step about to run
	const sync = (changes: Changes) => {
		for (const [id, is] of changes) states[id] = is
		for (const [id, is] of changes) {
			const was = written[id]
			if (!was || sameEntries(was, is)) continue
			written[id] = is
			const kept = was.filter(entry => {
				if (is.some(next => sameKey(entry, next))) return true
				if ("spread" in entry || arrays[id]) return refuseReplay()
				statements.push(`delete o${id}[${JSON.stringify(entry.key)}]`)
				return false
			})
			for (const [i, entry] of is.entries()) {
				const prior = kept[i]
				if (prior) {
					if (!sameKey(prior, entry)) refuseReplay()
					if (
						"ref" in entry &&
						!sameRef((prior as typeof entry).ref, entry.ref)
					)
						assignKey(`o${id}`, entry.key, entry.ref)
				} else if ("spread" in entry)
					statements.push(`Object.assign(o${id}, h${entry.spread})`)
				else assignKey(`o${id}`, entry.key, entry.ref)
			}
		}
	}

	try {
		for (const step of steps) {
			sync(step.changes)
			if ("code" in step) {
				const ctx = objectAt(step.ctx)
				const fallsBack = `f(${JSON.stringify(step.code)}, ${ctx}${handlerArg(handlerOf(step.code, step.call))})`
				// arktype writes a Date with the proto handler where the date
				// handler returns nullish
				const isDate = step.code === "date" && states[step.ctx].length === 2
				statements.push(
					`const h${step.call} = ${
						isDate ?
							`${fallsBack} ?? f("proto", { code: "proto", base: {}, proto: ${writeValue(Date)} }${handlerArg(handlerOf("proto"))})`
						:	fallsBack
					}`
				)
			} else if ("args" in step) {
				const args = step.args.map(expressionOf)
				statements.push(
					`const h${step.hole} = runtime.${step.write === "union" ? "writeUnionJsonSchema" : "writeNullableJsonSchema"}(${args.join(", ")})`
				)
			} else if ("ref" in step) assignKey(`h${step.set}`, step.key, step.ref)
			else
				statements.push(`delete h${step.delete}[${JSON.stringify(step.key)}]`)
		}
		sync(trace.changes)
		const result = expressionOf(trace.result)
		return `f => {\n"use strict"\n${statements.join("\n")}\nreturn ${result}\n}`
	} catch (e) {
		if (e === replayRefusal) return
		throw e
	}
}

const handlerArg = (handler: string | undefined) =>
	handler ? `, ${handler}` : ""

const keyText = (key: string) =>
	key === "__proto__" ? `["__proto__"]` : JSON.stringify(key)

const sameKey = (l: Entry, r: Entry): boolean =>
	"spread" in l ?
		"spread" in r && l.spread === r.spread
	:	"key" in r && l.key === r.key

const sameRef = (l: Ref, r: Ref): boolean =>
	"hole" in l ? "hole" in r && l.hole === r.hole
	: "object" in l ? "object" in r && l.object === r.object
	: "value" in r && Object.is(l.value, r.value)

const sameEntries = (l: Entry[], r: Entry[]): boolean =>
	l.length === r.length &&
	l.every(
		(entry, i) =>
			sameKey(entry, r[i]) &&
			(!("ref" in entry) || sameRef(entry.ref, (r[i] as typeof entry).ref))
	)

export const fallbackCodes = Object.keys(
	ToJsonSchema.defaultConfig.fallback
) as ToJsonSchema.Code[]
