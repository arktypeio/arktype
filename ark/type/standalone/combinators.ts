import {
	hasArkKind,
	isDecidedByAllows,
	type BaseNode,
	type BaseRoot,
	type IntersectionNode,
	type MorphNode,
	type NodeCompiler,
	type NodeId,
	type nodeOfKind,
	type Optional,
	type Prop,
	type StructureNode,
	type UnionNode,
	type UnitNode
} from "@ark/schema"
import { domainOf, isWellFormedInteger, returnsReports } from "@ark/util"
import * as runtime from "../runtimeExports.ts"
import {
	basesOf,
	discriminantContextOf,
	listedIssueOf,
	listsBranches,
	unifies
} from "./compilers.ts"
import {
	isDescribed,
	isInlineSite,
	isKeyword,
	issueContextOf,
	issueSiteOf,
	missingDescriptionOf,
	raisesNothing,
	type IssueContext
} from "./sites.ts"

// a size build writes each node it can as a call composing runtime checkers

const combinableByNode = new WeakMap<BaseNode, boolean>()

// whether a node and each root it reaches are written as checkers
export const combines = (node: BaseNode): boolean => {
	let combinable = combinableByNode.get(node)
	if (combinable === undefined) {
		// a node reached again while it's decided is in a cycle, so compiled
		combinableByNode.set(node, false)
		combinable =
			node.isRoot() &&
			!isInCycle(node) &&
			calleesOf(node)?.every(isCallable) === true
		combinableByNode.set(node, combinable)
	}
	return combinable
}

// a root a checker calls: another checker, one with a unified Allows, or one
// holding an alias, read through what it compiles
const isCallable = (node: BaseRoot): boolean =>
	combines(node) || unifies(node) || node.hasAlias

const inCycleByNode = new WeakMap<BaseNode, boolean>()

// whether a node reaches itself through an alias, so data can reach it again
const isInCycle = (node: BaseNode): boolean => {
	if (!node.hasAlias) return false
	let inCycle = inCycleByNode.get(node)
	if (inCycle === undefined) {
		const seen = new Set<BaseNode>()
		const reaches = (from: BaseNode): boolean =>
			from.references.some(reference => {
				if (!reference.is("alias") || seen.has(reference)) return false
				seen.add(reference)
				const { resolution } = reference
				// by id, as `this` resolves to a node equal to the root it's
				// written in yet not that one, which reading it as outside its
				// own cycle would write as a checker, whose Allows restarts the
				// alias depth each time data reaches it again
				return (
					resolution.references.some(reached => reached.id === node.id) ||
					reaches(resolution)
				)
			})
		inCycle = reaches(node)
		inCycleByNode.set(node, inCycle)
	}
	return inCycle
}

// the roots a node's checker calls, if it can be written
const calleesOf = (node: BaseNode): BaseRoot[] | undefined => {
	if (node.is("domain") || node.is("proto")) return checkOf(node) && []
	if (node.is("unit")) return unitSiteOf(node) && []
	if (node.is("morph")) return morphCalleesOf(node)
	if (node.is("intersection")) {
		const predicates = node.inner.predicate ?? []
		if (
			!predicates.every(predicateSiteOf) ||
			!node.preStruct.every(checkOf) ||
			(node.basis && !checkOf(node.basis))
		)
			return
		return node.structure ? structureCalleesOf(node.structure) : []
	}
	if (node.is("union")) {
		if (unitListOf(node)) return []
		const domains = domainCasesOf(node)
		if (domains) {
			return Object.values(domains).filter(
				(branch): branch is BaseRoot => branch !== true
			)
		}
		const discriminated = discriminatedOf(node)
		if (discriminated) {
			return [
				...Object.values(discriminated.cases),
				discriminated.otherwise
			].filter(
				(branch): branch is BaseRoot => branch !== true && branch !== undefined
			)
		}
		if (node.discriminant || !isDecidedByAllows(node) || !unionSiteOf(node))
			return
		return [...node.branches]
	}
}

// the roots a morph's checker calls, where its steps read no ctx
const morphCalleesOf = (node: MorphNode): BaseRoot[] | undefined => {
	if (node.inverse) return
	const callees: BaseRoot[] = []
	for (const [i, step] of node.travMorphs.entries()) {
		if (hasArkKind(step, "root") && !step.hasAlias) callees.push(step)
		else if (hasArkKind(step, "root") || !node.contextFree[i]) return
	}
	return callees
}

const plainContextOf = (context: object): IssueContext | undefined =>
	isInlineSite(context) && isDescribed(context) ? context : undefined

const plainSiteOf = (node: BaseNode): IssueContext | undefined =>
	plainContextOf(issueSiteOf(node.failSite))

const unionSiteOf = (node: UnionNode): IssueContext | undefined =>
	plainContextOf(issueContextOf({ ...node.failSite, code: "union" }))

const discriminantSiteOf = (node: UnionNode): IssueContext | undefined =>
	plainContextOf(discriminantContextOf(node))

const checkOf = (node: BaseNode): IssueContext | undefined =>
	node.jsCond && plainSiteOf(node)

// a described predicate's site, keeping the description written for it unless
// it names the function, which a callback's only has once it's called
const predicateSiteOf = (node: BaseNode): IssueContext | undefined => {
	if (!node.is("predicate")) return
	const site = issueSiteOf(node.failSite) as IssueContext
	return (
		!isDescribed(site) ? undefined
		: isNamedByItsFunction(node) ? site
		: plainContextOf(site)
	)
}

const isNamedByItsFunction = (node: nodeOfKind<"predicate">): boolean =>
	!isKeyword(node.predicate) &&
	(issueSiteOf(node.failSite) as IssueContext).description ===
		runtime.describePredicate(node)

// whether a node's Allows passes as it does, as a keyword's predicate does
const allowsDecides = (node: BaseRoot): boolean =>
	!node.hasMorph &&
	!node.allowsCtx &&
	Object.values(node.byId).every(
		ref =>
			!ref.is("predicate") ||
			(isKeyword(ref.predicate) && !!predicateSiteOf(ref))
	)

// a value compared by identity and printed by the runtime
const isPrinted = (value: unknown): boolean =>
	typeof value === "string" ||
	typeof value === "boolean" ||
	value === null ||
	value === undefined ||
	(typeof value === "number" && !Object.is(value, -0) && value === value)

const unitSiteOf = (node: BaseNode): IssueContext | undefined =>
	node.is("unit") && isPrinted(node.unit) ? plainSiteOf(node) : undefined

interface Units {
	values: unknown[]
	site: IssueContext
}

// a union of values, listed as their description lists them
const unitListOf = (node: UnionNode): Units | undefined => {
	if (!node.branches.every(unitSiteOf)) return
	const values = node.branches.map(branch => (branch as UnitNode).unit)
	const discriminant = node.discriminant
	if (!discriminant) {
		const site = unionSiteOf(node)
		return site && { values, site }
	}
	if (
		discriminant.kind !== "unit" ||
		discriminant.path.length ||
		node.missLists ||
		"default" in discriminant.cases
	)
		return
	const site = discriminantSiteOf(node)
	if (!site) return
	const ordered: unknown[] = []
	for (const k in discriminant.cases) {
		const i = values.findIndex(
			value => (value === undefined ? "undefined" : JSON.stringify(value)) === k
		)
		if (i === -1) return
		ordered.push(values[i])
	}
	return { values: ordered, site }
}

interface Cases {
	key: string
	// whether a miss is reported at the union's own path
	isOwn: boolean
	cases: Record<string, BaseRoot | true>
	// whether its cases are true and false, rather than strings
	areBooleans: boolean
	// the branches lacking the key, which data holding no case is checked by
	otherwise?: BaseRoot
	site: IssueContext
	// what data that isn't an object fails
	missed: IssueContext
}

const isBooleanCase = (k: string): boolean => k === "true" || k === "false"

const discriminatedOf = (node: UnionNode): Cases | undefined => {
	const discriminant = node.discriminant
	if (
		!discriminant ||
		discriminant.kind !== "unit" ||
		discriminant.path.length !== 1 ||
		typeof discriminant.path[0] !== "string" ||
		node.missLists
	)
		return
	const key = discriminant.path[0]
	const cases: Record<string, BaseRoot | true> = {}
	const { default: otherwise, ...keyed } = discriminant.cases
	// branches lacking the key are tried by their Allows
	if (otherwise === true || (otherwise && !allowsDecides(otherwise))) return
	const areBooleans = Object.keys(keyed).every(isBooleanCase)
	if (areBooleans && "default" in discriminant.cases) return
	for (const k in keyed) {
		if (!areBooleans && !k.startsWith('"')) return
		const value = JSON.parse(k) as string
		if (!areBooleans && (isWellFormedInteger(value) || value === "__proto__"))
			return
		const pruned = discriminant.cases[k]
		// a case's checker doesn't check the key again, unless it can't be one
		cases[areBooleans ? k : value] =
			pruned === true || combines(pruned) ?
				pruned
			:	unprunedOf(
					node,
					branch => {
						const prop =
							branch.is("intersection") ?
								branch.structure?.byKey[key]
							:	undefined
						return (
							prop?.is("required") === true &&
							prop.value.is("unit") &&
							prop.value.unit === value
						)
					},
					pruned
				)
	}
	// a union written its own text lists nothing beside a miss
	if (otherwise !== undefined && !listsBranches(node)) return
	const site = discriminantSiteOf(node)
	// data whose key can't be read fails each branch's basis, as an object
	const bases = basesOf(node)
	const missed =
		!listsBranches(node) ? unionSiteOf(node)
		: bases?.nodes.every(basis => basis.domain === "object") ?
			plainContextOf(bases.site)
		:	undefined
	return (
		site &&
		missed && {
			key,
			isOwn: node.missPath.length === 0,
			cases,
			areBooleans,
			otherwise,
			site,
			missed
		}
	)
}

// a union told apart by data's domain, as JSON keys each case
const domainCasesOf = (
	node: UnionNode
): Record<string, BaseRoot | true> | undefined => {
	const discriminant = node.discriminant
	if (
		!discriminant ||
		discriminant.kind !== "domain" ||
		discriminant.path.length ||
		node.missLists ||
		"default" in discriminant.cases ||
		!discriminantSiteOf(node)
	)
		return
	const cases: Record<string, BaseRoot | true> = {}
	for (const k in discriminant.cases) {
		const domain = JSON.parse(k) as string
		cases[domain] = unprunedOf(
			node,
			branch => domainOfBranch(branch) === domain,
			discriminant.cases[k]
		)
	}
	return cases
}

const domainOfBranch = (branch: BaseRoot): string | undefined =>
	branch.is("unit") ? domainOf(branch.unit)
	: branch.is("domain") ? branch.domain
	: branch.is("proto") ? "object"
	: branch.is("intersection") && branch.basis ?
		branch.basis.is("domain") ?
			branch.basis.domain
		:	"object"
	:	undefined

// a case shares the checker of the branch it was pruned from, which rechecks the key
const unprunedOf = (
	node: UnionNode,
	isCase: (branch: BaseRoot) => boolean,
	pruned: BaseRoot | true
): BaseRoot | true => {
	// a case of several branches is the union of what they're pruned to
	if (pruned === true || pruned.is("union")) return pruned
	const matched = node.branches.filter(isCase)
	return matched.length === 1 ? matched[0] : pruned
}

// a key a literal declares, in the order it's written
const isLiteralKey = (key: PropertyKey): key is string =>
	typeof key === "string" &&
	key !== "__proto__" &&
	!isWellFormedInteger(key) &&
	!(key in Object.prototype)

// a primitive default, written where its key is absent
const isLiteralDefault = (prop: Optional.Node): boolean =>
	!prop.value.tfs && isPrinted(prop.default)

// a default written by what checks its key, as a function's or one replacing
// undefined is, rather than by what writes the literals of the keys beside it
const writesByValues = (prop: Prop.Node): boolean =>
	prop.is("optional") &&
	prop.hasDef() &&
	(prop.defaultsUndefined || !isLiteralDefault(prop))

// what a key it rejects fails, as compiled code writes it
const removedSiteOf = (structure: StructureNode): IssueContext | undefined =>
	plainContextOf(
		issueContextOf({
			code: "undeclared",
			description: "removed",
			meta: structure.meta
		})
	)

const structureCalleesOf = (
	structure: StructureNode
): BaseRoot[] | undefined => {
	// its structural morph, if any, writes its defaults
	if (
		structure.protoProps.length ||
		(structure.handlesUndeclared === "reject" && !removedSiteOf(structure)) ||
		(structure.index &&
			(structure.tfs ||
				structure.sequence ||
				structure.handlesUndeclared === "delete" ||
				structure.index.some(({ signature }) => signature.hasAlias)))
	)
		return
	const { sequence } = structure
	if (sequence) {
		if (
			structure.handlesUndeclared ||
			structure.props.length ||
			sequence.prefix ||
			sequence.optionals ||
			sequence.defaultables ||
			sequence.postfix ||
			!sequence.variadic
		)
			return
		return [sequence.variadic]
	}
	for (const prop of structure.props) {
		if (
			!isLiteralKey(prop.key) ||
			(prop.is("required") && !missesAsRequired(prop))
		)
			return
	}
	return [
		...structure.props.map(prop => prop.value),
		...(structure.index?.flatMap(({ signature, value }) => [
			signature,
			value
		]) ?? [])
	]
}

// a missing key whose issue is required's alone, which props reports
const missesAsRequired = (prop: Prop.Node): boolean =>
	missingDescriptionOf(issueSiteOf(prop.failSite)) !== undefined

// what props reports where a checked value's key is missing; undefined where compiled
const checkerDescriptionOf = (node: BaseNode): string | undefined => {
	if (!combines(node)) return
	if (node.is("domain") || node.is("proto")) return checkOf(node)!.description
	if (node.is("unit")) return unitSiteOf(node)!.description
	if (node.is("morph"))
		return node.head ? checkerDescriptionOf(node.head) : undefined
	if (node.is("intersection")) {
		if (node.basis) return node.brief
		const predicate = node.inner.predicate?.[0]
		return predicate && !node.preStruct.length ?
				predicateSiteOf(predicate)!.description
			:	"present"
	}
	if (node.is("union")) {
		const units = unitListOf(node)
		if (units) return units.site.description
		if (domainCasesOf(node)) return discriminantSiteOf(node)!.description
		const discriminated = discriminatedOf(node)
		if (discriminated) return discriminated.missed.description
		return (
			(basesOf(node)?.site as IssueContext | undefined)?.description ??
			unionSiteOf(node)!.description
		)
	}
}

export interface CombinatorCompiler extends NodeCompiler {
	readonly link: { byId: Record<NodeId, BaseNode> }
	// whether it writes intersections a shape checks as that shape
	readonly shapes: boolean
	refToId(id: NodeId, opts?: { kind: "Allows" | "Apply" }): string
}

const writeArgs = (...args: (string | undefined)[]): string => {
	while (args.length && args[args.length - 1] === undefined) args.pop()
	return args.map(arg => arg ?? "void 0").join(", ")
}

// pure, so a bundler drops a checker nothing reads
const writeCall = (
	factory: keyof typeof runtime,
	...args: (string | undefined)[]
): string => `/* @__PURE__ */ runtime.${factory}(${writeArgs(...args)})`

// a description its factory writes itself is omitted
const unlessDerived = (
	derived: string | undefined,
	site: IssueContext
): string | undefined =>
	derived === site.description ? undefined : JSON.stringify(site.description)

// the runtime's checks, by the condition each tests
const constantChecks: Record<string, keyof typeof runtime> = {
	'typeof data === "string"': "stringCheck",
	"Number.isFinite(data)": "numberCheck",
	'data !== null && (typeof data === "object" || typeof data === "function")':
		"objectCheck",
	"Array.isArray(data)": "arrayCheck"
}

const ruleFactories = [
	"min",
	"max",
	"minLength",
	"maxLength",
	"exactLength",
	"divisor"
] as const

// a basis props check as they would
const isObjectCheck = (node: BaseNode): boolean => {
	const site = checkOf(node)!
	return (
		node.is("domain") &&
		node.domain === "object" &&
		site.code === runtime.objectCheck.code &&
		site.description === runtime.objectCheck.description
	)
}

const writeCheck = (js: CombinatorCompiler, node: BaseNode): string => {
	const site = checkOf(node)!
	const condition = node.jsCond!(js, "data")!
	const constant = constantChecks[condition]
	if (constant) {
		const check = runtime[constant] as runtime.Check
		if (site.code === check.code && site.description === check.description)
			return `runtime.${constant}`
	}
	const kind = ruleFactories.find(kind => node.is(kind))
	const { rule, exclusive } = node.inner as { rule?: unknown; exclusive?: true }
	if (kind && typeof rule === "number") {
		if (
			ruleCheckOf(kind, rule) === runtime.integerCheck &&
			site.description === "an integer"
		)
			return "runtime.integerCheck"
		const factory =
			exclusive ?
				kind === "min" ?
					"moreThan"
				:	"lessThan"
			:	kind
		return writeCall(
			factory,
			`${rule}`,
			unlessDerived(
				(runtime[factory] as (rule: number) => runtime.Check)(rule).description,
				site
			)
		)
	}
	if (node.is("pattern")) {
		const instance = js.ref(node.instance)
		if (condition === `${instance}.test(data)`) {
			return writeCall(
				"pattern",
				instance,
				unlessDerived(runtime.pattern(node.instance).description, site)
			)
		}
	}
	return writeCall(
		"check",
		JSON.stringify(site.code),
		JSON.stringify(site.description),
		constant ? `runtime.${constant}.test` : `data => ${condition}`
	)
}

const writeLiteral = (js: CombinatorCompiler, value: unknown): string =>
	value === undefined ? "void 0" : js.serialize(value)

const writeKey = (key: string): string =>
	/^[$A-Z_a-z][\w$]*$/.test(key) ? key : JSON.stringify(key)

const writeObject = (entries: string[]): string => `{ ${entries.join(", ")} }`

// a shape with this many keys that may be absent reads each at a site of its own,
// as a walker's one site costs it far more than it does a compiled shape. So does
// one whose transform can fail, which compiled code wrote at its own sites before
// a checker could hold it
const minSitedKeys = 8

// whether a node's checker fails undefined, calling nothing to find out
const failsUndefined = (node: BaseRoot): boolean =>
	node.is("domain") || node.is("proto") ? true
	: node.is("unit") ? node.unit !== undefined
	: node.is("intersection") ? !!node.basis && failsUndefined(node.basis)
	: node.is("union") ? node.branches.every(failsUndefined)
	: node.is("morph") ? !!node.head && failsUndefined(node.head)
	: false

const writeAccess = (key: string): string => {
	const written = writeKey(key)
	return written === key ? `.${key}` : `[${written}]`
}

// false where a key's check fails, stopping at the first as a walker does, then
// where data holds a key it rejects, for...in also reaching inherited keys
const writeSitedAllows = (structure: StructureNode, refs: string[]): string => {
	const fails = structure.inOrder
		.map((prop, i) => {
			const has = `${JSON.stringify(prop.key)} in data`
			// keys holding the same check call the same checker
			const checker =
				/^runtime\.\w+$/.test(refs[i]) ?
					refs[i]
				:	`checkers[${refs.indexOf(refs[i])}]`
			const fail = `!${checker}(data${writeAccess(prop.key as string)})`
			return (
				prop.is("optional") ? `(${has} && ${fail})`
				: failsUndefined(prop.value) ? fail
				: `(!(${has}) || ${fail})`
			)
		})
		.join(" || ")
	if (structure.handlesUndeclared !== "reject")
		return `(data, checkers) => !(${fails})`
	const declared = structure.inOrder
		.map(prop => `case ${JSON.stringify(prop.key)}:`)
		.join(" ")
	return `(data, checkers) => { if (${fails}) return false; for (const k in data) switch (k) { ${declared} break; default: if (Object.prototype.hasOwnProperty.call(data, k)) return false; } return true; }`
}

// what a key reads through its checker's transform, where it has one
const writeHeld = (prop: Prop.Node, i: number, failing: boolean): string => {
	const read = `data${writeAccess(prop.key as string)}`
	return (
		!prop.value.tfs ? read
		: failing ?
			`values.transformed(checkers[${i}].t, ${read}, ${JSON.stringify(prop.key)})`
		:	`checkers[${i}].t(${read})`
	)
}

// whether a key a default writes holds a value
const writeHolds = (prop: Prop.Node): string =>
	prop.is("optional") && prop.defaultsUndefined ?
		`data${writeAccess(prop.key as string)} !== void 0`
	:	`${JSON.stringify(prop.key)} in data`

// the keys data holds in arktype's order; a default written by a function holds
// its key's place until each transform has run
const writeSitedWrite = (
	js: CombinatorCompiler,
	structure: StructureNode,
	failing: boolean
): string => {
	// keys written before any that may be absent are a literal's
	const literal: string[] = []
	const writes: string[] = []
	const defaults: string[] = []
	for (const [i, prop] of structure.inOrder.entries()) {
		const key = prop.key as string
		const access = writeAccess(key)
		const held = writeHeld(prop, i, failing)
		if (!prop.is("optional")) {
			if (writes.length || access !== `.${key}`)
				writes.push(`result${access} = ${held};`)
			else literal.push(`${key}: ${held}`)
			continue
		}
		const holds = writeHolds(prop)
		if (!prop.hasDef()) writes.push(`if (${holds}) result${access} = ${held};`)
		else if (isLiteralDefault(prop)) {
			writes.push(
				`result${access} = ${holds} ? ${held} : ${writeLiteral(js, prop.default)};`
			)
		} else {
			writes.push(`result${access} = ${holds} ? ${held} : void 0;`)
			defaults.push(
				`if (!(${holds})) values.defaulted(checkers[${i}].w, result);`
			)
		}
	}
	return `(data, checkers, values) => { const result = { ${literal.join(", ")} }; ${writes.join(" ")} ${defaults.length ? `if (!values.failed()) { ${defaults.join(" ")} }` : ""} return result; }`
}

// a shape keeping the keys it doesn't declare copies data where one it declares
// changes: in order where nothing can fail, else each transform, then each default
// where none failed
const writeSitedKeep = (
	js: CombinatorCompiler,
	structure: StructureNode,
	failing: boolean
): string => {
	const transforms: string[] = []
	const defaults: string[] = []
	const out = "(out = out === data ? copy(data) : out)"
	for (const [i, prop] of structure.inOrder.entries()) {
		const access = writeAccess(prop.key as string)
		const read = `data${access}`
		const holds = writeHolds(prop)
		const held = writeHeld(prop, i, failing)
		if (prop.value.tfs) {
			// data's allowed before it's transformed, so holds each key it requires
			const guard = prop.is("optional") ? `${holds} && ` : ""
			transforms.push(
				failing ?
					`if (${guard}!Object.is(v = ${held}, ${read})) ${out}${access} = v;`
				:	`if (${guard}(v = ${held}) !== void 0 && v !== ${read}) ${out}${access} = v;`
			)
		}
		if (!prop.is("optional") || !prop.hasDef()) continue
		;(failing ? defaults : transforms).push(
			isLiteralDefault(prop) ?
				`if (!(${holds})) ${out}${access} = ${writeLiteral(js, prop.default)};`
			:	`if (!(${holds})) values.defaulted(checkers[${i}].w, ${out});`
		)
	}
	return `(data, checkers, values, copy) => { let out = data, v; ${transforms.join(" ")} ${defaults.length ? `if (!values.failed()) { ${defaults.join(" ")} }` : ""} return out; }`
}

const writeStructure = (
	js: CombinatorCompiler,
	structure: StructureNode
): string => {
	const ref = (node: BaseRoot) => readValue(js, node)
	if (structure.sequence) {
		const element = structure.sequence.variadic!
		return writeCall(
			!element.tfs ? "elementsOf"
			: element.hasAlias || element.hasMorph ? "failingElementsOf"
			: "transformingElementsOf",
			ref(element),
			element.tfs && element.hasAlias ? "1" : undefined
		)
	}
	const refs = structure.inOrder.map(prop => ref(prop.value))
	// in arktype's order; a required key expects its value's brief, which its checker holds
	const entries = structure.inOrder.map((prop, i) => {
		const checker = refs[i]
		const missing = missingDescriptionOf(issueSiteOf(prop.failSite))
		return `${writeKey(prop.key as string)}: ${
			prop.is("optional") ?
				!prop.hasDef() ? writeCall("optional", checker)
				: isLiteralDefault(prop) ?
					writeCall(
						prop.defaultsUndefined ? "replacingUndefined" : "optional",
						checker,
						writeLiteral(js, prop.default)
					)
				:	writeCall(
						"writtenBy",
						checker,
						prop.defMorph.length === 2 ?
							`(data, ctx) => ${js.ref(prop.defMorph)}(data, ctx)`
						:	`data => ${js.ref(prop.defMorph)}(data)`,
						prop.defaultsUndefined ? "1" : undefined
					)
			: checkerDescriptionOf(prop.value) === missing ? checker
			: writeCall("required", checker, JSON.stringify(missing))
		}`
	})
	const declared = writeObject(entries)
	if (structure.index) {
		const [{ signature, value }] = structure.index
		if (
			structure.index.length === 1 &&
			!entries.length &&
			!structure.handlesUndeclared &&
			signature.is("domain") &&
			signature.domain === "string"
		)
			return writeCall("recordOf", ref(value))
		return writeCall(
			"indexed",
			`[${structure.index.map(({ signature, value }) => `[${readChecker(js, signature)}, ${ref(value)}]`).join(", ")}]`,
			entries.length ? declared : structure.handlesUndeclared && "void 0",
			structure.handlesUndeclared &&
				JSON.stringify(removedSiteOf(structure)!.description)
		)
	}
	const withCtx = structure.hasAlias ? "1" : undefined
	const failing =
		structure.hasAlias ||
		structure.hasMorph ||
		structure.props.some(writesByValues)
	if (failing || (structure.optional?.length ?? 0) >= minSitedKeys) {
		const deletes = structure.handlesUndeclared === "delete"
		return writeCall(
			"sited",
			writeSitedAllows(structure, refs),
			declared,
			deletes ? writeSitedWrite(js, structure, failing)
			: structure.tfs ? writeSitedKeep(js, structure, failing)
			: "0",
			!structure.tfs ? "0" : `${(deletes ? 2 : 0) + (failing ? 2 : 1)}`,
			structure.handlesUndeclared && !deletes ?
				JSON.stringify(removedSiteOf(structure)!.description)
			:	undefined,
			withCtx
		)
	}
	if (structure.handlesUndeclared === "delete") {
		return writeCall(
			failing ? "failingDeletingProps" : "deletingProps",
			declared,
			withCtx
		)
	}
	if (!structure.handlesUndeclared) {
		return writeCall(
			!structure.tfs ? "props"
			: failing ? "failingProps"
			: "transformingProps",
			declared,
			withCtx
		)
	}
	const removed = removedSiteOf(structure)!
	return writeCall(
		!structure.tfs ? "closedProps"
		: failing ? "failingClosedProps"
		: "transformingClosedProps",
		declared,
		removed.description === "removed" ?
			undefined
		:	JSON.stringify(removed.description),
		withCtx
	)
}

// the nodes a checker writes itself, rather than reading another's
const ownNodesOf = (node: BaseNode): BaseNode[] =>
	node.children.flatMap(child =>
		child.isRoot() && !isInlined(child) ? [] : [child, ...ownNodesOf(child)]
	)

// a node whose checker would declare a value, as a pattern does its RegExp
const declaresRef = (node: BaseNode): boolean =>
	node.is("morph") ||
	node.is("pattern") ||
	node.is("predicate") ||
	(node.is("proto") && node.proto !== Array) ||
	(node.is("union") && !!discriminatedOf(node))

const maxInlinedNodes = 8

const maxInlinedObjectNodes = 24

const inlinedByNode = new WeakMap<BaseNode, boolean>()

// a small checker declaring nothing is inlined, as gzip shrinks its repeats below a name
const isInlined = (node: BaseNode): boolean => {
	let inlined = inlinedByNode.get(node)
	if (inlined === undefined) {
		inlinedByNode.set(node, false)
		const own = combines(node) && !node.isCyclic && ownNodesOf(node)
		inlined =
			!!own &&
			!declaresRef(node) &&
			!own.some(declaresRef) &&
			(own.length <= maxInlinedNodes ||
				// an object reading no other's checker is likely anonymous
				(own.length <= maxInlinedObjectNodes &&
					own.every(
						child =>
							!child.is("structure") ||
							child.props.every(prop => isInlined(prop.value))
					)))
		inlinedByNode.set(node, inlined)
	}
	return inlined
}

type RuleKind = (typeof ruleFactories)[number]

const ruleCheckOf = (kind: RuleKind, rule: number): runtime.Check =>
	kind === "divisor" && rule === 1 ?
		runtime.integerCheck
	:	(runtime[kind] as (rule: number) => runtime.Check)(rule)

// each refinement's rule in kinds order, if each is an inclusive bound or divisor
const rulesOf = (
	refinements: readonly BaseNode[],
	kinds: readonly RuleKind[]
): (number | undefined)[] | undefined => {
	const rules: (number | undefined)[] = kinds.map(() => undefined)
	let i = 0
	for (const node of refinements) {
		while (i < kinds.length && !node.is(kinds[i])) i++
		if (i === kinds.length) return
		const { rule, exclusive } = node.inner as {
			rule?: unknown
			exclusive?: true
		}
		const site = checkOf(node)
		if (
			typeof rule !== "number" ||
			exclusive ||
			!site ||
			site.code !== kinds[i] ||
			site.description !== ruleCheckOf(kinds[i], rule).description
		)
			return
		rules[i++] = rule
	}
	return rules
}

const writeRules = (rules: (number | undefined)[]) =>
	rules.map(rule => (rule === undefined ? undefined : `${rule}`))

// an intersection one of the runtime's shapes checks, as one call
const writeShape = (
	js: CombinatorCompiler,
	node: IntersectionNode
): string | undefined => {
	const { basis, structure, preStruct } = node
	if (!basis || node.inner.predicate) return
	const checked = writeCheck(js, basis)
	if (checked === "runtime.stringCheck" && !structure) {
		const rules = rulesOf(preStruct, ["maxLength", "minLength"])
		if (rules) return writeCall("stringRange", ...writeRules(rules))
	}
	if (checked === "runtime.numberCheck" && !structure) {
		const rules = rulesOf(preStruct, ["divisor", "max", "min"])
		if (rules?.[0] === 1)
			return writeCall("integerRange", ...writeRules([rules[2], rules[1]]))
	}
	if (checked === "runtime.arrayCheck" && structure?.sequence) {
		const element = structure.sequence.variadic!
		const failing = element.hasAlias || element.hasMorph
		const rules =
			(!element.tfs || failing) &&
			rulesOf(preStruct, ["maxLength", "minLength"])
		if (rules) {
			return element.tfs ?
					writeCall(
						"failingArrayOf",
						readValue(js, element),
						...writeRules(rules),
						element.hasAlias ? "1" : undefined
					)
				:	writeCall("arrayOf", readValue(js, element), ...writeRules(rules))
		}
	}
}

const readChecker = (js: CombinatorCompiler, node: BaseRoot): string =>
	isInlined(node) ? writeCombinator(js, node)!
	: node.hasAlias && !combines(node) ?
		writeCall("compiled", js.ref(node), node.tfs ? "1" : undefined)
	:	js.refToId(node.id, { kind: node.allowsCtx ? "Apply" : "Allows" })

const readValue = (js: CombinatorCompiler, node: BaseRoot): string =>
	node.hasAlias ?
		writeCall(
			"aliasedValue",
			readChecker(js, node),
			js.ref(node),
			`${(node.entersAlias ? 1 : 0) | (node.tfsById ? 2 : 0)}`
		)
	:	readChecker(js, node)

// a case read as the branch it was pruned from where that holds an alias
const readCase = (
	js: CombinatorCompiler,
	node: BaseRoot,
	member: BaseRoot | undefined
): string =>
	member?.hasAlias ?
		writeCall(
			"aliasedMember",
			readChecker(js, node),
			JSON.stringify(js.nameOf(member.id))
		)
	:	readChecker(js, node)

/** a node's checker, if it combines */
export const writeCombinator = (
	js: CombinatorCompiler,
	node: BaseNode
): string | undefined => {
	if (!combines(node)) return
	if (node.checksCtx) return writeCall("readingCtx", writeChecker(js, node))
	return writeChecker(js, node)
}

const writeChecker = (
	js: CombinatorCompiler,
	node: BaseNode
): string | undefined => {
	if (node.is("domain") || node.is("proto")) return writeCheck(js, node)
	if (node.is("unit")) {
		return writeCall(
			"unit",
			writeLiteral(js, node.unit),
			unlessDerived(runtime.describeValues([node.unit]), unitSiteOf(node)!)
		)
	}
	if (node.is("morph")) return writeMorph(js, node)
	if (node.is("intersection")) return writeIntersectionCombinator(js, node)
	if (node.is("union")) return writeUnionCombinator(js, node)
}

// a callback is read where it's called, as it may be set once this has loaded
const writeMorph = (js: CombinatorCompiler, node: MorphNode): string =>
	writeCall(
		"morphing",
		node.head ? readChecker(js, node.head) : "0",
		`[${node.travMorphs
			.slice(node.head ? 1 : 0)
			.map(step => {
				if (!hasArkKind(step, "root")) {
					return isKeyword(step) ?
							js.ref(step)
						:	`data => ${js.ref(step)}(data)`
				}
				// a morph references only its last step
				js.link.byId[step.id] ??= step
				return writeCall(
					"piped",
					readChecker(js, step),
					step.reportsPred ? "1" : undefined
				)
			})
			.join(", ")}]`
	)

const writeIntersectionCombinator = (
	js: CombinatorCompiler,
	node: IntersectionNode
): string => {
	const shape = js.shapes && writeShape(js, node)
	if (shape) return shape
	const refinements = node.preStruct.map(child => writeCheck(js, child))
	const structure = node.structure && writeStructure(js, node.structure)
	const predicates = node.inner.predicate?.map(predicate =>
		writePredicate(js, predicate)
	)
	const narrowed =
		predicates?.length === 1 ?
			predicates[0]
		:	predicates && writeCall("narrowedByEach", `[${predicates.join(", ")}]`)
	const within =
		structure && narrowed ?
			writeCall(
				"narrowedAfter",
				(
					node.structure!.hasAlias &&
						node.structure!.tfs &&
						!node.structure!.checksCtx
				) ?
					writeCall("holdingAlias", structure)
				:	structure,
				narrowed
			)
		:	(structure ?? narrowed)
	// props check data is an object, as their basis would
	if (
		within &&
		!refinements.length &&
		(!node.basis ||
			((node.structure?.props.length || node.structure?.index) &&
				isObjectCheck(node.basis)))
	)
		return within
	return writeCall(
		"intersection",
		node.basis ? writeCheck(js, node.basis) : "0",
		`[${refinements.join(", ")}]`,
		within,
		node.basis && node.brief !== checkOf(node.basis)!.description ?
			JSON.stringify(node.brief)
		:	undefined
	)
}

// a callback is read where it's called, as it may be set once this has loaded
const writePredicate = (
	js: CombinatorCompiler,
	node: nodeOfKind<"predicate">
): string => {
	const fn = js.ref(node.predicate)
	if (isKeyword(node.predicate)) {
		return writeCall(
			"check",
			'"predicate"',
			JSON.stringify(predicateSiteOf(node)!.description),
			fn
		)
	}
	return writeCall(
		returnsReports.has(node.predicate) ? "narrowedWithCtx"
		: raisesNothing(node.predicate) ? "narrowedBy"
		: "narrowedInCtx",
		`() => ${fn}`,
		isNamedByItsFunction(node) ? undefined : (
			JSON.stringify(predicateSiteOf(node)!.description)
		)
	)
}

const caseMember = (node: UnionNode, k: string): BaseRoot | undefined =>
	(node.discriminant!.members as Record<string, BaseRoot> | undefined)?.[k]

// a list of units, cases by domain, a discriminated union or a list of checkers
const writeUnionCombinator = (
	js: CombinatorCompiler,
	node: UnionNode
): string => {
	const ref = (branch: BaseRoot, k?: string) =>
		readCase(js, branch, k === undefined ? undefined : caseMember(node, k))
	const fails =
		node.tfs && (node.hasMorph || node.hasAlias) ?
			"runtime.failingBranches"
		:	undefined
	const units = unitListOf(node)
	if (units) {
		if (
			units.site.code === "discriminant" &&
			units.site.description === "boolean" &&
			units.values.length === 2 &&
			units.values.every(value => typeof value === "boolean")
		)
			return "runtime.booleanChecker"
		return writeCall(
			"units",
			`[${units.values.map(value => writeLiteral(js, value)).join(", ")}]`,
			units.site.code === "discriminant" ? undefined : '"union"',
			unlessDerived(runtime.describeValues(units.values), units.site)
		)
	}
	const domains = domainCasesOf(node)
	if (domains) {
		const cases = Object.entries(domains).map(
			([domain, branch]): [string, string] => [
				domain,
				// null and undefined are their domain's only value
				(
					branch === true ||
					(branch.is("unit") && (domain === "null" || domain === "undefined"))
				) ?
					"1"
				:	ref(branch, JSON.stringify(domain))
			]
		)
		const { description } = discriminantSiteOf(node)!
		const [domain, checker] = cases.find(([k]) => k !== "null")!
		if (
			!fails &&
			cases.length === 2 &&
			cases.some(([k, branch]) => k === "null" && branch === "1") &&
			description === runtime.nullableDescriptionOf(domain)
		) {
			if (domain === "object") return writeCall("nullableObject", checker)
			if (
				!Object.values(domains).some(branch => branch !== true && branch.tfs)
			) {
				return writeCall(
					"nullable",
					checker,
					domain === "string" ? undefined : JSON.stringify(domain)
				)
			}
		}
		return writeCall(
			"domains",
			writeObject(cases.map(([domain, branch]) => `${domain}: ${branch}`)),
			JSON.stringify(description),
			fails
		)
	}
	const discriminated = discriminatedOf(node)
	if (discriminated) {
		const { key, otherwise, site, missed } = discriminated
		const keys = Object.keys(discriminated.cases)
		const cases = writeObject(
			keys.map(k => {
				const branch = discriminated.cases[k]
				return `${writeKey(k)}: ${
					branch === true ? "1" : (
						ref(branch, discriminated.areBooleans ? k : JSON.stringify(k))
					)
				}`
			})
		)
		const missedArg =
			missed.code === "union" && missed.description === "an object" ?
				undefined
			:	`{ code: "union", description: ${JSON.stringify(missed.description)} }`
		return otherwise ?
				writeCall(
					"discriminateOr",
					ref(otherwise),
					JSON.stringify(key),
					cases,
					JSON.stringify(site.description),
					missedArg,
					fails
				)
			:	writeCall(
					"discriminate",
					JSON.stringify(key),
					cases,
					unlessDerived(runtime.describeValues(keys), site),
					missedArg,
					discriminated.isOwn ? "1" : undefined,
					discriminated.areBooleans ? "1" : undefined,
					fails
				)
	}
	return writeCall(
		"union",
		`[${node.branches.map(branch => ref(branch)).join(", ")}]`,
		JSON.stringify(checkerDescriptionOf(node)),
		listsBranches(node) ?
			listedIssueOf(node)
		:	`runtime.ownIssue(runtime.siteOf("union", ${JSON.stringify(unionSiteOf(node)!.description)}))`,
		fails
	)
}
