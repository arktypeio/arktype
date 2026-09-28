// Shared by the suites that run in a fresh child process against a root's
// built arktype (init.js, create.js, validate.js, memory.js). They are plain JS
// so they start fast and run without the ark-ts condition, which would resolve
// the root's packages to their sources.
//
// A child reads its options as JSON from argv[2] and prints one line of JSON:
// metric name -> a number, or an array of samples taken within the process.

import { join } from "node:path"
import { pathToFileURL } from "node:url"

export const options = JSON.parse(process.argv[2])

export const report = metrics =>
	process.stdout.write(`${JSON.stringify(metrics)}\n`)

export const arktypeUrl = (root, file = "index.js") =>
	pathToFileURL(join(root, "ark", "type", "out", file)).href

/** imports the root's arktype, configured jitless first if requested */
export const importArktype = async (root, { jitless = false } = {}) => {
	if (jitless)
		(await import(arktypeUrl(root, "config.js"))).configure({ jitless: true })
	return import(arktypeUrl(root))
}

/** the registry emitted code references, at `globalThis.$ark` in a fresh process */
const registry = () => globalThis.$ark

export const registeredIds = () =>
	Object.keys(registry().nodesByRegisteredId).length

// mirrors @ark/schema's isNode
const isNode = value =>
	value[" arkKind"] === "root" || value[" arkKind"] === "constraint"

/**
 * Walks everything reachable from $ark.nodesByRegisteredId through each
 * value's referencesById and its scope ($), collecting the distinct node
 * instances and precompilation strings found on nodes and scopes.
 */
export const reachable = () => {
	const nodes = new Set()
	const precompilations = new Set()
	const seen = new Set()
	const pending = Object.values(registry().nodesByRegisteredId)
	while (pending.length) {
		const value = pending.pop()
		if (
			value === null ||
			(typeof value !== "object" && typeof value !== "function") ||
			seen.has(value)
		)
			continue
		seen.add(value)
		if (isNode(value)) nodes.add(value)
		if (typeof value.precompilation === "string")
			precompilations.add(value.precompilation)
		if (value.$) pending.push(value.$)
		const references = value.referencesById
		if (references) for (const id in references) pending.push(references[id])
	}
	return { nodes: nodes.size, precompilations }
}

export const totalLength = strings => {
	let total = 0
	for (const s of strings) total += s.length
	return total
}

/**
 * Runs fn and returns its result along with the total length of precompilation
 * strings that became reachable while it ran, i.e. the JS source it emitted
 * and retained.
 */
export const measureEmitted = fn => {
	const before = reachable().precompilations
	const result = fn()
	let emitted = 0
	for (const source of reachable().precompilations)
		if (!before.has(source)) emitted += source.length
	return { result, emitted }
}

/**
 * The object type from ark/repo/design/featherduster.md, with every key
 * suffixed by tag so types with different tags share no structure the hash
 * cache could dedupe (their leaves, like "string", are still shared).
 */
export const objectDefinition = tag => ({
	[`k${tag}`]: "string",
	[`n${tag}`]: "number > 5",
	[`u${tag}`]: "'a'|'b'|'c'",
	[`arr${tag}`]: "string[]",
	[`nested${tag}`]: { [`x${tag}`]: "number", [`y${tag}`]: "string" }
})
