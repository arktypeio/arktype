import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import type { Diagnostic } from "@ark/aot"
import { type } from "arktype"
import { keywordMetas } from "arktype/internal/standalone.ts"
import fc from "fast-check"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
	dataOf,
	defOf,
	emptyArray,
	morphs,
	noise,
	nodeOf,
	predicates,
	sourceOf,
	tried,
	unnamedHoles,
	type Node
} from "./grammar.ts"
import { lacks, testedOptions } from "./contract.ts"
import { serialize, type World } from "./perturbationWorker.ts"
import {
	buildPerturbed,
	comparable,
	compareWorlds,
	runWorld,
	type BuildOptions,
	type Disagreement
} from "./testPerturbation.ts"

// generated programs run as written and precompiled in standalone and
// cache mode, unchanged and under each of testPerturbation's perturbations:
// ARK_PRECOMPILE_PROGRAMS=<count>[:<seed>] pnpm testPrograms

interface Fragment {
	// containers.ts exports, which a perturbation can mock or swap
	containers: string[]
	exports: string[]
	main: string[]
}

type FragmentOf = (id: string) => Fragment

// a site main.ts observes: what it creates and how that validates inputs
const observed = (
	key: string,
	site: string,
	inputs: unknown[],
	sources: string[] = []
) =>
	`$arkObserve(${JSON.stringify(key)}, () => ${site}, () => [${[...inputs.map(sourceOf), ...sources].join(", ")}])`

const inputsOf = (data: fc.Arbitrary<unknown>) =>
	fc.array(fc.oneof({ weight: 4, arbitrary: data }, noise), {
		minLength: 1,
		maxLength: 4
	})

const noAliases = (name: string) =>
	fc.constant(`no alias ${name}`) as fc.Arbitrary<unknown>

const isDefinable = (def: unknown) => {
	try {
		type(def as never)
		return true
	} catch {
		return false
	}
}

const definitions: fc.Arbitrary<FragmentOf> = nodeOf([]).chain(node =>
	inputsOf(dataOf(node, noAliases)).map(
		(inputs): FragmentOf =>
			id => ({
				containers: [],
				exports: [],
				main: [observed(id, `type(${sourceOf(defOf(node))})`, inputs)]
			})
	)
)

// unions discriminated but for a branch holding a node, which data matching
// no case reaches as their default case
const partlyDiscriminated = {
	units: (rest: string) => `type("'a' | 'b'").or(${rest})`,
	keyed: (rest: string) =>
		`type({ k: "'a'", a: "string" }).or({ k: "'b'", a: "number" }).or({ k: ${rest}, a: "boolean" })`,
	paired: (rest: string) =>
		`type({ k: "'a' | 'b'", a: "string" }).or({ k: "1 | true", a: "number" }).or({ k: ${rest}, a: "boolean" })`
}

// keywords whose predicate or morph a default case holds
const defaultCaseNodes = fc.constantFrom<Node>(
	{ kind: "keyword", name: "string.url" },
	{ kind: "keyword", name: "string.email" },
	{ kind: "keyword", name: "string.numeric.parse" },
	{ kind: "keyword", name: "string.trim" },
	{ kind: "morph", node: { kind: "keyword", name: "string" }, morph: "size" },
	{
		kind: "union",
		l: { kind: "keyword", name: "string.url" },
		r: { kind: "keyword", name: "string.numeric.parse" }
	}
)

// the default case holding a node Allows doesn't decide, as a predicate's
const defaultCases: fc.Arbitrary<FragmentOf> = fc
	.record({
		node: fc.oneof(nodeOf([]), defaultCaseNodes),
		holder: fc.constantFrom(
			...(Object.keys(
				partlyDiscriminated
			) as (keyof typeof partlyDiscriminated)[])
		)
	})
	.chain(({ node, holder }) => {
		const rest = dataOf(node, noAliases)
		return inputsOf(
			holder === "units" ?
				fc.oneof(rest, fc.constantFrom("a", "c"))
			:	fc.oneof(
					rest.map(k => ({ k, a: true })),
					fc.constantFrom(
						{ k: "a", a: true },
						{ k: "a", a: "" },
						{ k: 1, a: 0 },
						{ k: true, a: "" },
						{ k: "c", a: "" }
					)
				)
		).map(
			(inputs): FragmentOf =>
				id => ({
					containers: [],
					exports: [],
					main: [
						observed(
							id,
							partlyDiscriminated[holder](sourceOf(defOf(node))),
							inputs
						)
					]
				})
		)
	})

// each level of a DAG references the one below twice, so written out in full
// its strings and hashes would double with each level
const levels = {
	arrays: {
		def: (below: string) =>
			`type({ id: "string", left: ${below}.array(), right: ${below}.array() })`,
		data: (below: unknown, isRight: boolean) => ({
			id: "",
			left: isRight ? [] : [below],
			right: isRight ? [below] : []
		})
	},
	optional: {
		def: (below: string) => `type({ "l?": ${below}, "r?": ${below}.array() })`,
		data: (below: unknown, isRight: boolean) =>
			isRight ? { r: [below] } : { l: below }
	},
	tuple: {
		def: (below: string) => `type([${below}.array(), [${below}, "?"]])`,
		data: (below: unknown, isRight: boolean) =>
			isRight ? [[], below] : [[below]]
	}
}

// data reaching the bottom through one side at each level, or noise at one
const levelDataOf = (
	bottom: Node,
	shape: keyof typeof levels,
	depth: number
): fc.Arbitrary<unknown> =>
	fc
		.record({
			data: dataOf(bottom, noAliases),
			sides: fc.array(fc.boolean(), { minLength: depth, maxLength: depth }),
			noisy: fc.option(fc.tuple(fc.nat(depth - 1), noise), { nil: undefined })
		})
		.map(({ data, sides, noisy }) =>
			sides.reduce(
				(below, isRight, i) =>
					noisy?.[0] === i ? noisy[1] : levels[shape].data(below, isRight),
				data
			)
		)

// a Type reused at each level of another, deep enough that its expression is
// elided and its hash digested, alone and in a union with one differing only
// at the bottom
const dags: fc.Arbitrary<FragmentOf> = fc
	.record({
		bottom: nodeOf([]),
		other: fc.option(nodeOf([]), { nil: undefined }),
		shape: fc.constantFrom(...(Object.keys(levels) as (keyof typeof levels)[])),
		depth: fc.oneof(
			fc.integer({ min: 1, max: 4 }),
			fc.integer({ min: 8, max: 12 })
		)
	})
	// a Type the module declares must be definable for the module to load
	.filter(
		({ bottom, other }) =>
			isDefinable(defOf(bottom)) && (!other || isDefinable(defOf(other)))
	)
	.chain(({ bottom, other, shape, depth }) =>
		inputsOf(
			other ?
				fc.oneof(
					levelDataOf(bottom, shape, depth),
					levelDataOf(other, shape, depth)
				)
			:	levelDataOf(bottom, shape, depth)
		).map(
			(inputs): FragmentOf =>
				id => {
					const declare = (name: string, node: Node) =>
						Array.from({ length: depth + 1 }, (_, i) =>
							i === 0 ?
								`const ${name}0 = type(${sourceOf(defOf(node))})`
							:	`const ${name}${i} = ${levels[shape].def(`${name}${i - 1}`)}`
						)
					return {
						containers: [],
						exports: [],
						main: [
							...declare(`D${id}_`, bottom),
							observed(id, `D${id}_${depth}`, inputs),
							...(other ?
								[
									...declare(`E${id}_`, other),
									observed(
										`${id}.or`,
										`D${id}_${depth}.or(E${id}_${depth})`,
										inputs
									)
								]
							:	[])
						]
					}
				}
		)
	)

// Types read only for .allows, by a site or a function calling it
const allowsReads = {
	inline: (def: string) => `type(${def}).allows`,
	local: (def: string, id: string) => `A${id}.allows`,
	checked: (def: string, id: string) => `check${id}`
}

const allowsOnly: fc.Arbitrary<FragmentOf> = fc
	.record({
		node: nodeOf([]),
		read: fc.constantFrom(
			...(Object.keys(allowsReads) as (keyof typeof allowsReads)[])
		),
		isImported: fc.boolean()
	})
	.filter(({ node, read }) => read === "inline" || isDefinable(defOf(node)))
	.chain(({ node, read, isImported }) =>
		inputsOf(dataOf(node, noAliases)).map(
			(inputs): FragmentOf =>
				id => {
					const def = sourceOf(defOf(node))
					const declarations =
						read === "inline" ?
							[]
						:	[
								`const A${id} = type(${def})`,
								`const check${id} = data => A${id}.allows(data)`
							]
					return {
						containers:
							isImported ?
								declarations.map(declaration => `export ${declaration}`)
							:	[],
						exports:
							isImported && declarations.length ? [`A${id}`, `check${id}`] : [],
						main: [
							...(isImported ? [] : declarations),
							observed(id, allowsReads[read](def, id), inputs)
						]
					}
				}
		)
	)

const holders = {
	object: (element: string) => `type({ a: ${element} })`,
	tuple: (element: string) => `type([${element}])`,
	prefixed: (element: string) => `type(["string", ${element}])`,
	scope: (element: string) => `scope({ o: { a: ${element} } }).type("o")`
}

// a default checked by a narrow reading state that changes between sites
const narrowedState: fc.Arbitrary<FragmentOf> = fc
	.array(
		fc.record({
			holder: fc.constantFrom(
				...(Object.keys(holders) as (keyof typeof holders)[])
			),
			limit: fc.integer({ min: 0, max: 10 }),
			inputs: inputsOf(fc.constantFrom({}, { a: 1 }, [], [1], ["a"], ["a", 20]))
		}),
		{ minLength: 2, maxLength: 3 }
	)
	.chain(sites =>
		fc.integer({ min: 0, max: 10 }).map(
			(defaultValue): FragmentOf =>
				id => {
					const element = `[["number", ":", atMost${id}], "=", ${defaultValue}]`
					return {
						containers: [],
						exports: [],
						main: [
							`let max${id} = 10`,
							`const atMost${id} = n => { const limit = max${id}; return n <= limit }`,
							...sites.flatMap((site, i) => [
								observed(
									`${id}.${i}`,
									holders[site.holder](element),
									site.inputs
								),
								`max${id} = ${site.limit}`
							])
						]
					}
				}
		)
	)

const defaultedReads = {
	omit: (t: string) => `${t}.omit("a")`,
	pick: (t: string) => `${t}.pick("x")`,
	keyof: (t: string) => `${t}.keyof()`,
	json: (t: string) => `${t}.omit("a").json`,
	toJsonSchema: (t: string) => `${t}.omit("a").toJsonSchema()`,
	and: (t: string) => `${t}.and({ y: "string" })`,
	array: (t: string) => `${t}.array()`
}

const scopedReads = [
	`.type("o")`,
	`.type("keyof o")`,
	`.type({ o: "o" })`,
	`.type("o | string").extract("string")`,
	`.export().p`
]

// a default a narrow may reject, reached through derivations or a Scope
const defaults: fc.Arbitrary<FragmentOf> = fc
	.record({
		predicate: fc.constantFrom(
			...(Object.keys(predicates) as (keyof typeof predicates)[])
		),
		value: fc.constantFrom(0, 1, 3, 4),
		isScoped: fc.boolean(),
		reads: fc.array(fc.nat(scopedReads.length - 1), {
			minLength: 1,
			maxLength: 3
		}),
		derivations: fc.array(
			fc.constantFrom(
				...(Object.keys(defaultedReads) as (keyof typeof defaultedReads)[])
			),
			{ minLength: 1, maxLength: 3 }
		),
		// a site the program never runs, which the build evaluates first
		unused: fc.option(fc.nat(scopedReads.length - 1), { nil: undefined }),
		inputs: inputsOf(
			fc.constantFrom({}, { x: "", a: 3 }, { x: "", a: 4 }, "a", "x", [])
		)
	})
	.map(
		({
			predicate,
			value,
			isScoped,
			reads,
			derivations,
			unused,
			inputs
		}): FragmentOf =>
			id => {
				if (!isScoped) {
					const defined = `type({ x: "string", a: [["number", ":", ${predicate}], "=", ${value}] })`
					return {
						containers: [],
						exports: [],
						main: derivations.map((derivation, i) =>
							observed(
								`${id}.${i}`,
								defaultedReads[derivation](defined),
								inputs
							)
						)
					}
				}
				return {
					containers: [],
					exports: [],
					main: [
						`const $${id} = scope({ ev: ["number", ":", ${predicate}], o: { a: "ev = ${value}" }, p: { b: "ev" } })`,
						...(unused === undefined ?
							[]
						:	[`const unused${id} = () => $${id}${scopedReads[unused]}`]),
						...reads.map((read, i) =>
							observed(`${id}.${i}`, `$${id}${scopedReads[read]}`, inputs)
						)
					]
				}
			}
	)

// what each alias allows, to a bounded depth where it cycles
const dataByAliasOf = (nodes: Record<string, Node>) =>
	fc.letrec(tie =>
		Object.fromEntries(
			Object.entries(nodes).map(([name, node]) => [
				name,
				fc.oneof(
					{ maxDepth: 2, depthIdentifier: "alias" },
					noise,
					dataOf(node, tie)
				)
			])
		)
	)

const moduleSites = {
	prop: (m: string, k: string) => `type({ x: ${m}.${k} })`,
	or: (m: string, k: string) => `${m}.${k}.or(${m}.a)`,
	array: (m: string, k: string) => `${m}.${k}.array()`,
	keyof: (m: string, k: string) => `${m}.${k}.keyof()`,
	member: (m: string, k: string) => `${m}.${k}`
}

const thunkAlias = { kind: "alias", name: "t" } as const

// sites a thunk alias decides that hold none of what it returns
const throughThunk = fc.constantFrom<Node>(
	{ kind: "union", l: thunkAlias, r: { kind: "literal", value: 5n } },
	{ kind: "keyof", node: thunkAlias },
	{
		kind: "intersection",
		l: thunkAlias,
		r: {
			kind: "object",
			props: [
				{ key: "z", optional: false, node: { kind: "keyword", name: "string" } }
			]
		}
	}
)

// two Scopes or Modules differing in one alias, which factories tell apart
const containers: fc.Arbitrary<FragmentOf> = fc
	.record({
		form: fc.constantFrom("scope", "export", "module"),
		aliases: fc.record({ a: nodeOf(["a", "b"]), b: nodeOf(["a", "b"]) }),
		thunk: fc.option(nodeOf(["a", "b"]), { nil: undefined }),
		changed: fc.constantFrom("a", "b", "t"),
		replacement: nodeOf(["a", "b"])
	})
	.chain(({ form, aliases, thunk, changed, replacement }) => {
		// a thunk resolves through its Scope, which a Module doesn't name
		const nodes: Record<string, Node> =
			form !== "module" && thunk ? { ...aliases, t: thunk } : aliases
		const names = Object.keys(nodes)
		const dataByAlias = dataByAliasOf(nodes)
		const sites =
			form === "scope" ?
				(nodes.t ? fc.oneof(nodeOf(names), throughThunk) : nodeOf(names)).chain(
					node =>
						fc.record({
							site: fc.constant(
								(read: string) => `${read}.type(${sourceOf(defOf(node))})`
							),
							inputs: inputsOf(dataOf(node, name => dataByAlias[name]))
						})
				)
			:	fc
					.record({
						alias: fc.constantFrom(...names),
						kind: fc.constantFrom(
							...(Object.keys(moduleSites) as (keyof typeof moduleSites)[])
						)
					})
					.chain(({ alias, kind }) =>
						fc.record({
							site: fc.constant((read: string) =>
								moduleSites[kind](read, alias)
							),
							inputs: inputsOf(dataByAlias[alias])
						})
					)
		return fc.array(sites, { minLength: 1, maxLength: 3 }).map(
			(observedSites): FragmentOf =>
				id => {
					const declare = (name: string, isChanged: boolean) => {
						const defs = Object.entries(nodes).map(([alias, node]) => {
							const def = sourceOf(
								defOf(isChanged && changed === alias ? replacement : node)
							)
							return `${alias}: ${alias === "t" ? `() => ${name}.type(${def})` : def}`
						})
						return form === "module" ?
								[`export const ${name} = type.module({ ${defs.join(", ")} })`]
							:	[
									`export const ${name} = scope({ ${defs.join(", ")} })`,
									...(form === "export" ?
										[`export const ${name}M = ${name}.export()`]
									:	[])
								]
					}
					const name = form === "module" ? `M${id}` : `$${id}`
					const read = form === "export" ? `${name}M` : name
					return {
						containers: [...declare(name, false), ...declare(`${name}b`, true)],
						exports: [read, `${read}b`],
						main: observedSites.map(({ site, inputs }, i) =>
							observed(`${id}.${i}`, site(read), inputs)
						)
					}
				}
		)
	})

// Generics differing in body, or in what their bound argument means
const generics: fc.Arbitrary<FragmentOf> = fc
	.record({
		body: nodeOf(["t"]),
		replacement: nodeOf(["t"]),
		arg: nodeOf([]),
		bound: fc.option(fc.tuple(nodeOf([]), nodeOf([])), { nil: undefined })
	})
	.chain(({ body, replacement, arg, bound }) => {
		const argument = bound ? bound[0] : arg
		return inputsOf(dataOf(body, () => dataOf(argument, noAliases))).map(
			(inputs): FragmentOf =>
				id => ({
					containers:
						bound ?
							[
								`const $${id} = scope({ "Box<t>": ${sourceOf(defOf(body))}, foo: "string" })`,
								...bound.map(
									(foo, i) =>
										`export const G${id}${i ? "b" : ""} = scope({ ...$${id}.export("Box"), foo: ${sourceOf(defOf(foo))} }).export().Box`
								)
							]
						:	[body, replacement].map(
								(node, i) =>
									`export const G${id}${i ? "b" : ""} = generic("t")(${sourceOf(defOf(node))})`
							),
					exports: [`G${id}`, `G${id}b`],
					main: [
						observed(
							id,
							`G${id}(${bound ? `"foo"` : sourceOf(defOf(arg))})`,
							inputs
						)
					]
				})
		)
	})

const typesThroughCalls = {
	scope: (def: string) => `scope({ a: ${def} }).type("a")`,
	export: (def: string) => `scope({ a: ${def} }).export().a`,
	module: (def: string) => `type.module({ a: ${def} }).a`,
	generic: (def: string) => `type("<t>", { box: "t" })(${def})`
}

const validatorReads = {
	description: (t: string) => `${t}.description`,
	expression: (t: string) => `${t}.expression`,
	toString: (t: string) => `${t}.toString()`,
	allows: (t: string) => `${t}.allows`,
	assert: (t: string) => `${t}.assert`,
	standard: (t: string) => `${t}["~standard"].validate`,
	// a pipeline's ends, each morph replaced by what it declares or allows
	in: (t: string) => `${t}.in`,
	out: (t: string) => `${t}.out`
}

// a validator member read off a Type a Scope, Module or Generic returns
const throughCalls: fc.Arbitrary<FragmentOf> = fc
	.record({
		node: nodeOf([]),
		through: fc.constantFrom(
			...(Object.keys(typesThroughCalls) as (keyof typeof typesThroughCalls)[])
		),
		read: fc.constantFrom(
			...(Object.keys(validatorReads) as (keyof typeof validatorReads)[])
		)
	})
	.chain(({ node, through, read }) =>
		inputsOf(
			through === "generic" ?
				dataOf(node, noAliases).map(box => ({ box }))
			:	dataOf(node, noAliases)
		).map(
			(inputs): FragmentOf =>
				id => ({
					containers: [],
					exports: [],
					main: [
						observed(
							id,
							validatorReads[read](
								typesThroughCalls[through](sourceOf(defOf(node)))
							),
							inputs
						)
					]
				})
		)
	)

// a Type folded by a function an import cycle calls before it's declared
const throughCycle: fc.Arbitrary<FragmentOf> = nodeOf([])
	// a Type the module declares must be definable for the module to load
	.filter(node => isDefinable(defOf(node)))
	.chain(node =>
		inputsOf(dataOf(node, noAliases)).map(
			(inputs): FragmentOf =>
				id => ({
					containers: [
						`import { first${id} } from "./main.ts"`,
						`export function cycled${id}() {`,
						`\treturn Cycled${id}.or("null")`,
						"}",
						`first${id}()`,
						`const Cycled${id} = type(${sourceOf(defOf(node))})`
					],
					exports: [`cycled${id}`],
					main: [
						`export function first${id}() {`,
						observed(`${id}.first`, `cycled${id}()`, inputs),
						"}",
						observed(id, `cycled${id}()`, inputs)
					]
				})
		)
	)

const derivations = {
	or: (l: string, r: string) => `${l}.or(${r})`,
	and: (l: string, r: string) => `${l}.and(${r})`,
	union: (l: string, r: string) => `type([${l}, "|", ${r}])`,
	merge: (l: string, r: string) => `${l}.merge(${r})`,
	keyof: (l: string) => `${l}.keyof()`,
	omit: (l: string) => `${l}.omit("a")`,
	pick: (l: string) => `${l}.pick("a", "b")`,
	array: (l: string) => `${l}.array()`,
	pipe: (l: string) => `${l}.pipe(${morphs.size.name})`,
	try: (l: string) =>
		`${l}.pipe.try(${tried.parse.name}, ${tried.refuse.name})`,
	exec: (l: string) => `${l}.or("x/^(a)b?$/")`,
	narrow: (l: string) => `${l}.narrow(${predicates.isEven.name})`,
	to: (l: string, r: string) => `${l}.to(${r})`,
	chain: (l: string) =>
		`${l}.pipe(${morphs.double.name}).to("number").pipe(${morphs.box.name})`,
	in: (l: string) => `${l}.in`,
	out: (l: string) => `${l}.out`
}

type Derivation = keyof typeof derivations

const introspections = {
	json: (t: string) => `${t}.json`,
	toJSON: (t: string) => `${t}.toJSON()`,
	toJsonSchema: (t: string) => `${t}.toJsonSchema()`,
	inJson: (t: string) => `${t}.in.json`,
	outExpression: (t: string) => `${t}.out.expression`
}

// Types derived inline, from locals or imports, and their introspection
const derived: fc.Arbitrary<FragmentOf> = fc
	.record({
		l: nodeOf([]),
		r: nodeOf([]),
		placement: fc.constantFrom("inline", "local", "imported"),
		derivations: fc.array(
			fc.constantFrom(...(Object.keys(derivations) as Derivation[])),
			{ minLength: 1, maxLength: 3 }
		),
		introspection: fc.option(
			fc.constantFrom(
				...(Object.keys(introspections) as (keyof typeof introspections)[])
			),
			{ nil: undefined }
		)
	})
	// a Type the module declares must be definable for the module to load
	.filter(
		({ l, r, placement }) =>
			placement === "inline" || (isDefinable(defOf(l)) && isDefinable(defOf(r)))
	)
	.chain(({ l, r, placement, derivations: applied, introspection }) =>
		inputsOf(fc.oneof(dataOf(l, noAliases), dataOf(r, noAliases))).map(
			(inputs): FragmentOf =>
				id => {
					const [lDef, rDef] = [l, r].map(
						node => `type(${sourceOf(defOf(node))})`
					)
					const [lName, rName] =
						placement === "inline" ? [lDef, rDef] : [`L${id}`, `R${id}`]
					const sites = applied.map((derivation, i) =>
						observed(
							`${id}.${i}`,
							derivations[derivation](lName, rName),
							inputs
						)
					)
					if (introspection) {
						sites.push(
							observed(
								`${id}.${introspection}`,
								introspections[introspection](
									derivations[applied[0]](lName, rName)
								),
								[]
							)
						)
					}
					const declarations = [
						`const L${id} = ${lDef}`,
						`const R${id} = ${rDef}`
					]
					return (
						placement === "inline" ?
							{ containers: [], exports: [], main: sites }
						: placement === "local" ?
							{ containers: [], exports: [], main: [...declarations, ...sites] }
						:	{
								containers: declarations.map(
									declaration => `export ${declaration}`
								),
								exports: [`L${id}`, `R${id}`],
								main: sites
							}
					)
				}
		)
	)

// values a definition reads: a writable object and a static helper
const bindings: fc.Arbitrary<FragmentOf> = fc
	.record({
		limit: fc.integer({ min: 0, max: 4 }),
		key: fc.constantFrom("a", "b"),
		element: fc.constantFrom("string", "number", "boolean"),
		isImported: fc.boolean(),
		inputs: inputsOf(
			fc.oneof(
				fc.integer({ min: -1, max: 6 }),
				fc.string({ maxLength: 6 }),
				fc.record({ a: noise, b: noise }, { requiredKeys: [] }),
				fc.array(fc.oneof(fc.string({ maxLength: 2 }), fc.integer()), {
					maxLength: 3
				})
			)
		)
	})
	.map(
		({ limit, key, element, isImported, inputs }): FragmentOf =>
			id => {
				const declarations = [
					`const limits${id} = { max: ${limit}, key: "${key}" }`,
					`const arrayOf${id} = def => \`\${def}[]\``
				]
				return {
					containers:
						isImported ?
							declarations.map(declaration => `export ${declaration}`)
						:	[],
					exports: isImported ? [`limits${id}`, `arrayOf${id}`] : [],
					main: [
						...(isImported ? [] : declarations),
						observed(
							`${id}.0`,
							`type(\`string <= \${limits${id}.max}\`)`,
							inputs
						),
						observed(
							`${id}.1`,
							`type({ [limits${id}.key]: arrayOf${id}("${element}") })`,
							inputs
						),
						observed(`${id}.2`, `type(arrayOf${id}("${element}"))`, inputs)
					]
				}
			}
	)

// helpers whose definitions read their parameters, called with literals
const helpers: fc.Arbitrary<FragmentOf> = fc
	.record({
		limit: fc.integer({ min: 1, max: 4 }),
		element: fc.constantFrom("string", "number"),
		isImported: fc.boolean(),
		inputs: inputsOf(
			fc.oneof(
				fc.integer({ min: -1, max: 6 }),
				fc.string({ maxLength: 6 }),
				fc.constant(null),
				fc.record({ value: noise }, { requiredKeys: [] })
			)
		)
	})
	.map(
		({ limit, element, isImported, inputs }): FragmentOf =>
			id => {
				const declarations = [
					`const bounded${id} = max => type(\`${element} <= \${max}\`)`,
					`function boxed${id}(max) { return type({ value: \`${element} >= \${max}\` }) }`,
					`const below${id} = max => bounded${id}(max - 1)`,
					`const described${id} = max => {\n\tconst T = bounded${id}(max)\n\treturn T.describe(\`at most \${max}\`)\n}`
				]
				return {
					containers:
						isImported ?
							declarations.map(declaration => `export ${declaration}`)
						:	[],
					exports:
						isImported ?
							[`bounded${id}`, `boxed${id}`, `below${id}`, `described${id}`]
						:	[],
					main: [
						...(isImported ? [] : declarations),
						// local, as the build trusts an arktype package's exports, which
						// these are, to read members off their parameters
						`const nullable${id} = T => T.or("null")`,
						observed(`${id}.0`, `bounded${id}(${limit})`, inputs),
						observed(`${id}.1`, `boxed${id}(${limit})`, inputs),
						observed(
							`${id}.2`,
							`type({ value: below${id}(${limit}) }).or(boxed${id}(${limit}))`,
							inputs
						),
						observed(
							`${id}.3`,
							`nullable${id}(bounded${id}(${limit}))`,
							inputs
						),
						observed(`${id}.4`, `described${id}(${limit})`, inputs),
						observed(
							`${id}.5`,
							`type({ value: described${id}(${limit}) })`,
							inputs
						)
					]
				}
			}
	)

const keywordCases = ["string", "number", "boolean", "bigint", "object"]

// matchers and TypedFns, each calling holes the program holds
const matchers: fc.Arbitrary<FragmentOf> = fc
	.record({
		cases: fc.uniqueArray(
			fc.tuple(
				fc.constantFrom(...keywordCases),
				fc.constantFrom(...(Object.keys(morphs) as (keyof typeof morphs)[]))
			),
			{ selector: ([key]) => key, minLength: 1, maxLength: 3 }
		),
		fallback: fc.constantFrom(`"assert"`, `"never"`, morphs.box.name),
		params: fc.array(fc.constantFrom(...keywordCases), { maxLength: 2 }),
		implementation: fc.constantFrom(
			...(Object.keys(morphs) as (keyof typeof morphs)[])
		),
		returns: fc.option(fc.constantFrom(...keywordCases), { nil: undefined }),
		inputs: inputsOf(
			fc.oneof(
				fc.string({ maxLength: 3 }),
				fc.integer({ min: -2, max: 4 }),
				fc.boolean(),
				fc.bigInt({ min: -2n, max: 2n })
			)
		)
	})
	.map(
		({
			cases,
			fallback,
			params,
			implementation,
			returns,
			inputs
		}): FragmentOf =>
			id => ({
				containers: [],
				exports: [],
				main: [
					observed(
						`${id}.match`,
						`match({ ${cases.map(([key, morph]) => `${key}: ${morph}`).join(", ")}, default: ${fallback} })`,
						inputs
					),
					observed(
						`${id}.fn`,
						`type.fn(${[...params, ...(returns ? [":", returns] : [])].map(def => JSON.stringify(def)).join(", ")})(${implementation})`,
						inputs
					)
				]
			})
	)

// what each codec decodes, wrapped as its holder holds it
const codecData = {
	ms: fc.constantFrom<unknown>(0, 1, -1, 1.5, "1"),
	numeric: fc.constantFrom<unknown>("1", "-0.5", "", "a", 1),
	iso: fc.constantFrom<unknown>("1970-01-01T00:00:00.000Z", "1970", "", 0),
	trim: fc.constantFrom<unknown>(" a ", "a", "", 0)
}

const codecDefs: Record<keyof typeof codecData, (id: string) => string> = {
	ms: id => `ms${id}`,
	numeric: () => `"string.numeric.parse"`,
	iso: () => `"string.date.iso.parse"`,
	trim: () => `"string.trim"`
}

const wrappedBy: Record<keyof typeof holders, (data: unknown) => unknown> = {
	object: data => ({ a: data }),
	tuple: data => [data],
	prefixed: data => ["", data],
	scope: data => ({ a: data })
}

// a codec or parse keyword a Type holds, decoded and encoded
const codecs: fc.Arbitrary<FragmentOf> = fc
	.record({
		codec: fc.constantFrom(
			...(Object.keys(codecData) as (keyof typeof codecData)[])
		),
		holder: fc.constantFrom(
			...(Object.keys(holders) as (keyof typeof holders)[])
		),
		encoded: fc.constantFrom<unknown>(new Date(0), new Date(7), 3, "a", " a")
	})
	.chain(({ codec, holder, encoded }) =>
		fc
			.tuple(
				inputsOf(codecData[codec].map(wrappedBy[holder])),
				inputsOf(fc.constant(wrappedBy[holder](encoded)))
			)
			.map(
				([decodedInputs, encodedInputs]): FragmentOf =>
					id => {
						const held = holders[holder](codecDefs[codec](id))
						return {
							containers: [],
							exports: [],
							main: [
								`const ms${id} = codec("number.integer", "Date", { decode: n => new Date(n), encode: d => d.getTime() })`,
								observed(`${id}.decode`, held, decodedInputs),
								observed(`${id}.encode`, `${held}.encode`, encodedInputs)
							]
						}
					}
			)
	)

const holes: Record<string, Function> = {
	...morphs,
	...tried,
	...predicates,
	emptyArray
}

interface Program {
	containers: string
	// main.ts's lines, so a site is found and dropped by its line
	main: string[]
}

const programOf = (fragmentsOf: FragmentOf[]): Program => {
	const fragments = fragmentsOf.map((fragmentOf, i) => fragmentOf(`${i}`))
	const containers = fragments.flatMap(fragment => fragment.containers)
	const main = fragments.flatMap(fragment => fragment.main)
	const used = Object.keys(holes).filter(name =>
		new RegExp(`\\b${name}\\b`).test([...containers, ...main].join("\n"))
	)
	const exported = [...used, ...fragments.flatMap(fragment => fragment.exports)]
	return {
		containers: [
			`import { generic, scope, type } from "arktype"`,
			...used.map(
				name =>
					`export const ${name} = ${unnamedHoles.has(name) ? `[${holes[name]}][0]` : holes[name]}`
			),
			...containers
		].join("\n"),
		main: [
			`import { generic, match, scope, type } from "arktype"`,
			`import { codec } from "arktype/codecs"`,
			`import { ${exported.join(", ")} } from "./containers.ts"`,
			...main
		].flatMap(entry => entry.split("\n"))
	}
}

const sourceOfProgram = (program: Program) =>
	`// containers.ts\n${program.containers}\n\n// main.ts\n${program.main.join("\n")}`

const programs = fc
	.oneof(
		{
			weight: 9,
			arbitrary: fc.array(
				fc.oneof(
					definitions,
					defaultCases,
					narrowedState,
					defaults,
					containers,
					generics,
					derived,
					bindings,
					helpers,
					matchers,
					throughCalls,
					throughCycle,
					codecs,
					dags,
					allowsOnly
				),
				{
					minLength: 1,
					maxLength: 3
				}
			)
		},
		// a program reading its Types only for .allows, which a size build
		// writes without issues
		fc.array(allowsOnly, { minLength: 1, maxLength: 3 })
	)
	.map(fragmentsOf => {
		const program = programOf(fragmentsOf)
		return Object.assign(program, {
			[fc.toStringMethod]: () => sourceOfProgram(program)
		})
	})

const isObserved = (line: string | undefined) =>
	!!line?.startsWith("$arkObserve(")

// the program without refused sites, or undefined if another is refused
const foldedProgramOf = (
	program: Program,
	errors: Diagnostic[]
): Program | undefined => {
	const refusedLines = new Set<number>()
	for (const error of errors) {
		if (
			!error.file.endsWith("main.ts") ||
			!isObserved(program.main[error.line - 1])
		)
			return
		refusedLines.add(error.line - 1)
	}
	return {
		...program,
		main: program.main.filter((_, i) => !refusedLines.has(i))
	}
}

// each mode wraps the same sites, so one world as written serves both
const buildOptions: BuildOptions = {
	mode: "standalone",
	standalone: {
		...testedOptions,
		members: {
			expression: true,
			description: true,
			json: true,
			toJSON: true,
			toJsonSchema: true,
			"~standard.jsonSchema": !lacks("~standard"),
			...testedOptions.members
		}
	},
	runsUnfolded: true
}

const write = (program: Program, dir: string) => {
	mkdirSync(dir, { recursive: true })
	writeFileSync(join(dir, "containers.ts"), program.containers)
	writeFileSync(join(dir, "main.ts"), program.main.join("\n"))
	return [join(dir, "main.ts")]
}

interface Counts {
	excluded: Record<string, number>
	unbaked: number
	programs: number
	sites: number
	precompiledSites: number
	refusedPrograms: number
	refusals: Record<string, number>
}

// how a program's precompiled worlds disagree with the one as written
const disagreementsOf = async (
	program: Program,
	dir: string,
	counts: Counts
): Promise<string[]> => {
	const corpus = write(program, dir)
	const cache = buildPerturbed(corpus, { ...buildOptions, mode: "cache" })
	const standalone = buildPerturbed(corpus, buildOptions)
	for (const error of standalone.errors) {
		// a reason is counted without the names and positions it quotes
		const reason = (error.reasons[0] ?? error.message)
			.replace(/`[^`]*`/g, "`…`")
			.replace(/ \(\S+:\d+:\d+\)| from \S+$/g, "")
		counts.refusals[reason] = (counts.refusals[reason] ?? 0) + 1
	}
	const foldedDir = join(dir, "folded")
	let folded: Program | undefined = program
	let foldedBuild = standalone
	// a site can be refused once another reading the same definition is dropped
	while (folded && foldedBuild.errors.length) {
		folded = foldedProgramOf(folded, foldedBuild.errors)
		if (folded)
			foldedBuild = buildPerturbed(write(folded, foldedDir), buildOptions)
	}
	counts.programs++
	counts.sites += program.main.filter(isObserved).length
	counts.precompiledSites += folded?.main.filter(isObserved).length ?? 0
	if (!folded) counts.refusedPrograms++
	const [original, cached, foldedOriginal, precompiled] = await Promise.all([
		runWorld("original", cache.manifest, dir),
		runWorld("cache", cache.manifest, dir),
		folded &&
			(foldedBuild === standalone ? undefined : (
				runWorld("original", foldedBuild.manifest, foldedDir)
			)),
		folded &&
			runWorld(
				"standalone",
				foldedBuild.manifest,
				foldedBuild === standalone ? dir : foldedDir
			)
	])
	const unknownOf = (run: Program, disagreements: Disagreement[]) =>
		disagreements.filter(disagreement => {
			if (isUnbaked(disagreement)) {
				counts.unbaked++
				return false
			}
			const excluded = allowanceOf(exclusions, run, disagreement)
			if (excluded) {
				counts.excluded[excluded.reason] =
					(counts.excluded[excluded.reason] ?? 0) + 1
			}
			return !excluded
		})
	return [
		...standalone.errors
			.filter(error => error.reasons.includes(unfoldableValue))
			.map(error => `standalone refuses ${error.message}`),
		...reportOf(
			"cache",
			unknownOf(program, compareWorlds(cache, original, cached).disagreements)
		),
		...(folded && precompiled ?
			reportOf(
				"standalone",
				unknownOf(
					folded,
					compareWorlds(foldedBuild, foldedOriginal ?? original, precompiled)
						.disagreements
				)
			)
		:	[])
	]
}

// every observed site is an arktype value, so refusing its value is a bug
const unfoldableValue =
	"its value is not a Type, Module, Scope, Generic or TypedFn"

const introspectionKeys = ["json", "toJsonSchema", "standardJsonSchema"]

// a JSON Schema the build can't bake throws where it's read
const isUnbaked = ({ original, precompiled }: Disagreement) =>
	Object.keys({ ...original, ...precompiled }).every(
		k =>
			comparable(original[k]) === comparable(precompiled[k]) ||
			(introspectionKeys.includes(k) &&
				comparable(precompiled[k]).includes(
					"can't be precompiled to a standalone validator"
				))
	)

// a disagreement counted, not failed, matched by the site's main.ts line
interface Allowance {
	reason: string
	matches: (
		disagreement: Disagreement,
		line: string,
		program: Program
	) => boolean
}

// how a world observes a keyword's meta
const keywordMetaObservations = new Set([...keywordMetas()].map(serialize))

// the introspection a build composes from a nested node's text, elided past
// a length
const elidableKeys = new Set(["description", "expression", "string"])

// the strings differ only in what one elides as "...": the build measures a
// function's name as its placeholder, so near the length elided it can elide
// a level arktype doesn't, or write one arktype elides
const elidedAlike = (l: string, r: string): boolean =>
	[
		[l, r],
		[r, l]
	].some(
		([a, b]) =>
			a.includes("...") &&
			new RegExp(
				`^${a.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&").replaceAll("\\.\\.\\.", ".*")}$`
			).test(b)
	)

// a disagreement precompiling doesn't promise to avoid
const exclusions: Allowance[] = [
	{
		reason:
			"a description elided a level apart from arktype's, around a function's name the build reads as a placeholder",
		matches: ({ original, precompiled }) =>
			Object.keys({ ...original, ...precompiled }).every(k => {
				const read = comparable(original[k])
				const baked = comparable(precompiled[k])
				return (
					read === baked || (elidableKeys.has(k) && elidedAlike(read, baked))
				)
			})
	},
	{
		reason:
			"which evaluation of a definition throws where a narrow checking its default answers differently between calls",
		matches: ({ original, precompiled }, line) =>
			/\batMost\d/.test(line) &&
			[original.threw, precompiled.threw].some(threw =>
				/^ParseError: Default .*(?:must be valid according to (?:atMost\d|perturbed)|is invalid$)/.test(
					String(threw)
				)
			) &&
			original.threw !== precompiled.threw
	},
	{
		reason: "a keyword Type's meta, which its validator doesn't bake",
		matches: ({ original, precompiled }) =>
			Object.keys({ ...original, ...precompiled }).every(
				k =>
					comparable(original[k]) === comparable(precompiled[k]) ||
					(k === "meta" &&
						precompiled.meta === serialize({}) &&
						keywordMetaObservations.has(original.meta))
			)
	},
	{
		reason:
			"a function's name the program redefines after arktype first read it",
		matches: ({ perturbation, original, precompiled }) =>
			perturbation === "name" &&
			Object.keys({ ...original, ...precompiled }).every(k => {
				const read = comparable(original[k])
				const reread = comparable(precompiled[k])
				return (
					read === reread ||
					new RegExp(
						`^${reread.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&").replace(/perturbed/g, "\\w+")}$`
					).test(read)
				)
			})
	}
]

// a site is labeled by its main.ts position or by its observation key
const allowanceOf = (
	allowances: Allowance[],
	program: Program,
	disagreement: Disagreement
): Allowance | undefined => {
	const lineNumber = /:(\d+):\d+$/.exec(disagreement.site)?.[1]
	const line =
		lineNumber ?
			program.main[Number(lineNumber) - 1]
		:	program.main.find(line =>
				line.startsWith(`$arkObserve(${JSON.stringify(disagreement.site)},`)
			)
	return line === undefined ? undefined : (
			allowances.find(allowance =>
				allowance.matches(disagreement, line, program)
			)
		)
}

// a site's disagreements under each perturbation, by what the first changes
const reportOf = (world: World, disagreements: Disagreement[]): string[] => {
	const disagreementsBySite: Record<string, Disagreement[]> = {}
	for (const disagreement of disagreements)
		(disagreementsBySite[disagreement.site] ??= []).push(disagreement)
	return Object.entries(disagreementsBySite).map(([site, [first, ...rest]]) =>
		[
			`${world} ${site} under ${[first, ...rest].map(d => d.perturbation).join(", ")}`,
			...Object.keys({ ...first.original, ...first.precompiled })
				.filter(
					k =>
						comparable(first.original[k]) !== comparable(first.precompiled[k])
				)
				.map(
					k =>
						`  ${k}: ${JSON.stringify(first.original[k])?.slice(0, 300)}\n  precompiled ${k}: ${JSON.stringify(first.precompiled[k])?.slice(0, 300)}`
				)
		].join("\n")
	)
}

const [runs = 20, seed = 1] =
	process.env.ARK_PRECOMPILE_PROGRAMS?.split(":").map(Number) ?? []

const out = fromHere("temp", "programs", `${seed}`)

contextualize(() => {
	it("excludes a disagreement by its line below a multiline declaration", () => {
		const program = programOf([
			() => ({
				containers: [],
				exports: [],
				main: [
					"const described = max => {\n\treturn max\n}",
					"let max0 = 0",
					"const atMost0 = n => n <= max0",
					observed("0.0", `type({ a: [["number", ":", atMost0], "=", 1] })`, [
						{}
					])
				]
			})
		])
		// as main.ts holds it
		const line = program.main.join("\n").split("\n").findIndex(isObserved) + 1
		attest(
			allowanceOf(exclusions, program, {
				perturbation: "none",
				site: `main.ts:${line}:26`,
				original: {
					threw: "ParseError: Default for a must be valid according to atMost0"
				},
				precompiled: {}
			})
		).equals(exclusions[1])
	})

	it("excludes a description elided a level apart", () => {
		const program = programOf([
			() => ({ containers: [], exports: [], main: ["const D = type({})"] })
		])
		const disagreement = (description: string, precompiled: string) =>
			allowanceOf(exclusions, program, {
				perturbation: "none",
				site: "main.ts:1:1",
				original: { description },
				precompiled: { description: precompiled }
			})
		attest(
			disagreement(
				"{ l?: { l?: ..., r?: ...[] }, r?: { l?: ..., r?: ...[] }[] }",
				"{ l?: ..., r?: { l?: ..., r?: ...[] }[] }"
			)
		).equals(exclusions[0])
		attest(
			disagreement(
				"{ l?: { l?: ..., r?: ...[] }, r?: { l?: ..., r?: ...[] }[] }",
				"{ l?: ..., r?: { l?: ..., r?: ...[] } }"
			)
		).equals(undefined)
	})

	it("agree through the build", async () => {
		rmSync(out, { recursive: true, force: true })
		const counts: Counts = {
			excluded: {},
			unbaked: 0,
			programs: 0,
			sites: 0,
			precompiledSites: 0,
			refusedPrograms: 0,
			refusals: {}
		}
		await fc.assert(
			fc.asyncProperty(programs, async program => {
				attest(
					await disagreementsOf(
						program,
						join(out, `${counts.programs}`),
						counts
					)
				).equals([])
			}),
			{ numRuns: runs, seed, errorWithCause: true }
		)
		if (process.env.ARK_PRECOMPILE_PROGRAMS) console.log(counts)
		attest(counts.precompiledSites > counts.sites / 2).equals(true)
	}).timeout(runs * 30_000)
})
