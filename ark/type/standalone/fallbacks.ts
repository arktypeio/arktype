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

// each object the writer made so far, by id, as it was at a step
type States = Entry[][]

type Step =
	| { call: number; code: string; ctx: number; states: States }
	// a union written from a fallback's result, which it reads
	| {
			write: keyof UnionJsonSchemaWriters
			hole: number
			args: Ref[]
			states: States
	  }
	| { set: number; key: string; ref: Ref; states: States }
	| { delete: number; key: string; states: States }

export interface FallbackTrace {
	steps: Step[]
	result: Ref
	states: States
	arrays: boolean[]
}

const replayRefusal = new Error("refused")

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
	if (root.references.some(isUnreplayable)) return
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

	// discovering objects as it reads them, so states hold each reachable one
	const snapshot = (): States => {
		const states: States = []
		for (let i = 0; i < objects.length; i++) {
			const o = objects[i] as Record<string, unknown>
			states.push(
				Object.keys(o).map(key => {
					const spread = markers.get(key)
					return spread === undefined ? { key, ref: refOf(o[key]) } : { spread }
				})
			)
		}
		return states
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
						states: snapshot()
					})
					return true
				},
				deleteProperty: (_, key) => {
					if (isWritingUnion) refuseReplay()
					steps.push({
						delete: hole,
						key: stringKeyOf(key),
						states: snapshot()
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
		const states = snapshot()
		const { hole, result } = unwritten()
		steps.push({ call: hole, code: ctx.code, ctx: object, states })
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
					states: snapshot()
				})
				return result as JsonSchema
			}
		])
	) as never as UnionJsonSchemaWriters

	let trace: FallbackTrace
	try {
		const result = refOf(write(fallback, writers))
		const states = snapshot()
		trace = { steps, result, states, arrays: objects.map(isArray) }
	} catch (e) {
		if (e === replayRefusal) return
		throw e
	}
	return isOpaque(trace, copies) ? trace : undefined
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
	for (const { states } of [...trace.steps, trace]) {
		for (let id = 0; id < states.length; id++) {
			for (const entry of states[id]) {
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
	const firstStates: Entry[][] = []
	const changes = arrays.map(() => false)
	const count = (ref: Ref, by: string) => {
		if ("object" in ref) references[ref.object].add(by)
	}
	for (const [i, step] of [...steps, trace].entries()) {
		for (const [id, entries] of step.states.entries()) {
			const first = (firstStates[id] ??= entries)
			if (!sameEntries(first, entries)) changes[id] = true
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
	const inlines = references.map((by, id) => by.size === 1 && !changes[id])

	const statements: string[] = []
	const written: Entry[][] = []

	const isDefault = (ref: Ref) => "hole" in ref && defaults.has(ref.hole)

	const expressionOf = (ref: Ref, states: States): string =>
		"hole" in ref ? `h${ref.hole}`
		: "object" in ref ? objectAt(ref.object, states)
		: writeValue(ref.value)

	const objectAt = (id: number, states: States): string => {
		if (inlines[id]) return literalOf(id, states)
		if (!written[id]) {
			statements.push(`const o${id} = ${literalOf(id, states)}`)
			written[id] = states[id]
		}
		return `o${id}`
	}

	const literalOf = (id: number, states: States): string => {
		const entries = states[id]
		if (arrays[id])
			return `[${entries.map(entry => expressionOf((entry as { ref: Ref }).ref, states)).join(", ")}]`
		return `{ ${entries
			.map(entry => {
				if ("spread" in entry) return `...h${entry.spread}`
				const value = expressionOf(entry.ref, states)
				const key = keyText(entry.key)
				return isDefault(entry.ref) ?
						`...(${value} !== void 0 && { ${key}: ${value} })`
					:	`${key}: ${value}`
			})
			.join(", ")} }`
	}

	const assignKey = (target: string, key: string, ref: Ref, states: States) => {
		const value = expressionOf(ref, states)
		const assignment = `${target}[${JSON.stringify(key)}] = ${value}`
		statements.push(
			isDefault(ref) ? `if (${value} !== void 0) ${assignment}` : assignment
		)
	}

	// what changed in each object written so far, as of the step about to run
	const sync = (states: States) => {
		for (let id = 0; id < written.length; id++) {
			const was = written[id]
			if (!was) continue
			const is = states[id]
			if (sameEntries(was, is)) continue
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
						assignKey(`o${id}`, entry.key, entry.ref, states)
				} else if ("spread" in entry)
					statements.push(`Object.assign(o${id}, h${entry.spread})`)
				else assignKey(`o${id}`, entry.key, entry.ref, states)
			}
		}
	}

	try {
		for (const step of steps) {
			sync(step.states)
			if ("code" in step) {
				const ctx = objectAt(step.ctx, step.states)
				const fallsBack = `f(${JSON.stringify(step.code)}, ${ctx}${handlerArg(handlerOf(step.code, step.call))})`
				// arktype writes a Date with the proto handler where the date
				// handler returns nullish
				const isDate =
					step.code === "date" && step.states[step.ctx].length === 2
				statements.push(
					`const h${step.call} = ${
						isDate ?
							`${fallsBack} ?? f("proto", { code: "proto", base: {}, proto: ${writeValue(Date)} }${handlerArg(handlerOf("proto"))})`
						:	fallsBack
					}`
				)
			} else if ("args" in step) {
				const args = step.args.map(arg => expressionOf(arg, step.states))
				statements.push(
					`const h${step.hole} = runtime.${step.write === "union" ? "writeUnionJsonSchema" : "writeNullableJsonSchema"}(${args.join(", ")})`
				)
			} else if ("ref" in step)
				assignKey(`h${step.set}`, step.key, step.ref, step.states)
			else
				statements.push(`delete h${step.delete}[${JSON.stringify(step.key)}]`)
		}
		sync(trace.states)
		const result = expressionOf(trace.result, trace.states)
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
