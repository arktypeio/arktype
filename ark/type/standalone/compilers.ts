import {
	compileDefault,
	isDecidedByAllows,
	precompileRootUnits,
	TraversalCompiler,
	type BaseNode,
	type BaseRoot,
	type CheckOptions,
	type NodeId,
	type Predicate,
	type ReferenceOptions,
	type RootUnit,
	type StructureNode,
	type SwitchCase,
	type TraversalKind,
	type UnionNode
} from "@ark/schema"
import { hashOf, throwInternalError } from "@ark/util"
import { runtimeKeyOf } from "../standalone.ts"
import {
	isDescribed,
	isInlineSite,
	isKeyword,
	issueContextOf,
	issueSite,
	issueSiteOf,
	undeclaredSite,
	withoutStrings,
	writeSiteOf
} from "./sites.ts"

// a value holding no object, pattern, alias, predicate or morph, whose
// Allows is a few checks
const isLeaf = (node: BaseNode): boolean =>
	isDecidedByAllows(node) &&
	!node.includesCostly &&
	!node.includesAlias &&
	!Object.values(node.referencesById).some(ref => ref.hasKind("structure"))

class StandaloneCompiler extends TraversalCompiler {
	override readonly reportsFirst: boolean = false
	// a unit is named for its content as compiled without the gates that
	// follow from it
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
				structure.compileCopiedDeclaredKeys(this, keys)
				return this.return("out")
			}
		)
	}

	// read at the discriminant so branches don't rerun
	override unionFails(
		node: UnionNode,
		value?: string,
		path?: PropertyKey[]
	): string {
		if (!path) return `!${this.error(node)}`
		const context = issueContextOf({
			code: "discriminant",
			description: node.discriminantDescription,
			meta: node.discriminantMeta
		})
		const site = issueSite(path.length ? { value: context, path } : context)
		return `!${this.fails("failsAt", `${this.siteRef(site)}, ${value}`)}`
	}

	override undeclaredFails(node: StructureNode): string {
		const context = issueContextOf({ code: "undeclared", meta: node.meta })
		const site = isDescribed(context) ? undeclaredSite : issueSite(context)
		return this.fails("failsAt", `${this.siteRef(site)}, data, k`)
	}

	// a rejected union value reports the union's issue, not its Apply
	override failingApplyOf(value: BaseNode): string | undefined {
		if (
			!value.hasKind("union") ||
			value.compiledDiscriminant ||
			value.includesAlias
		)
			return
		const site = issueSiteOf(value.failureSite)
		let failing = failingBySite.get(site)
		if (!failing)
			failingBySite.set(site, (failing = issueSite({ fails: site })))
		return this.ref(failing)
	}
}

const failingBySite = new WeakMap<object, object>()

export const refNameOf = (unit: string, i: number): string => `${unit}R${i}`

// size writes the checks an Allows loops over as the returns they stand for,
// line by line, as a literal can hold a line separator
export const unlooped = (source: string): string =>
	source.replace(
		/ {4}for \(;;\) {\n([\S\s]*)\n {8}return true\n {4}}\n {4}return false\n }$/,
		(_, checks: string) =>
			`${checks
				.split("\n")
				.map(line =>
					line.replace(/^ {4}/, "").replace(/^( +)break$/, "$1return false")
				)
				.join("\n")}\n    return true\n }`
	)

// size writes a switch over data's domain as the checks each case stands for
export const undispatched = (source: string): string =>
	source.replace(
		/( +)switch\(typeof data === "object" \? data === null \? "null" : "object" : typeof data === "function" \? "object" : typeof data\) {\n((?: +case "\w+":(?: return .+)?\n)+) +}\n +return (.+)$/m,
		(_, indent: string, cases: string, otherwise: string) => {
			let checks = ""
			let matched: string[] = []
			for (const [, domain, returned] of cases.matchAll(
				/case "(\w+)":(?: return (.+))?/g
			)) {
				matched.push(
					domain === "null" ? "data === null"
					: domain === "object" ?
						'(typeof data === "object" ? data !== null : typeof data === "function")'
					:	`typeof data === "${domain}"`
				)
				if (returned === undefined) continue
				checks += `${matched.join(" || ")} ? ${returned} : `
				matched = []
			}
			return `${indent}return ${checks}${otherwise}`
		}
	)

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

// a node whose Apply reads ctx only to report, so passed none, it allows
const unifies = (node: BaseNode): boolean => {
	let unified = unifiedByNode.get(node)
	if (unified === undefined) {
		unified =
			!node.includesTransform &&
			!node.includesAlias &&
			!node.allowsRequiresContext &&
			Object.values(node.referencesById).every(reference =>
				reference.hasKind("predicate") ? isKeyword(reference.predicate)
				: reference.hasKind("union") ?
					!!reference.compiledDiscriminant || isDecidedByAllows(reference)
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
		const node = this.linkage.referencesById[id]
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

// a structure's Allows passes a plain object with as many own enumerable keys
// as the declared ones it holds, though one may stand in for a declared key it
// holds otherwise, and scans the keys of any other in a function of its own
const countingKeys = (compiler: typeof StandaloneCompiler) =>
	class extends compiler {
		// what the structure checks before scanning its keys
		private required = 0
		private optional: string[] = []
		private checksSequence = false
		// the scan's lines, written into its function instead
		private scan: string[] | undefined

		override check(node: BaseNode, opts?: CheckOptions): this {
			if (node.hasKind("sequence")) this.checksSequence = true
			else if (node.hasKind("required") && typeof node.key === "string")
				this.required++
			else if (node.hasKind("optional") && typeof node.key === "string")
				this.optional.push(`+(${this.serialize(node.key)} in data)`)
			return super.check(node, opts)
		}

		override line(statement: string): this {
			if (!this.scan) return super.line(statement)
			this.scan.push(`${" ".repeat(this.indentation)}${statement}\n`)
			return this
		}

		override forIn(object: string, body: (self: this) => this): this {
			if (this.traversalKind !== "Allows" || this.checksSequence)
				return super.forIn(object, body)
			this.if("Object.getPrototypeOf(data) === Object.prototype", () =>
				this.let("n", 0)
					.loop(`for (const k in ${object})`, () =>
						this.if("Object.prototype.hasOwnProperty.call(data, k)", () =>
							this.line("n++")
						)
					)
					.if(`n === ${[this.required, ...this.optional].join(" + ")}`, () =>
						this.return(true)
					)
			)
			const scan: string[] = (this.scan = [])
			super.forIn(object, body)
			this.scan = undefined
			const source = `function(data, ctx) { ${scan.join("")}    return true\n }`
			const name = `undeclared${hashOf(source)}`
			if (!this.linkage.members.some(([written]) => written === name))
				this.linkage.members.push([name, source])
			return this.if(`!${name}(data, ctx)`, () => this.return(false))
		}
	}

// by variant: standalone, in place or unified, plus 3 for errors "first" and
// 6 for countsKeys
const compilers = [false, true].flatMap(countsKeys =>
	[
		StandaloneCompiler,
		InPlaceCompiler,
		UnifiedCompiler,
		FirstIssueCompiler,
		InPlaceFirstIssueCompiler,
		UnifiedFirstIssueCompiler
	].map(compiler => (countsKeys ? countingKeys(compiler) : compiler))
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
