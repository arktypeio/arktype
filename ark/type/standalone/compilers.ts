import {
	compileDomainOf,
	describeBranches,
	describeCases,
	isDecidedByAllows,
	precompileRootUnits,
	TraversalCompiler,
	type BaseNode,
	type BaseRoot,
	type DiscriminantCases,
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
import { combines, writeCombinator } from "./combinators.ts"
import {
	isDescribed,
	isInlineSite,
	isKeyword,
	raisesNothing,
	issueContextOf,
	issueSite,
	issueSiteOf,
	missingDescriptionOf,
	unionKeySiteOf,
	withoutStrings,
	writeSiteOf,
	type IssueContext,
	type TextContext
} from "./sites.ts"
import { runtimeKeyOf } from "./values.ts"

class StandaloneCompiler extends TraversalCompiler {
	override readonly reportsFirst: boolean = false
	// named for its content as compiled, before the size forms that follow from it
	readonly naming: boolean = this.link.unit === undefined

	unifies(node: BaseNode): boolean {
		return unifies(node)
	}

	// terser and swc inline a function called once as a closure per call, slowing its caller
	override inv(node: BaseNode, opts?: InvokeOptions): string {
		const call = super.inv(node, opts)
		return (
				this.shortest ||
					this.naming ||
					(opts?.kind ?? this.trav) === "Apply" ||
					!/^[\w$]+\(/.test(call)
			) ?
				call
			:	`/* @__NOINLINE__ */ ${call}`
	}

	// named for its unit, so units can share a scope
	override ref(value: object | symbol): string {
		const { unit } = this.link
		if (unit === undefined) return super.ref(value)
		let name = this.refs!.get(value)
		if (name === undefined)
			this.refs!.set(value, (name = refNameOf(unit, this.refs!.size)))
		return name
	}

	override site(node: BaseNode): string {
		return this.siteRef(issueSiteOf(node.failSite))
	}

	// a site of literals, or a key's, is built where it fails and stays a ref the unit keys
	siteRef(site: object): string {
		const ref = this.ref(site)
		if (isInlineSite(site)) return writeSiteOf(site, JSON.stringify)
		const { v: value } = site as { v?: object }
		const missing = missingDescriptionOf(site)
		if (missing === undefined) return ref
		if (!value) return `runtime.requiredSiteOf(${JSON.stringify(missing)})`
		return isInlineSite(value) && isDescribed(value) ?
				writeSiteOf(value, JSON.stringify, "keySiteOf", missing)
			:	ref
	}

	// a keyword check adds no issues itself, so its Apply needn't count them
	override addsNoIssues(predicate: Predicate): boolean {
		return raisesNothing(predicate)
	}

	// a union no branch allows reports what each branch's first issue expected,
	// unless it can only be what its description lists
	override unionFails(node: UnionNode): string {
		if (expectsItsBases(node)) return `!${this.error(node)}`
		return this.branchesFail(
			node,
			node.branches.map(branch => this.traversal(branch, "Apply"))
		)
	}

	private branchesFail(node: UnionNode, branches: string[]): string {
		return `!runtime.failsBranches(ctx, [${branches.join(", ")}], data${this.ownIssueOf(node)})`
	}

	override listedFails(node: UnionNode): string {
		return `!runtime.failsListed(ctx, errors, data${this.ownIssueOf(node)})`
	}

	private ownIssueOf(node: UnionNode): string {
		return `, ${listsBranches(node) ? listedIssueOf(node) : `runtime.ownIssue(${this.site(node)})`}`
	}

	// reported at the discriminant so branches don't rerun, unless data can't be read there
	override missFails(node: UnionNode): string {
		return node.missLists ?
				this.unionFails(node)
			:	this.ifReadable(node, this.missedFails(node))
	}

	private missedFails(node: UnionNode): string {
		const path = node.missPath
		const site = this.siteRef(issueSite(discriminantContextOf(node)))
		// a key below data is read as a key site reads it
		return path.length > 1 ?
				`!${this.ref(failsAtPath)}(ctx, ${site}, data, [${path.map(k => this.serialize(k)).join(", ")}])`
			:	`!${this.fails("failsAt", path.length ? `${site}, data, ${this.serialize(path[0])}` : `${site}, data`)}`
	}

	private ifReadable(
		node: UnionNode,
		fails: string,
		unreadable = (fails: string) => fails
	): string {
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
				`${reads.join(" && ")} ? ${fails} : ${unreadable(this.unionFails(node))}`
			:	fails
		return `${compileRead("data", k)} ? ${readable} : ${unreadable(this.unreadableFails(node))}`
	}

	// data in no case is applied the default case, whose first issue is listed
	// beside the miss, unless the data can't be read there, where each branch is
	override defaultFails(node: UnionNode, caseNode: BaseRoot): string {
		const isDecided = isDecidedByKeywords(caseNode)
		const passes =
			isDecided ?
				(caseNode.jsCond?.(this, "data") ??
				this.inv(caseNode, { kind: "Allows" }))
			:	`(ctx.pushBr(), ${this.applyMember(caseNode)}, ctx.popBr().errN === 0)`
		if (node.missLists) return `${passes} || ${this.unionFails(node)}`
		const listed = this.branchesFail(node, [
			`(data, ctx) => ${this.missedFails(node)}`,
			isDecided ?
				this.traversal(caseNode, "Apply")
			:	`(data, ctx) => ${this.applyMember(caseNode)}`
		])
		return this.ifReadable(
			node,
			isDecided ? `${passes} || ${listed}` : listed,
			fails => `${passes} || ${fails}`
		)
	}

	// data its first key can't be read from fails each branch at its basis
	private unreadableFails(node: UnionNode): string {
		const [k] = node.discriminant!.path
		const bases = basesOf(node)
		return (
				bases?.nodes.every(basis =>
					typeof k === "number" ?
						basis.is("proto") && basis.proto === Array
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
		const { value, errorCtx } = prop as nodeOfKind<"required">
		if (reportsItself(value) && expectsItsBases(value))
			return this.siteRef(unionKeySiteOf(value.failSite, errorCtx))
	}

	// unless its issue reads its branches'
	override failingApplyOf(value: BaseNode): string | undefined {
		if (reportsItself(value) && !expectsItsBases(value))
			return `(data, ctx) => ${this.unionFails(value)}`
	}
}

// a node whose predicates are all keywords, which add no issues, is decided by Allows
const isDecidedByKeywords = (node: BaseNode): boolean =>
	!node.hasMorph &&
	!node.hasAlias &&
	!node.allowsCtx &&
	Object.values(node.byId).every(
		reference => !reference.is("predicate") || isKeyword(reference.predicate)
	)

export const discriminantContextOf = (node: UnionNode): IssueContext =>
	issueContextOf({
		code: "discriminant",
		description: node.discDesc,
		meta: node.discMeta
	})

// arktype writes a union's text from its branches' first issues unless it's
// written its own
export const listsBranches = (node: UnionNode): boolean => {
	const { description, keyword } = node.meta
	const site = issueSiteOf(node.failSite) as IssueContext
	return (
		(description === undefined || keyword !== undefined) &&
		isDescribed(site) &&
		site.description === node.description
	)
}

// what lists a union's branches, as their issues can only read alike or may not.
// Each branch's own checks are its only failures, each described the same
export const listedIssueOf = (node: UnionNode): string => {
	const descriptions = new Set(
		node.branches.flatMap(branch =>
			branch.is("intersection") ?
				branch.children.map(child => {
					const site = issueSiteOf(child.failSite) as IssueContext
					return child.is("structure") || !child.jsCond || !isDescribed(site) ?
							undefined
						:	site.description
				})
			:	[undefined]
		)
	)
	return descriptions.size === 1 && !descriptions.has(undefined) ?
			"runtime.alikeIssue"
		:	"runtime.listedIssue"
}

// whether each branch fails only at its basis, as the union's description lists
const expectsItsBases = (node: UnionNode): boolean => {
	if (!listsBranches(node)) return false
	const expected: string[] = []
	for (const branch of node.branches) {
		if (!branch.is("domain") && !branch.is("proto") && !branch.is("unit"))
			return false
		const { v } = branch.failSite as { v: TextContext }
		expected.push(issueContextOf(v).description!)
	}
	return describeBranches(expected) === node.description
}

const reportsItself = (value: BaseNode): value is UnionNode =>
	value.is("union") && !value.discriminant && !value.hasAlias

// as arktype reads a discriminant
const compileRead = (parent: string, k: PropertyKey): string =>
	typeof k === "number" ?
		`Array.isArray(${parent})`
	:	`Object(${parent}) === ${parent}`

export interface Bases {
	nodes: nodeOfKind<"domain" | "proto" | "unit">[]
	// what arktype's union of their errors expects
	site: object
}

const basesByUnion = new WeakMap<UnionNode, Bases | null>()

// data failing every branch's basis fails each there, so arktype describes the union by them
export const basesOf = (node: UnionNode): Bases | undefined => {
	let bases = basesByUnion.get(node)
	if (bases === undefined) basesByUnion.set(node, (bases = findBases(node)))
	return bases ?? undefined
}

const findBases = (node: UnionNode): Bases | null => {
	// a description written for it is its text
	if (node.meta.description !== undefined && node.meta.keyword === undefined)
		return null
	const nodes: nodeOfKind<"domain" | "proto" | "unit">[] = []
	const expected: string[] = []
	const addExpected = (description: string) => {
		if (!expected.includes(description)) expected.push(description)
	}
	// each case of a discriminant, as a locale writes its miss
	const addCases = ({ discriminantKind, cases }: DiscriminantCases) => {
		for (const c of cases)
			addExpected(describeCases({ discriminantKind, cases: [c] } as never))
	}
	// as arktype's union error lists them: a morph input union's own bases, or each case
	const collect = (
		branch: BaseRoot,
		{ describes }: { describes: boolean }
	): boolean => {
		const checked = branch.is("morph") ? branch.head : branch
		// a described morph's input fails as the morph, by its description
		if (
			branch.is("morph") &&
			branch.meta.description !== undefined &&
			branch.meta.keyword === undefined
		) {
			if (!checked || !collect(checked, { describes: false })) return false
			if (describes) addExpected(branch.meta.description)
			return true
		}
		if (checked?.is("union")) {
			const { discriminant } = checked
			const lists =
				!discriminant || discriminant.path.length !== 0 || checked.missLists
			if (
				!checked.branches.every(b =>
					collect(b, { describes: describes && lists })
				)
			)
				return false
			if (describes && !lists) addCases(checked.discCases)
			return true
		}
		const basis =
			checked?.is("intersection") ? checked.basis
			: checked?.is("domain") || checked?.is("proto") || checked?.is("unit") ?
				checked
			:	null
		if (!basis) return false
		const context = issueContextOf((basis.failSite as { v: TextContext }).v)
		// an expected written from data can't be known here
		if (context.written && context.written.keeps & 1) return false
		if (!nodes.includes(basis)) nodes.push(basis)
		if (describes) addExpected(context.description!)
		return true
	}
	// data in no case is applied the default case, whose failure arktype reports beside the misses
	const { discriminant } = node
	const defaultCase =
		discriminant && discriminant.path.length === 0 && !node.missLists ?
			discriminant.cases.default
		:	undefined
	if (defaultCase) {
		addCases(node.discCases)
		if (!collect(defaultCase as BaseRoot, { describes: true })) return null
	}
	for (const branch of node.branches)
		if (!collect(branch, { describes: !defaultCase })) return null
	return {
		nodes,
		site: issueSiteOf({
			meta: node.meta,
			description: describeBranches(expected)
		})
	}
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
			!node.alters &&
			!node.hasAlias &&
			!node.allowsCtx &&
			!node.selectReferences(reportsApart).length
		unifiedByNode.set(node, unified)
	}
	return unified
}

// a reference whose Apply reports other than its Allows decides
const reportsApart = (reference: BaseNode): boolean =>
	reference.is("predicate") ? !raisesNothing(reference.predicate)
	: reference.is("union") ?
		!reference.discriminant && !isDecidedByAllows(reference)
	: reference.is("intersection") ?
		// Apply counts issues between its structure and predicates
		(reference.inner.predicate?.length ?? 0) + +!!reference.structure >= 2
	:	reference.is("morph")

// a detailed size build's traversals: a unifying node's Apply is its Allows,
// reporting only to a ctx
class UnifiedCompiler extends StandaloneCompiler {
	override refToId(id: NodeId, opts?: ReferenceOptions): string {
		const node = this.link.byId[id]
		return super.refToId(
			id,
			node && (opts?.kind ?? this.trav) === "Apply" && this.unifies(node) ?
				{ ...opts, kind: "Allows" }
			:	opts
		)
	}

	override needsCtxFor(
		node: BaseNode,
		kind: TraversalKind = this.trav
	): boolean {
		return (
			(kind !== "Allows" || !this.unifies(node)) &&
			super.needsCtxFor(node, kind)
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

// a root reporting into ArkErrors reads only their members off ctx; others would throw
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

// writes Allows' checks as the returns they stand for, and a domain switch as its cases' checks
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

// a detailed size build writes each node it can as a checker, whose Apply is its Allows
class CombinatorCompiler extends forSize(UnifiedCompiler) {
	readonly shapes: boolean = false

	override unifies(node: BaseNode): boolean {
		return (combines(node) && !node.allowsCtx) || unifies(node)
	}

	override declareTraversals(node: BaseNode): string[] | undefined {
		const source = writeCombinator(this, node)
		if (source === undefined) return
		const allows = this.refToId(node.id, { kind: "Allows" })
		const apply =
			node.allowsCtx ? this.refToId(node.id, { kind: "Apply" }) : allows
		this.link.members.push([apply, source])
		if (node.allowsCtx) {
			this.link.members.push([
				allows,
				`/* @__PURE__ */ runtime.allowsReadingCtx(${apply})`
			])
		}
		if (!node.tfs) return [allows, apply]
		const transform = this.refToId(node.id, { kind: "Transform" })
		this.link.members.push([
			transform,
			`/* @__PURE__ */ runtime.transformOf(${apply})`
		])
		return [allows, apply, transform]
	}
}

// by variant: standalone, in place or unified, +3 for errors "first", +6 for size
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

// a detailed size build compiling each node, as one too small to amortize checkers is
export const compiledForSize: number =
	compilers.push(forSize(UnifiedCompiler)) - 1

// a size build writing checkers that writes common intersections as shapes
export const shapedForSize: number =
	compilers.push(
		class extends CombinatorCompiler {
			override readonly shapes: boolean = true
		}
	) - 1

// jsonInput variants follow in the same order, each trusting data to be plain
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

type UnitKeyOf = typeof runtimeKeyOf

const unitsByKeyOf = new WeakMap<UnitKeyOf, WeakMap<BaseRoot, RootUnit[]>[]>()

// keyed by what names a value, as cells name their holes
const unitsByRootOf = (keyOf: UnitKeyOf) => {
	let units = unitsByKeyOf.get(keyOf)
	if (!units) {
		units = compilers.map(() => new WeakMap<BaseRoot, RootUnit[]>())
		unitsByKeyOf.set(keyOf, units)
	}
	return units
}

export const rootUnitsOf = (
	root: BaseRoot,
	variant = 0,
	keyOf: UnitKeyOf = runtimeKeyOf
): RootUnit[] => {
	const cached = unitsByRootOf(keyOf)[variant]
	let units = cached.get(root)
	if (!units) {
		cached.set(
			root,
			(units = precompileRootUnits(root, {
				compiler: compilers[variant],
				keyOf
			}))
		)
		const base = baseVariantOf(variant)
		if (base % 3 === 2 || base >= compiledForSize)
			for (const unit of units) unifyMembers(unit)
	}
	return units
}

export const isChecker = (root: BaseRoot, variant: number): boolean =>
	(compilers[baseVariantOf(variant)] === CombinatorCompiler ||
		baseVariantOf(variant) === shapedForSize) &&
	combines(root)

// a pass can reach content-equal roots, which share a name but not a unit
export const unitOf = (node: BaseNode, reader: RootUnit): RootUnit =>
	reader.unitsById[node.id]
