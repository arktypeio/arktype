// Shared by the suites that run in a fresh child process against a root's
// built arktype (init.ts, create.ts, validate.ts, memory.ts). Node runs them
// directly, stripping their types, without the ark-ts condition, which would
// resolve the root's packages to their sources. Their imports of arktype are
// dynamic and only typed from its sources.
//
// A child reads its options as JSON from argv[2] and prints one line of JSON:
// metric name -> a number, or an array of samples taken within the process.

import { join } from "node:path"
import { pathToFileURL } from "node:url"
import type { ProcessResult } from "./suites.ts"

export type ChildOptions = {
	root: string
	workload?: string
}

export const options: ChildOptions = JSON.parse(process.argv[2])

export const report = (metrics: ProcessResult): boolean =>
	process.stdout.write(`${JSON.stringify(metrics)}\n`)

export const arktypeUrl = (root: string, file = "index.js"): string =>
	pathToFileURL(join(root, "ark", "type", "out", file)).href

export type Arktype = typeof import("arktype")

type ArktypeConfig = typeof import("../../type/config.ts")

/** imports the root's arktype, configured jitless first if requested */
export const importArktype = async (
	root: string,
	{ jitless = false } = {}
): Promise<Arktype> => {
	if (jitless) {
		const config: ArktypeConfig = await import(arktypeUrl(root, "config.js"))
		config.configure({ jitless: true })
	}
	return import(arktypeUrl(root))
}

/** what the suites read of the registry, which is `globalThis.$ark` */
type Registry = { nodesByRegisteredId: Record<string, unknown> }

/** the registry emitted code references, at `globalThis.$ark` in a fresh process */
const registry = () => (globalThis as unknown as { $ark: Registry }).$ark

export const registeredIds = (): number =>
	Object.keys(registry().nodesByRegisteredId).length

/** the properties of a node, scope or module that reachable follows */
type Reachable = {
	" arkKind"?: string
	precompilation?: unknown
	$?: unknown
	referencesById?: Record<string, unknown>
}

// mirrors @ark/schema's isNode
const isNode = (value: Reachable) =>
	value[" arkKind"] === "root" || value[" arkKind"] === "constraint"

/**
 * Walks everything reachable from $ark.nodesByRegisteredId and seeds through
 * each value's referencesById, its scope ($) and a module's members,
 * collecting the distinct node instances and precompilation strings found on
 * nodes and scopes.
 */
export const reachable = (
	seeds: readonly unknown[] = []
): { nodes: number; precompilations: Set<string> } => {
	const nodes = new Set<Reachable>()
	const precompilations = new Set<string>()
	const seen = new Set<Reachable>()
	const pending = [...Object.values(registry().nodesByRegisteredId), ...seeds]
	while (pending.length) {
		const value = pending.pop()
		if (
			value === null ||
			(typeof value !== "object" && typeof value !== "function") ||
			seen.has(value)
		)
			continue
		const walked: Reachable = value
		seen.add(walked)
		if (isNode(walked)) nodes.add(walked)
		if (typeof walked.precompilation === "string")
			precompilations.add(walked.precompilation)
		if (walked.$) pending.push(walked.$)
		if (walked[" arkKind"] === "module") pending.push(...Object.values(walked))
		const references = walked.referencesById
		if (references) for (const id in references) pending.push(references[id])
	}
	return { nodes: nodes.size, precompilations }
}

export const totalLength = (strings: Iterable<string>): number => {
	let total = 0
	for (const s of strings) total += s.length
	return total
}

/**
 * Runs fn and returns its result along with the total length of precompilation
 * strings that became reachable while it ran, i.e. the JS source it emitted
 * and retained. A root is registered only if an alias references it by id, so
 * the walk also starts from created, which should hold everything fn creates
 * and anything created before it that fn's creations could share.
 */
export const measureEmitted = <result>(
	fn: () => result,
	created: readonly unknown[]
): { result: result; emitted: number } => {
	const before = reachable(created).precompilations
	const result = fn()
	let emitted = 0
	for (const source of reachable(created).precompilations)
		if (!before.has(source)) emitted += source.length
	return { result, emitted }
}

/** a definition of string keywords, nested at most once */
export type ObjectDefinition = Record<string, string | Record<string, string>>

/**
 * The object type from ark/repo/design/featherduster.md, with every key
 * suffixed by tag so types with different tags share no structure the hash
 * cache could dedupe (their leaves, like "string", are still shared).
 */
export const objectDefinition = (tag: string): ObjectDefinition => ({
	[`k${tag}`]: "string",
	[`n${tag}`]: "number > 5",
	[`u${tag}`]: "'a'|'b'|'c'",
	[`arr${tag}`]: "string[]",
	[`nested${tag}`]: { [`x${tag}`]: "number", [`y${tag}`]: "string" }
})
