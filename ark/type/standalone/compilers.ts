import {
	compileDomainOf,
	describeBranches,
	isDecidedByAllows,
	precompileRootUnits,
	TraversalCompiler,
	type BaseNode,
	type BaseRoot,
	type InvokeOptions,
	type NodeId,
	type nodeOfKind,
	type Predicate,
	type ReferenceOptions,
	type RootUnit,
	type StructureNode,
	type SwitchCase,
	type TraversalKind,
	type UnionNode
} from "@ark/schema"
import { throwInternalError } from "@ark/util"
import { failsAtPath, FirstIssues } from "../runtime.ts"
import { runtimeKeyOf } from "../standalone.ts"
import { combines, writeCombinator } from "./combinators.ts"
import {
	isDescribed,
	isInlineSite,
	isKeyword,
	issueContextOf,
	issueSite,
	issueSiteOf,
	requiredIssue,
	unionKeySiteOf,
	withoutStrings,
	writeSiteOf,
	type IssueContext,
	type TextContext
} from "./sites.ts"

class StandaloneCompiler extends TraversalCompiler {
	override readonly reportsFirst: boolean = false
	// a unit is named for its content as compiled without the size forms that
	// follow from it
	readonly naming: boolean = this.linkage.unit === undefined

	// whether a node's Apply is its Allows, as a unified build writes it
	unifies(node: BaseNode): boolean {
		return unifies(node)
	}

	// terser and swc write a function called once where it's called, as a
	// closure created at each call, which slows the Allows or Transform
	// calling it; minifiers drop the annotation
	override invoke(node: BaseNode, opts?: InvokeOptions): string {
		const call = super.invoke(node, opts)
		return (
				this.shortest ||
					this.naming ||
					(opts?.kind ?? this.traversalKind) === "Apply" ||
					!/^[\w$]+\(/.test(call)
			) ?
				call
			:	`/* @__NOINLINE__ */ ${call}`
	}

	// named for its unit, so units can share a scope
	override ref(value: object | symbol): string {
		const { unit } = this.linkage
		if (unit === undefined) return super.ref(value)
		let name = this.refs!.get(value)
		if (name === undefined)
			this.refs!.set(value, (name = refNameOf(unit, this.refs!.size)))
		return name
	}

	override site(node: BaseNode): string {
		return this.siteRef(issueSiteOf(node.failureSite))
	}

	// a site of literals, or a key's site of them, is built where it fails, and
	// stays a ref the unit keys
	siteRef(site: object): string {
		const ref = this.ref(site)
		if (isInlineSite(site)) return writeSiteOf(site, JSON.stringify)
		const { v: value, m: missing } = site as { v?: object; m?: object }
		return (
				missing === requiredIssue &&
					value &&
					isInlineSite(value) &&
					isDescribed(value)
			) ?
				writeSiteOf(value, JSON.stringify, "keySiteOf")
			:	ref
	}

	// a keyword check adds no issues itself, so its Apply needn't count them
	override addsNoIssues(predicate: Predicate): boolean {
		return isKeyword(predicate)
	}

	// a union no branch allows reports its description, unless data fails
	// each branch's basis, which arktype then describes it by
	override unionFails(node: UnionNode): string {
		const bases = basesOf(node)
		if (!bases) return `!${this.error(node)}`
		const allowed = bases.nodes
			.map(basis => basis.compileCondition(this, "data"))
			.join(" || ")
		return `!${this.fails("failsAt", `${allowed} ? ${this.site(node)} : ${this.siteRef(bases.site)}, data`)}`
	}

	// reported at the discriminant so branches don't rerun, unless data can't
	// be read there, when it fails each branch
	override missFails(node: UnionNode): string {
		if (node.missListsBranches) return this.unionFails(node)
		const path = node.missPath
		const context = issueContextOf({
			code: "discriminant",
			description: node.discriminantDescription,
			meta: node.discriminantMeta
		})
		const site = this.siteRef(issueSite(context))
		// a key below data is read as a key site reads it
		const fails =
			path.length > 1 ?
				`!${this.ref(failsAtPath)}(ctx, ${site}, data, [${path.map(k => this.serialize(k)).join(", ")}])`
			:	`!${this.fails("failsAt", path.length ? `${site}, data, ${this.serialize(path[0])}` : `${site}, data`)}`
		const [k, ...deeper] = node.discriminant!.path
		if (k === undefined) return fails
		const reads: string[] = []
		let parent = `data${this.prop(k)}`
		for (const key of deeper) {
			reads.push(compileRead(parent, key))
			parent += this.prop(key)
		}
		const readable =
			reads.length ?
				`${reads.join(" && ")} ? ${fails} : ${this.unionFails(node)}`
			:	fails
		return `${compileRead("data", k)} ? ${readable} : ${this.unreadableFails(node, k)}`
	}

	// as an indiscriminable union applies its branches, in a branch only
	// arktype's traversal has, which a root holding a morph, alias or callback
	// reports into
	override defaultFails(node: UnionNode, caseNode: BaseRoot): string {
		const passes =
			isDecidedByKeywords(caseNode) ?
				(caseNode.compileCondition?.(this, "data") ??
				this.invoke(caseNode, { kind: "Allows" }))
			:	`(ctx.pushBranch(), ${this.applyMember(caseNode)}, ctx.popBranch().errorCount === 0)`
		return `${passes} || ${this.unionFails(node)}`
	}

	// data its first key can't be read from fails each branch at its basis,
	// if each requires what the read does
	private unreadableFails(node: UnionNode, k: PropertyKey): string {
		const bases = basesOf(node)
		return (
				bases?.nodes.every(basis =>
					typeof k === "number" ?
						basis.hasKind("proto") && basis.proto === Array
					:	basis.domain === "object"
				)
			) ?
				`!${this.fails("failsAt", `${this.siteRef(bases.site)}, data`)}`
			:	this.unionFails(node)
	}

	override undeclaredFails(node: StructureNode): string {
		// expected "removed", so it says "must be removed" as arktype does
		const site = issueSite(
			issueContextOf({
				code: "undeclared",
				description: "removed",
				meta: node.meta
			})
		)
		return this.fails("failsAt", `${this.siteRef(site)}, data, k`)
	}

	// a rejected union value reports the union's issue at its key, not its Apply
	override failingSiteOf(prop: BaseNode): string | undefined {
		const { value, errorContext } = prop as nodeOfKind<"required">
		if (reportsItself(value) && !basesOf(value))
			return this.siteRef(unionKeySiteOf(value.failureSite, errorContext))
	}

	// unless data failing its branches' bases is described by them
	override failingApplyOf(value: BaseNode): string | undefined {
		if (reportsItself(value) && basesOf(value))
			return `(data, ctx) => ${this.unionFails(value)}`
	}
}

// whether Allows decides a node, as it does one whose predicates are all
// keywords, which add no issues of their own
const isDecidedByKeywords = (node: BaseNode): boolean =>
	!node.includesMorph &&
	!node.includesAlias &&
	!node.allowsNeedsCtx &&
	Object.values(node.refsById).every(
		reference =>
			!reference.hasKind("predicate") || isKeyword(reference.predicate)
	)

const reportsItself = (value: BaseNode): value is UnionNode =>
	value.hasKind("union") && !value.discriminant && !value.includesAlias

// whether a key is read from an object, or an index from an array, as
// arktype reads a discriminant
const compileRead = (parent: string, k: PropertyKey): string =>
	typeof k === "number" ?
		`Array.isArray(${parent})`
	:	`Object(${parent}) === ${parent}`

export interface Bases {
	nodes: nodeOfKind<"domain" | "proto">[]
	// what arktype's union of their errors expects
	site: object
}

const basesByUnion = new WeakMap<UnionNode, Bases | null>()

// the basis each branch checks first, where data failing them all fails
// each branch there, so arktype describes the union by them
export const basesOf = (node: UnionNode): Bases | undefined => {
	let bases = basesByUnion.get(node)
	if (bases === undefined) basesByUnion.set(node, (bases = findBases(node)))
	return bases ?? undefined
}

const findBases = (node: UnionNode): Bases | null => {
	// a description written for it is its text
	if (node.meta.description !== undefined && node.meta.keyword === undefined)
		return null
	const nodes: nodeOfKind<"domain" | "proto">[] = []
	const expected: string[] = []
	for (const branch of node.branches) {
		const checked = branch.hasKind("morph") ? branch.head : branch
		const basis =
			checked?.hasKind("intersection") ? checked.basis
			: checked?.hasKind("domain") || checked?.hasKind("proto") ? checked
			: null
		if (!basis) return null
		const context = issueContextOf((basis.failureSite as { v: TextContext }).v)
		// an expected written from data can't be known here
		if (context.written && context.written.keeps & 1) return null
		if (!nodes.includes(basis)) nodes.push(basis)
		if (!expected.includes(context.description!))
			expected.push(context.description!)
	}
	const site = issueSiteOf({
		meta: node.meta,
		description: describeBranches(expected)
	}) as IssueContext
	const unionSite = issueSiteOf(node.failureSite) as IssueContext
	return site.description === unionSite.description ? null : { nodes, site }
}

export const refNameOf = (unit: string, i: number): string => `${unit}R${i}`

class InPlaceCompiler extends StandaloneCompiler {
	override readonly inPlace = true
}

class FirstIssueCompiler extends StandaloneCompiler {
	override readonly reportsFirst = true
}

class InPlaceFirstIssueCompiler extends InPlaceCompiler {
	override readonly reportsFirst = true
}

const unifiedByNode = new WeakMap<BaseNode, boolean>()

// whether a node's Apply reads ctx only to report, so called without one it's its Allows
export const unifies = (node: BaseNode): boolean => {
	let unified = unifiedByNode.get(node)
	if (unified === undefined) {
		unified =
			!node.hasTransform &&
			!node.includesAlias &&
			!node.allowsNeedsCtx &&
			!node.selectReferences(reportsApart).length
		unifiedByNode.set(node, unified)
	}
	return unified
}

// a reference whose Apply reports other than its Allows decides
const reportsApart = (reference: BaseNode): boolean =>
	reference.hasKind("predicate") ? !isKeyword(reference.predicate)
	: reference.hasKind("union") ?
		!reference.discriminant && !isDecidedByAllows(reference)
	: reference.hasKind("intersection") ?
		// Apply counts issues between its structure and predicates
		(reference.inner.predicate?.length ?? 0) + +!!reference.structure >= 2
	:	reference.hasKind("morph")

// a detailed size build's traversals: a node that unifies has one, its
// Apply named as its Allows, reporting a failure only to a ctx it's passed
class UnifiedCompiler extends StandaloneCompiler {
	override referenceToId(id: NodeId, opts?: ReferenceOptions): string {
		const node = this.linkage.refsById[id]
		return super.referenceToId(
			id,
			(
				node &&
					(opts?.kind ?? this.traversalKind) === "Apply" &&
					this.unifies(node)
			) ?
				{ ...opts, kind: "Allows" }
			:	opts
		)
	}

	override requiresContextFor(
		node: BaseNode,
		kind: TraversalKind = this.traversalKind
	): boolean {
		return (
			(kind !== "Allows" || !this.unifies(node)) &&
			super.requiresContextFor(node, kind)
		)
	}

	// a key's union value is applied by its own traversal, which allows unpassed
	override failingSiteOf(): undefined {}
	override failingApplyOf(): undefined {}

	// read where it fails, as a site is, so a unit needn't receive it
	override fails(method: "failsAt" | "failsIn", args: string): string {
		return `runtime.${method}(ctx, ${args})`
	}
}

// by the members a unit was written with, which passes reaching it share
const unifiedMembers = new WeakMap<RootUnit["members"], RootUnit["members"]>()

// a unified node's Apply, declared after its Allows, replaces it
const unifyMembers = (unit: RootUnit): void => {
	const written = unit.members
	let members = unifiedMembers.get(written)
	if (!members) {
		const sourcesByName = new Map(written)
		members = [...sourcesByName]
		for (const [i, node] of unit.declared.entries()) {
			const source = sourcesByName.get(unit.declaredTraversals[i][0])!
			if (unifies(node) && /(?<![\w$.])ctx\./.test(withoutStrings(source)))
				throwInternalError(`Unified traversal reads ctx: ${source}`)
		}
		unifiedMembers.set(written, members)
	}
	unit.members = members
}

const issues = new FirstIssues()

const unitsReportingIssues = new WeakSet<RootUnit>()

const ctxReads = /(?<![\w$.])ctx\.([\w$]+)/g

// a root reporting into ArkErrors reads only their members off ctx, since
// one only arktype's traversal has would throw where data first fails
export const assertReportsIssues = (units: readonly RootUnit[]): void => {
	for (const unit of units) {
		if (unitsReportingIssues.has(unit)) continue
		for (const [name, source] of unit.members) {
			for (const [, member] of withoutStrings(source).matchAll(ctxReads)) {
				if (member in issues) continue
				throwInternalError(`${name} reads ctx.${member}, which ArkErrors lack`)
			}
		}
		unitsReportingIssues.add(unit)
	}
}

class UnifiedFirstIssueCompiler extends UnifiedCompiler {
	override readonly reportsFirst = true
}

// what each case of a switch over data's domain stands for
const domainChecks = new Map<string, string>([
	...["bigint", "boolean", "number", "string", "symbol", "undefined"].map(
		(domain): [string, string] => [
			`case "${domain}"`,
			`typeof data === "${domain}"`
		]
	),
	['case "null"', "data === null"],
	[
		'case "object"',
		'(typeof data === "object" ? data !== null : typeof data === "function")'
	]
])

// a build for size writes Allows' checks as the returns they stand for, and a
// switch over data's domain as the checks its cases do
const forSize = (compiler: typeof StandaloneCompiler) =>
	class extends compiler {
		override readonly shortest: boolean = !this.naming
		// a literal of the values a copy holds is shorter than one of nulls
		override readonly copiesValues: boolean = this.shortest

		override switch(
			on: string,
			cases: readonly SwitchCase[],
			otherwise: string
		): this {
			if (
				!this.shortest ||
				on !==
					compileDomainOf(
						"data",
						cases.map(([label]) => label)
					) ||
				cases.some(([label]) => !domainChecks.has(label))
			)
				return super.switch(on, cases, otherwise)
			let checks = ""
			let matched: string[] = []
			for (const [i, [label, returned]] of cases.entries()) {
				matched.push(domainChecks.get(label)!)
				// a case returning what the next one does is checked with it
				if (cases[i + 1]?.[1] === returned) continue
				checks += `${matched.join(" || ")} ? ${returned} : `
				matched = []
			}
			return this.return(`${checks}${otherwise}`)
		}
	}

// a detailed size build writes each node it can as a checker, whose Apply
// is its Allows, transforming by its t
class CombinatorCompiler extends forSize(UnifiedCompiler) {
	readonly shapes: boolean = false

	override unifies(node: BaseNode): boolean {
		return combines(node) || unifies(node)
	}

	override declareTraversals(node: BaseNode): string[] | undefined {
		const source = writeCombinator(this, node)
		if (source === undefined) return
		const allows = this.referenceToId(node.id, { kind: "Allows" })
		this.linkage.members.push([allows, source])
		if (!node.transforms) return [allows, allows]
		const transform = this.referenceToId(node.id, { kind: "Transform" })
		this.linkage.members.push([
			transform,
			`/* @__PURE__ */ runtime.transformOf(${allows})`
		])
		return [allows, allows, transform]
	}
}

// by variant: standalone, in place or unified, plus 3 for errors "first" and
// 6 for size
const compilers = [false, true].flatMap(shortest =>
	[
		StandaloneCompiler,
		InPlaceCompiler,
		UnifiedCompiler,
		FirstIssueCompiler,
		InPlaceFirstIssueCompiler,
		UnifiedFirstIssueCompiler
	].map(compiler =>
		shortest && compiler === UnifiedCompiler ? CombinatorCompiler
		: shortest ? forSize(compiler)
		: compiler
	)
)

// a size build with detailed errors that compiles each node, as a program
// too small to amortize the checkers' runtime is
export const compiledForSize: number =
	compilers.push(forSize(UnifiedCompiler)) - 1

// a size build writing checkers that writes common intersections as shapes
export const shapedForSize: number =
	compilers.push(
		class extends CombinatorCompiler {
			override readonly shapes: boolean = true
		}
	) - 1

// a jsonInput build's compilers follow the others in the same order, each
// trusting data to be plain, as JSON.parse returns
const jsonOffset = compilers.length

compilers.push(
	...compilers.map(
		compiler =>
			class extends compiler {
				override readonly jsonInput: boolean = true
			}
	)
)

export const jsonVariantOf = (variant: number): number => variant + jsonOffset

// the variant a jsonInput build's variant otherwise matches
const baseVariantOf = (variant: number) => variant % jsonOffset

// each variant's roots have their own units
const unitsByRoot = compilers.map(() => new WeakMap<BaseRoot, RootUnit[]>())

export const rootUnitsOf = (root: BaseRoot, variant = 0): RootUnit[] => {
	const cached = unitsByRoot[variant]
	let units = cached.get(root)
	if (!units) {
		cached.set(
			root,
			(units = precompileRootUnits(root, {
				compiler: compilers[variant],
				keyOf: runtimeKeyOf
			}))
		)
		const base = baseVariantOf(variant)
		if (base % 3 === 2 || base >= compiledForSize)
			for (const unit of units) unifyMembers(unit)
	}
	return units
}

// whether a root's validator is created from its checker
export const isChecker = (root: BaseRoot, variant: number): boolean =>
	(compilers[baseVariantOf(variant)] === CombinatorCompiler ||
		baseVariantOf(variant) === shapedForSize) &&
	combines(root)

// a pass can reach content-equal roots, which share a name but not a unit
export const unitOf = (node: BaseNode, reader: RootUnit): RootUnit =>
	reader.unitsById[node.id]
