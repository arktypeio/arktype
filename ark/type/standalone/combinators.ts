import {
	isDecidedByAllows,
	type BaseNode,
	type BaseRoot,
	type IntersectionNode,
	type NodeCompiler,
	type NodeId,
	type Optional,
	type Prop,
	type StructureNode,
	type UnionNode,
	type UnitNode
} from "@ark/schema"
import { domainOf, isWellFormedInteger } from "@ark/util"
import * as runtime from "../runtimeExports.ts"
import { basesOf, unifies } from "./compilers.ts"
import {
	isDescribed,
	isInlineSite,
	isKeyword,
	issueContextOf,
	issueSiteOf,
	type IssueContext
} from "./sites.ts"

// a size build writes each node it can as a call composing runtime checkers,
// which describe what they check from its rule, so text is written only where
// a site's differs

const combinableByNode = new WeakMap<BaseNode, boolean>()

// whether a node and each root it reaches are written as checkers
export const combines = (node: BaseNode): boolean => {
	let combinable = combinableByNode.get(node)
	if (combinable === undefined) {
		// a node reached again while it's decided is in a cycle, so compiled
		combinableByNode.set(node, false)
		combinable =
			node.isRoot() &&
			!node.includesAlias &&
			!node.includesMorph &&
			!node.allowsNeedsCtx &&
			!node.transformNeedsCtx &&
			calleesOf(node)?.every(isCallable) === true
		combinableByNode.set(node, combinable)
	}
	return combinable
}

// a root a checker calls: another checker, or one compiled with a unified
// Allows, which reports to a ctx it's passed and transforms nothing
const isCallable = (node: BaseRoot): boolean => combines(node) || unifies(node)

// the roots a node's checker calls, if it can be written
const calleesOf = (node: BaseNode): BaseRoot[] | undefined => {
	if (node.hasKind("domain") || node.hasKind("proto"))
		return checkOf(node) && []
	if (node.hasKind("unit")) return unitSiteOf(node) && []
	if (node.hasKind("intersection")) {
		const predicates = node.inner.predicate ?? []
		// a structure's issues stop its predicates, which Allows can't count,
		// and the first of several predicates failing stops the rest
		if (
			predicates.length > (node.structure ? 0 : 1) ||
			!predicates.every(predicateSiteOf) ||
			!node.prestructurals.every(checkOf) ||
			(node.basis && !checkOf(node.basis))
		)
			return
		return node.structure ? structureCalleesOf(node.structure) : []
	}
	if (node.hasKind("union")) {
		if (unitListOf(node)) return []
		const domains = domainCasesOf(node)
		if (domains) {
			return Object.values(domains).filter(
				(branch): branch is BaseRoot => branch !== true
			)
		}
		const discriminated = discriminatedOf(node)
		if (discriminated) {
			return Object.values(discriminated.cases).filter(
				(branch): branch is BaseRoot => branch !== true
			)
		}
		if (
			node.discriminantJit ||
			!isDecidedByAllows(node) ||
			!unionSiteOf(node) ||
			basesSiteOf(node) === null
		)
			return
		return [...node.branches]
	}
}

const plainContextOf = (context: object): IssueContext | undefined =>
	isInlineSite(context) && isDescribed(context) ? context : undefined

// a node's own site, if it holds only a code and a description
const plainSiteOf = (node: BaseNode): IssueContext | undefined =>
	plainContextOf(issueSiteOf(node.failureSite))

const unionSiteOf = (node: UnionNode): IssueContext | undefined =>
	plainContextOf(issueContextOf({ ...node.failureSite, code: "union" }))

const discriminantSiteOf = (node: UnionNode): IssueContext | undefined =>
	plainContextOf(
		issueContextOf({
			code: "discriminant",
			description: node.discriminantDescription,
			meta: node.discriminantMeta
		})
	)

// what a union data fails every branch's basis of expects, undefined if it
// has no bases or null if they can't be checked
const basesSiteOf = (node: UnionNode): IssueContext | null | undefined => {
	const bases = basesOf(node)
	if (!bases) return
	return bases.nodes.every(checkOf) ?
			(plainContextOf(bases.site) ?? null)
		:	null
}

// a basis or refinement, checked by its condition
const checkOf = (node: BaseNode): IssueContext | undefined =>
	node.compileCondition && plainSiteOf(node)

// a keyword's predicate, which reads no ctx
const predicateSiteOf = (node: BaseNode): IssueContext | undefined =>
	node.hasKind("predicate") && isKeyword(node.predicate) ?
		plainSiteOf(node)
	:	undefined

// a value compared by identity and printed by the runtime
const isPrinted = (value: unknown): boolean =>
	typeof value === "string" ||
	typeof value === "boolean" ||
	value === null ||
	value === undefined ||
	(typeof value === "number" && !Object.is(value, -0) && value === value)

const unitSiteOf = (node: BaseNode): IssueContext | undefined =>
	node.hasKind("unit") && isPrinted(node.unit) ? plainSiteOf(node) : undefined

interface Units {
	values: unknown[]
	site: IssueContext
}

// a union of values, listed as their description lists them
const unitListOf = (node: UnionNode): Units | undefined => {
	if (!node.branches.every(unitSiteOf)) return
	const values = node.branches.map(branch => (branch as UnitNode).unit)
	const discriminant = node.discriminantJit
	if (!discriminant) {
		const site = unionSiteOf(node)
		return site && { values, site }
	}
	if (
		discriminant.kind !== "unit" ||
		discriminant.path.length ||
		node.missListsBranches ||
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
	site: IssueContext
	// what data that isn't an object fails
	missed: IssueContext
}

// a union told apart by a string at one key
const discriminatedOf = (node: UnionNode): Cases | undefined => {
	const discriminant = node.discriminantJit
	if (
		!discriminant ||
		discriminant.kind !== "unit" ||
		discriminant.path.length !== 1 ||
		typeof discriminant.path[0] !== "string" ||
		discriminant.members ||
		node.missListsBranches
	)
		return
	const key = discriminant.path[0]
	const cases: Record<string, BaseRoot | true> = {}
	for (const k in discriminant.cases) {
		if (!k.startsWith('"')) return
		const value = JSON.parse(k) as string
		if (isWellFormedInteger(value) || value === "__proto__") return
		const pruned = discriminant.cases[k]
		// a case's checker doesn't check the key again, unless it can't be one
		cases[value] =
			pruned === true || combines(pruned) ?
				pruned
			:	unprunedOf(
					node,
					branch => {
						const prop =
							branch.hasKind("intersection") ?
								branch.structure?.propsByKey[key]
							:	undefined
						return (
							prop?.hasKind("required") === true &&
							prop.value.hasKind("unit") &&
							prop.value.unit === value
						)
					},
					pruned
				)
	}
	const site = discriminantSiteOf(node)
	// data whose key can't be read fails each branch's basis, as an object
	const bases = basesSiteOf(node)
	const missed =
		bases === undefined ? unionSiteOf(node)
		: basesOf(node)!.nodes.every(basis => basis.domain === "object") ?
			(bases ?? undefined)
		:	undefined
	return (
		site &&
		missed && {
			key,
			isOwn: node.missPath.length === 0,
			cases,
			site,
			missed
		}
	)
}

// a union told apart by data's domain, as JSON keys each case
const domainCasesOf = (
	node: UnionNode
): Record<string, BaseRoot | true> | undefined => {
	const discriminant = node.discriminantJit
	if (
		!discriminant ||
		discriminant.kind !== "domain" ||
		discriminant.path.length ||
		discriminant.members ||
		node.missListsBranches ||
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
	branch.hasKind("unit") ? domainOf(branch.unit)
	: branch.hasKind("domain") ? branch.domain
	: branch.hasKind("proto") ? "object"
	: branch.hasKind("intersection") && branch.basis ?
		branch.basis.hasKind("domain") ?
			branch.basis.domain
		:	"object"
	:	undefined

// a case is checked by the one branch it was pruned from, which checks again
// what told it apart, so it shares that branch's checker
const unprunedOf = (
	node: UnionNode,
	isCase: (branch: BaseRoot) => boolean,
	pruned: BaseRoot | true
): BaseRoot | true => {
	if (pruned === true) return pruned
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
	!prop.defaultsUndefined && !prop.value.transforms && isPrinted(prop.default)

const structureCalleesOf = (
	structure: StructureNode
): BaseRoot[] | undefined => {
	// its structural morph, if any, writes its defaults
	if (
		structure.index ||
		structure.undeclared ||
		structure.inheritableProps.length
	)
		return
	const { sequence } = structure
	if (sequence) {
		if (
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
			(prop.hasKind("required") && !missesAsRequired(prop)) ||
			(prop.hasKind("optional") && prop.hasDefault() && !isLiteralDefault(prop))
		)
			return
	}
	return structure.props.map(prop => prop.value)
}

// a missing key whose issue is required's alone
const missesAsRequired = (prop: Prop.Node): boolean => {
	const { m: missing } = issueSiteOf(prop.failureSite) as { m?: object }
	return (
		missing === runtime.requiredSite.m ||
		(missing !== undefined &&
			plainContextOf(missing)?.code === "required" &&
			(missing as IssueContext).description === undefined)
	)
}

// what a combinator's compiler reads, ref names and serializes
export interface CombinatorCompiler extends NodeCompiler {
	// whether it writes intersections a shape checks as that shape
	readonly shapes: boolean
	referenceToId(id: NodeId, opts?: { kind: "Allows" }): string
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
		node.hasKind("domain") &&
		node.domain === "object" &&
		site.code === runtime.objectCheck.code &&
		site.description === runtime.objectCheck.description
	)
}

const writeCheck = (js: CombinatorCompiler, node: BaseNode): string => {
	const site = checkOf(node)!
	const condition = node.compileCondition!(js, "data")!
	const constant = constantChecks[condition]
	if (constant) {
		const check = runtime[constant] as runtime.Check
		return site.code === check.code && site.description === check.description ?
				`runtime.${constant}`
			:	writeCall(
					"check",
					JSON.stringify(site.code),
					JSON.stringify(site.description),
					`runtime.${constant}.test`
				)
	}
	const factory = ruleFactories.find(kind => node.hasKind(kind))
	const { rule, exclusive } = node.inner as { rule?: unknown; exclusive?: true }
	if (factory && typeof rule === "number") {
		const bounds = factory === "min" || factory === "max"
		const flag = bounds && exclusive ? "1" : undefined
		const derived = (
			runtime[factory] as (rule: number, exclusive?: 1) => runtime.Check
		)(rule, flag && 1)
		return writeCall(
			factory,
			`${rule}`,
			...(bounds ? [flag] : []),
			unlessDerived(derived.description, site)
		)
	}
	if (node.hasKind("pattern")) {
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
		`data => ${condition}`
	)
}

const writeLiteral = (js: CombinatorCompiler, value: unknown): string =>
	value === undefined ? "void 0" : js.serialize(value)

const writeKey = (key: string): string =>
	/^[$A-Z_a-z][\w$]*$/.test(key) ? key : JSON.stringify(key)

const writeObject = (entries: string[]): string => `{ ${entries.join(", ")} }`

const writeStructure = (
	js: CombinatorCompiler,
	structure: StructureNode
): string => {
	const ref = (node: BaseNode) => readChecker(js, node)
	if (structure.sequence) {
		const element = structure.sequence.variadic!
		return writeCall(
			element.transforms ? "transformingElementsOf" : "elementsOf",
			ref(element)
		)
	}
	// checked and written in the order arktype checks and writes them
	const entries = structure.orderedProps.map(prop => {
		const checker = ref(prop.value)
		return `${writeKey(prop.key as string)}: ${
			!prop.hasKind("optional") ? checker
			: prop.hasDefault() ?
				writeCall("optional", checker, writeLiteral(js, prop.default))
			:	writeCall("optional", checker)
		}`
	})
	return writeCall(
		structure.transforms ? "transformingProps" : "props",
		writeObject(entries)
	)
}

// the nodes a checker writes itself, rather than reading another's
const ownNodesOf = (node: BaseNode): BaseNode[] =>
	node.children.flatMap(child =>
		child.isRoot() && !isInlined(child) ? [] : [child, ...ownNodesOf(child)]
	)

// a node whose checker would declare a value, as a pattern does its RegExp
const declaresRef = (node: BaseNode): boolean =>
	node.hasKind("pattern") ||
	node.hasKind("predicate") ||
	(node.hasKind("proto") && node.proto !== Array) ||
	(node.hasKind("union") && !!discriminatedOf(node))

const maxInlinedNodes = 8

const maxInlinedObjectNodes = 24

const inlinedByNode = new WeakMap<BaseNode, boolean>()

// a small checker declaring nothing is written where it's read, as gzip
// shrinks its repeats to less than a shared name
const isInlined = (node: BaseNode): boolean => {
	let inlined = inlinedByNode.get(node)
	if (inlined === undefined) {
		inlinedByNode.set(node, false)
		const own = combines(node) && !node.isCyclic ? ownNodesOf(node) : []
		inlined =
			combines(node) &&
			!node.isCyclic &&
			!declaresRef(node) &&
			!own.some(declaresRef) &&
			(own.length <= maxInlinedNodes ||
				// an object reading no other's checker is likely anonymous
				(own.length <= maxInlinedObjectNodes &&
					own.every(
						child =>
							!child.hasKind("structure") ||
							child.props.every(prop => isInlined(prop.value))
					)))
		inlinedByNode.set(node, inlined)
	}
	return inlined
}

type RuleKind = (typeof ruleFactories)[number]

// each refinement's rule, in the order kinds lists them, if each is an
// inclusive bound or divisor whose site its factory derives
const rulesOf = (
	refinements: readonly BaseNode[],
	kinds: readonly RuleKind[]
): (number | undefined)[] | undefined => {
	const rules: (number | undefined)[] = kinds.map(() => undefined)
	let i = 0
	for (const node of refinements) {
		while (i < kinds.length && !node.hasKind(kinds[i])) i++
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
			site.description !==
				(runtime[kinds[i]] as (rule: number) => runtime.Check)(rule).description
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
	const { basis, structure, prestructurals } = node
	if (!basis || node.inner.predicate) return
	const checked = writeCheck(js, basis)
	if (checked === "runtime.stringCheck" && !structure) {
		const rules = rulesOf(prestructurals, ["maxLength", "minLength"])
		if (rules) return writeCall("stringRange", ...writeRules(rules))
	}
	if (checked === "runtime.numberCheck" && !structure) {
		const rules = rulesOf(prestructurals, ["divisor", "max", "min"])
		if (rules?.[0] === 1)
			return writeCall("integerRange", ...writeRules([rules[2], rules[1]]))
	}
	if (
		checked === "runtime.arrayCheck" &&
		structure?.sequence &&
		!structure.sequence.variadic!.transforms
	) {
		const rules = rulesOf(prestructurals, ["maxLength", "minLength"])
		if (rules) {
			return writeCall(
				"arrayOf",
				readChecker(js, structure.sequence.variadic!),
				...writeRules(rules)
			)
		}
	}
}

const readChecker = (js: CombinatorCompiler, node: BaseNode): string =>
	isInlined(node) ?
		writeCombinator(js, node)!
	:	js.referenceToId(node.id, { kind: "Allows" })

/** a node's checker, if it combines */
export const writeCombinator = (
	js: CombinatorCompiler,
	node: BaseNode
): string | undefined => {
	if (!combines(node)) return
	const ref = (node: BaseNode) => readChecker(js, node)
	if (node.hasKind("domain") || node.hasKind("proto"))
		return writeCheck(js, node)
	if (node.hasKind("unit")) {
		return writeCall(
			"unit",
			writeLiteral(js, node.unit),
			unlessDerived(runtime.describeValues([node.unit]), unitSiteOf(node)!)
		)
	}
	if (node.hasKind("intersection")) {
		const shape = js.shapes && writeShape(js, node)
		if (shape) return shape
		const refinements = node.prestructurals.map(child => writeCheck(js, child))
		const structure = node.structure && writeStructure(js, node.structure)
		const predicate = node.inner.predicate?.[0]
		const within =
			structure ??
			(predicate &&
				writeCall(
					"check",
					'"predicate"',
					JSON.stringify(predicateSiteOf(predicate)!.description),
					js.ref(predicate.predicate)
				))
		// props check data is an object, as their basis would
		if (
			within &&
			!refinements.length &&
			(!node.basis ||
				(node.structure?.props.length && isObjectCheck(node.basis)))
		)
			return within
		return writeCall(
			"intersection",
			node.basis ? writeCheck(js, node.basis) : "0",
			`[${refinements.join(", ")}]`,
			within
		)
	}
	if (node.hasKind("union")) {
		const units = unitListOf(node)
		if (units) {
			if (
				units.site.code === "union" &&
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
			return writeCall(
				"domains",
				writeObject(
					Object.entries(domains).map(
						([domain, branch]) =>
							// null and undefined are their domain's only value
							`${domain}: ${branch === true || domain === "null" || domain === "undefined" ? "1" : ref(branch)}`
					)
				),
				JSON.stringify(discriminantSiteOf(node)!.description)
			)
		}
		const discriminated = discriminatedOf(node)
		if (discriminated) {
			const keys = Object.keys(discriminated.cases)
			const { missed } = discriminated
			const missedDerived =
				missed.code === "union" && missed.description === "an object"
			return writeCall(
				"discriminate",
				JSON.stringify(discriminated.key),
				writeObject(
					keys.map(k => {
						const branch = discriminated.cases[k]
						return `${writeKey(k)}: ${branch === true ? "1" : ref(branch)}`
					})
				),
				unlessDerived(runtime.describeValues(keys), discriminated.site),
				missedDerived ? undefined : (
					`{ code: "union", description: ${JSON.stringify(missed.description)} }`
				),
				discriminated.isOwn ? "1" : undefined
			)
		}
		const bases = basesSiteOf(node)
		return writeCall(
			"union",
			`[${node.branches.map(ref).join(", ")}]`,
			JSON.stringify(unionSiteOf(node)!.description),
			bases ?
				`[${basesOf(node)!
					.nodes.map(basis => writeCheck(js, basis))
					.join(", ")}]`
			:	undefined,
			bases ? JSON.stringify(bases.description) : undefined
		)
	}
}
