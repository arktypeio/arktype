import {
	compileDefault,
	compileDomainOf,
	describeBranches,
	isDecidedByAllows,
	precompileRootUnits,
	TraversalCompiler,
	type BaseNode,
	type BaseRoot,
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
import { runtimeKeyOf } from "../standalone.ts"
import {
	isInlineSite,
	isKeyword,
	issueContextOf,
	issueSite,
	issueSiteOf,
	withoutStrings,
	writeSiteOf,
	type IssueContext,
	type TextContext
} from "./sites.ts"

// a value holding no object, pattern, alias, predicate or morph, whose
// Allows is a few checks
const isLeaf = (node: BaseNode): boolean =>
	isDecidedByAllows(node) &&
	!node.includesCostly &&
	!node.includesAlias &&
	!Object.values(node.refsById).some(ref => ref.hasKind("structure"))

class StandaloneCompiler extends TraversalCompiler {
	override readonly reportsFirst: boolean = false
	// a unit is named for its content as compiled without the gates and size
	// forms that follow from it
	readonly naming: boolean = this.linkage.unit === undefined

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

	// a site of literals is built where it fails, and stays a ref the unit keys
	siteRef(site: object): string {
		const ref = this.ref(site)
		return isInlineSite(site) ? writeSiteOf(site, JSON.stringify) : ref
	}

	// a leaf its Allows passes skips the path bookkeeping of applying it
	override gate(value: BaseNode, arg: string): string | undefined {
		if (!this.naming && isLeaf(value))
			return `${this.traversal(value, "Allows")}(${arg})`
	}

	// a keyword check adds no issues itself, so its Apply needn't count them
	override addsNoIssues(predicate: Predicate): boolean {
		return isKeyword(predicate)
	}

	// a case returning what the next one does falls through to it
	override switch(
		on: string,
		cases: readonly SwitchCase[],
		otherwise: string
	): this {
		return this.block(`switch(${on})`, () => {
			for (const [i, [label, returned]] of cases.entries()) {
				const next = cases[i + 1]
				const fallsThrough =
					label !== "default" &&
					next?.[0] !== "default" &&
					next?.[1] === returned
				this.line(fallsThrough ? `${label}:` : `${label}: return ${returned}`)
			}
			return this
		}).return(otherwise)
	}

	// a plain object missing every default, its only changes, is copied once
	override initializeTransform(
		transformedChildren: readonly BaseNode[],
		structure?: StructureNode
	): this {
		super.initializeTransform(transformedChildren)
		if (
			!structure ||
			transformedChildren.length < 2 ||
			transformedChildren.length !== structure.defaultable.length ||
			structure.includesMorph ||
			structure.undeclared === "delete" ||
			this.inPlace
		)
			return this
		const keys = structure.defaultable.map(prop => prop.key)
		return this.if(
			`${keys.map(k => `!(${this.serialize(k)} in data) && `).join("")}${structure.compileShapeCheck(this)}Object.getPrototypeOf(data) === Object.prototype`,
			() => {
				this.const("out", "{ ...data }")
				for (const prop of structure.defaultable)
					compileDefault(this, prop, "out")
				structure.compileDeclaredCopy(this, keys)
				return this.return("out")
			}
		)
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
	override missFails(node: UnionNode, value: string): string {
		if (node.missListsBranches) return this.unionFails(node)
		const path = node.missPath
		const context = issueContextOf({
			code: "discriminant",
			description: node.discriminantDescription,
			meta: node.discriminantMeta
		})
		const site = issueSite(path.length ? { value: context, path } : context)
		const fails = `!${this.fails("failsAt", `${this.siteRef(site)}, ${path.length ? value : "data"}`)}`
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

	// as an indiscriminable union applies its branches
	override defaultFails(node: UnionNode, caseNode: BaseRoot): string {
		const passes =
			!caseNode.includesAlias && isDecidedByAllows(caseNode) ?
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

	// a rejected union value reports the union's issue, not its Apply
	override failingApplyOf(value: BaseNode): string | undefined {
		if (!value.hasKind("union") || value.discriminantJit || value.includesAlias)
			return
		if (basesOf(value)) return `(data, ctx) => ${this.unionFails(value)}`
		const site = issueSiteOf(value.failureSite)
		let failing = failingBySite.get(site)
		if (!failing)
			failingBySite.set(site, (failing = issueSite({ fails: site })))
		return this.ref(failing)
	}
}

const failingBySite = new WeakMap<object, object>()

// whether a key is read from an object, or an index from an array, as
// arktype reads a discriminant
const compileRead = (parent: string, k: PropertyKey): string =>
	typeof k === "number" ?
		`Array.isArray(${parent})`
	:	`Object(${parent}) === ${parent}`

interface Bases {
	nodes: nodeOfKind<"domain" | "proto">[]
	// what arktype's union of their errors expects
	site: object
}

const basesByUnion = new WeakMap<UnionNode, Bases | null>()

// the basis each branch checks first, where data failing them all fails
// each branch there, so arktype describes the union by them
const basesOf = (node: UnionNode): Bases | undefined => {
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
		const checked = branch.hasKind("morph") ? branch.knownIn : branch
		const basis =
			checked?.hasKind("intersection") ? checked.basis
			: checked?.hasKind("domain") || checked?.hasKind("proto") ? checked
			: null
		if (!basis) return null
		const context = issueContextOf(
			(basis.failureSite as { value: TextContext }).value
		)
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
const unifies = (node: BaseNode): boolean => {
	let unified = unifiedByNode.get(node)
	if (unified === undefined) {
		unified =
			!node.hasTransform &&
			!node.includesAlias &&
			!node.allowsNeedsCtx &&
			Object.values(node.refsById).every(reference =>
				reference.hasKind("predicate") ? isKeyword(reference.predicate)
				: reference.hasKind("union") ?
					!!reference.discriminantJit || isDecidedByAllows(reference)
				: reference.hasKind("intersection") ?
					// Apply counts issues between its structure and predicates
					(reference.inner.predicate?.length ?? 0) + +!!reference.structure < 2
				:	!reference.hasKind("morph")
			)
		unifiedByNode.set(node, unified)
	}
	return unified
}

// a detailed size build's traversals: a node that unifies has one, its
// Apply named as its Allows, reporting a failure only to a ctx it's passed
class UnifiedCompiler extends StandaloneCompiler {
	override referenceToId(id: NodeId, opts?: ReferenceOptions): string {
		const node = this.linkage.refsById[id]
		return super.referenceToId(
			id,
			node && unifies(node) ? { ...opts, kind: "Allows" } : opts
		)
	}

	override requiresContextFor(
		node: BaseNode,
		kind: TraversalKind = this.traversalKind
	): boolean {
		return (
			(kind !== "Allows" || !unifies(node)) &&
			super.requiresContextFor(node, kind)
		)
	}

	// a key's union value is applied by its own traversal, which allows unpassed
	override failingApplyOf(): undefined {}

	// unpassed a ctx, failsIn allows a value itself
	override gate(): undefined {}

	// read where it fails, as a site is, so a unit needn't receive it
	override fails(method: "failsAt" | "failsIn", args: string): string {
		return `runtime.${method}(ctx, ${args})`
	}
}

// a unified node's Apply, declared after its Allows, replaces it
const unifyMembers = (unit: RootUnit): void => {
	const sourcesByName = new Map(unit.members)
	unit.members = [...sourcesByName]
	for (const [i, node] of unit.declared.entries()) {
		const source = sourcesByName.get(unit.declaredTraversals[i][0])!
		if (unifies(node) && /(?<![\w$.])ctx\./.test(withoutStrings(source)))
			throwInternalError(`Unified traversal reads ctx: ${source}`)
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

const dataDomain = compileDomainOf("data")

// a build for size writes Allows' checks as the returns they stand for, and a
// switch over data's domain as the checks its cases do
const forSize = (compiler: typeof StandaloneCompiler) =>
	class extends compiler {
		override readonly shortest: boolean = !this.naming

		override switch(
			on: string,
			cases: readonly SwitchCase[],
			otherwise: string
		): this {
			if (
				!this.shortest ||
				on !== dataDomain ||
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
	].map(compiler => (shortest ? forSize(compiler) : compiler))
)

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
		if (variant % 3 === 2) for (const unit of units) unifyMembers(unit)
	}
	return units
}

// a pass can reach content-equal roots, which share a name but not a unit
export const unitOf = (node: BaseNode, reader: RootUnit): RootUnit =>
	reader.unitsById[node.id]
