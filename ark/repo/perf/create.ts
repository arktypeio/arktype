// create: type creation, one workload per process so each starts from the
// registry a fresh import leaves. Definitions are built before timing starts,
// and warm-up definitions use tags of their own so they share nothing
// dedupable with the timed ones.

import {
	importArktype,
	measureEmitted,
	objectDefinition,
	options,
	report,
	type ObjectDefinition
} from "./child.ts"
import type { ProcessResult } from "./suites.ts"
import type { Type } from "arktype"

const { root, workload } = options
const { type, scope } = await importArktype(root, {
	jitless: workload === "object jitless"
})

type CompositeDefinition = Record<string, string | Type>
type ScopeAliases = Record<string, Record<string, string>>

// every type and module a workload creates, for measureEmitted to walk
const created: unknown[] = []

const time = <input>(inputs: input[], create: (input: input) => unknown) => {
	globalThis.gc?.()
	const start = performance.now()
	for (const input of inputs) created.push(create(input))
	return performance.now() - start
}

const usPer = (ms: number, count: number) => (ms * 1000) / count

const objectInputs = () => {
	for (let i = 0; i < 100; i++) created.push(type(objectDefinition(`w${i}`)))
	return Array.from({ length: 2000 }, (_, i) => objectDefinition(`t${i}`))
}

// a pool member: six keys, including an optional one and a nested object
const poolMember = (tag: string): ObjectDefinition => ({
	[`id${tag}`]: "string",
	[`count${tag}`]: "number.integer >= 0",
	[`kind${tag}`]: "'a' | 'b' | 'c'",
	[`tags${tag}`]: "string[]",
	[`note${tag}?`]: "string",
	[`pos${tag}`]: { [`x${tag}`]: "number", [`y${tag}`]: "number" }
})

// references 5 distinct members of the pool, chosen by i
const compositeDefinition = (pool: Type[], tag: string, i: number) => {
	const def: CompositeDefinition = { [`id${tag}`]: "string" }
	for (let k = 0; k < 5; k++) def[`m${k}${tag}`] = pool[(i * 7 + k * 11) % 40]
	return def
}

// 20 aliases, each referencing another as a binary tree would, plus one
// self-referential alias that nothing else references
const scopeAliases = (tag: string) => {
	const def: ScopeAliases = {}
	for (let k = 0; k < 20; k++) {
		def[`a${k}`] = {
			[`id${tag}`]: "string",
			[`n${k}${tag}`]: "number > 1",
			[`tag${k}${tag}`]: "'x' | 'y'",
			[`ref${k}${tag}`]: k ? `a${k >> 1}` : "boolean"
		}
	}
	def.a19[`children${tag}?`] = "a19[]"
	return def
}

const workloads: Record<string, () => ProcessResult> = {
	object: () => {
		const inputs = objectInputs()
		const { result: ms, emitted } = measureEmitted(
			() => time(inputs, type),
			created
		)
		return {
			"object (µs/type)": usPer(ms, inputs.length),
			"object emitted (bytes/type)": emitted / inputs.length
		}
	},
	"object jitless": () => {
		const inputs = objectInputs()
		return {
			"object jitless (µs/type)": usPer(time(inputs, type), inputs.length)
		}
	},
	composite: () => {
		const poolOf = (prefix: string): Type[] =>
			Array.from({ length: 40 }, (_, j) => type(poolMember(`${prefix}${j}`)))
		const warmupPool = poolOf("wp")
		for (let i = 0; i < 20; i++)
			created.push(type(compositeDefinition(warmupPool, `w${i}`, i)))
		const pool = poolOf("p")
		created.push(...warmupPool, ...pool)
		const inputs = Array.from({ length: 200 }, (_, i) =>
			compositeDefinition(pool, `c${i}`, i)
		)
		const { result: ms, emitted } = measureEmitted(
			() => time(inputs, type),
			created
		)
		return {
			"composite (µs/type)": usPer(ms, inputs.length),
			"composite emitted (bytes)": emitted
		}
	},
	scope: () => {
		for (let i = 0; i < 5; i++)
			created.push(scope(scopeAliases(`w${i}`)).export())
		const inputs = Array.from({ length: 100 }, (_, i) => scopeAliases(`s${i}`))
		const { result: ms, emitted } = measureEmitted(
			() => time(inputs, aliases => scope(aliases).export()),
			created
		)
		return {
			"scope (µs/scope)": usPer(ms, inputs.length),
			"scope emitted (bytes/scope)": emitted / inputs.length
		}
	}
}

report(workloads[workload!]())
