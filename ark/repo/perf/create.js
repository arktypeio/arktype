// create: type creation, one workload per process so each starts from the
// registry a fresh import leaves. Definitions are built before timing starts,
// and warm-up definitions use tags of their own so they share nothing
// dedupable with the timed ones.

import {
	importArktype,
	measureEmitted,
	objectDefinition,
	options,
	report
} from "./child.js"

const { root, workload } = options
const { type, scope } = await importArktype(root, {
	jitless: workload === "object jitless"
})

const time = (inputs, create) => {
	globalThis.gc?.()
	const start = performance.now()
	for (const input of inputs) create(input)
	return performance.now() - start
}

const usPer = (ms, count) => (ms * 1000) / count

const objectInputs = () => {
	for (let i = 0; i < 100; i++) type(objectDefinition(`w${i}`))
	return Array.from({ length: 2000 }, (_, i) => objectDefinition(`t${i}`))
}

// a pool member: six keys, including an optional one and a nested object
const poolMember = tag => ({
	[`id${tag}`]: "string",
	[`count${tag}`]: "number.integer >= 0",
	[`kind${tag}`]: "'a' | 'b' | 'c'",
	[`tags${tag}`]: "string[]",
	[`note${tag}?`]: "string",
	[`pos${tag}`]: { [`x${tag}`]: "number", [`y${tag}`]: "number" }
})

// references 5 distinct members of the pool, chosen by i
const compositeDefinition = (pool, tag, i) => {
	const def = { [`id${tag}`]: "string" }
	for (let k = 0; k < 5; k++) def[`m${k}${tag}`] = pool[(i * 7 + k * 11) % 40]
	return def
}

// 20 aliases, each referencing another as a binary tree would, plus one
// self-referential alias that nothing else references
const scopeAliases = tag => {
	const def = {}
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

const workloads = {
	object: () => {
		const inputs = objectInputs()
		const { result: ms, emitted } = measureEmitted(() => time(inputs, type))
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
		const poolOf = prefix =>
			Array.from({ length: 40 }, (_, j) => type(poolMember(`${prefix}${j}`)))
		const warmupPool = poolOf("wp")
		for (let i = 0; i < 20; i++)
			type(compositeDefinition(warmupPool, `w${i}`, i))
		const pool = poolOf("p")
		const inputs = Array.from({ length: 200 }, (_, i) =>
			compositeDefinition(pool, `c${i}`, i)
		)
		const { result: ms, emitted } = measureEmitted(() => time(inputs, type))
		return {
			"composite (µs/type)": usPer(ms, inputs.length),
			"composite emitted (bytes)": emitted
		}
	},
	scope: () => {
		for (let i = 0; i < 5; i++) scope(scopeAliases(`w${i}`)).export()
		const inputs = Array.from({ length: 100 }, (_, i) => scopeAliases(`s${i}`))
		const { result: ms, emitted } = measureEmitted(() =>
			time(inputs, aliases => scope(aliases).export())
		)
		return {
			"scope (µs/scope)": usPer(ms, inputs.length),
			"scope emitted (bytes/scope)": emitted / inputs.length
		}
	}
}

report(workloads[workload]())
