import {
	appendUnique,
	domainDescriptions,
	domainOf,
	flatMorph,
	hasDomain,
	isArray,
	jsTypeOfDescriptions,
	printable,
	registeredNameOf,
	serializePrimitive,
	throwParseError,
	unset,
	type JsTypeOf,
	type JsonStructure,
	type SerializablePrimitive,
	type SerializedPrimitive,
	type array,
	type show
} from "@ark/util"
import type { NodeSchema, RootSchema, nodeOfKind } from "../kinds.ts"
import type { BaseNode } from "../node.ts"
import {
	compileSerializedValue,
	returnsTransformErrors,
	type NodeCompiler
} from "../shared/compile.ts"
import type {
	BaseErrorContext,
	BaseNormalizedSchema,
	declareNode
} from "../shared/declare.ts"
import type { ArkError } from "../shared/errors.ts"
import {
	implementNode,
	type RootKind,
	type UnionChildKind,
	type nodeImplementationOf
} from "../shared/implement.ts"
import {
	$ark,
	reference,
	registeredReference,
	registryName,
	type RegisteredReference
} from "../shared/registry.ts"
import { missingSetEngineMessage } from "../shared/sets.ts"
import {
	applyMember,
	type Traversal,
	type TraverseAllows,
	type TraverseApply,
	type TraverseTransform
} from "../shared/traversal.ts"
import { hasArkKind } from "../shared/utils.ts"
import type { Domain } from "./domain.ts"
import type { Morph } from "./morph.ts"
import { BaseRoot } from "./root.ts"
import type { Unit } from "./unit.ts"

export declare namespace Union {
	export type ChildKind = UnionChildKind

	export type ChildSchema = NodeSchema<ChildKind>

	export type ChildNode = nodeOfKind<ChildKind>

	export type Schema = NormalizedSchema | readonly RootSchema[]

	export interface NormalizedSchema extends BaseNormalizedSchema {
		readonly branches: array<RootSchema>
		readonly ordered?: true
	}

	export interface Inner {
		readonly branches: readonly ChildNode[]
		readonly ordered?: true
	}

	export interface ErrorContext extends BaseErrorContext<"union"> {
		errors: readonly ArkError[]
	}

	export interface Declaration
		extends declareNode<{
			kind: "union"
			schema: Schema
			normalizedSchema: NormalizedSchema
			inner: Inner
			errorContext: ErrorContext
			reducibleTo: RootKind
			childKind: UnionChildKind
		}> {}

	export type Node = UnionNode
}

const implementation: nodeImplementationOf<Union.Declaration> =
	implementNode<Union.Declaration>({
		kind: "union",
		hasAssociatedError: true,
		collapsibleKey: "branches",
		keys: {
			ordered: {},
			branches: {
				child: true,
				parse: (schema, ctx) => {
					const branches: Union.ChildNode[] = []
					for (const branchSchema of schema) {
						const branchNodes =
							hasArkKind(branchSchema, "root") ?
								branchSchema.branches
							:	ctx.$.parseSchema(branchSchema).branches
						for (const node of branchNodes) {
							if (node.hasKind("morph")) {
								const matchingMorphIndex = branches.findIndex(
									matching =>
										matching.hasKind("morph") && matching.hasEqualMorphs(node)
								)
								if (matchingMorphIndex === -1) branches.push(node)
								else {
									const matchingMorph = branches[
										matchingMorphIndex
									] as Morph.Node
									const mergedIn =
										matchingMorph.inner.in && node.inner.in ?
											matchingMorph.inner.in.rawOr(node.inner.in)
										:	matchingMorph.rawIn.rawOr(node.rawIn)
									branches[matchingMorphIndex] = ctx.$.node("morph", {
										...matchingMorph.inner,
										in: mergedIn
									})
								}
							} else branches.push(node)
						}
					}

					if (!ctx.def.ordered) {
						// a set engine rejects overlapping branches that transform differently
						if (
							!$ark.sets &&
							branches.length > 1 &&
							branches.some(branch => branch.includesTransform)
						)
							throwParseError(missingSetEngineMessage)
						branches.sort((l, r) => (l.hash < r.hash ? -1 : 1))
					}

					return branches
				}
			}
		},
		normalize: schema => (isArray(schema) ? { branches: schema } : schema),
		defaults: {
			description: node =>
				node.distribute(branch => branch.description, describeBranches),
			expected: ctx => {
				const errorsAtPaths: ArkError[][] = []
				for (const error of ctx.errors) {
					const errorsAtPath = errorsAtPaths.find(
						errors => errors[0].propString === error.propString
					)
					if (errorsAtPath) errorsAtPath.push(error)
					else errorsAtPaths.push([error])
				}
				const pathDescriptions = errorsAtPaths.map(errors => {
					const path = errors[0].propString
					const branchesAtPath: string[] = []
					for (const errorAtPath of errors)
						appendUnique(branchesAtPath, errorAtPath.expected)

					const expected = describeBranches(branchesAtPath)
					// if there are multiple actual descriptions that differ,
					// just fall back to printable, which is the most specific
					const firstActual = errors[0].actual
					const actual =
						errors.every(e => e.actual === firstActual) ? firstActual : (
							printable(errors[0].data)
						)
					return `${path && `${path} `}must be ${expected}${
						actual && ` (was ${actual})`
					}`
				})
				return describeBranches(pathDescriptions)
			},
			problem: ctx => ctx.expected,
			message: ({ problem }) => {
				if (problem[0] === "[") {
					// clarify paths like [1], [0][1], and ["key!"] that could be confusing
					return `value at ${problem}`
				}

				return problem
			}
		}
	})

export class UnionNode extends BaseRoot<Union.Declaration> {
	isBoolean: boolean =
		this.branches.length === 2 &&
		this.branches[0].hasUnit(false) &&
		this.branches[1].hasUnit(true)

	get branchGroups(): BaseRoot[] {
		const branchGroups: BaseRoot[] = []
		let firstBooleanIndex = -1
		for (const branch of this.branches) {
			if (branch.hasKind("unit") && branch.domain === "boolean") {
				if (firstBooleanIndex === -1) {
					firstBooleanIndex = branchGroups.length
					branchGroups.push(branch)
				} else branchGroups[firstBooleanIndex] = $ark.intrinsic.boolean
				continue
			}
			branchGroups.push(branch)
		}

		return branchGroups as never
	}

	unitBranches = this.branches.filter((n): n is Unit.Node | Morph.Node =>
		n.rawIn.hasKind("unit")
	)

	// every case node discriminate creates, even for a discriminant it abandons
	readonly caseNodes: BaseRoot[] = []

	// discriminated on construction, since relating branches can throw a ParseError,
	// e.g. for an index signature and a prop with disjoint values
	discriminant = this.discriminate()
	discriminantJson =
		this.discriminant ? discriminantToJson(this.discriminant) : null

	expression: string = this.distribute(
		n => n.nestableExpression,
		expressBranches
	)

	discriminate(): Discriminant | null {
		this.caseNodes.length = 0
		// an alias branch is replaced by its resolution before the union is used
		if (this.includesShallowAlias) return null
		const discriminant = $ark.sets?.discriminate(this) ?? null
		if (this._referencesById) {
			for (const node of this.caseNodes)
				Object.assign(this._referencesById, node.referencesById)
		}
		return discriminant
	}

	protected override get referencedBesidesChildren(): readonly BaseNode[] {
		return this.caseNodes
	}

	// an indiscriminable union picks the branch it transforms by its Allows
	protected override get transformSelectsByContext(): boolean {
		const discriminant = this.compiledDiscriminant
		if (!discriminant) return true
		for (const k in discriminant.cases) {
			const caseNode = discriminant.cases[k]
			if (caseNode !== true && caseNode.transformRequiresContext) return true
		}
		return false
	}

	get shallowMorphs(): array<Morph> {
		return this.branches.reduce(
			(morphs, branch) => appendUnique(morphs, branch.shallowMorphs),
			[] as Morph[]
		)
	}

	get defaultShortDescription(): string {
		return this.distribute(
			branch => branch.defaultShortDescription,
			describeBranches
		)
	}

	traverseAllows: TraverseAllows = (data, ctx) => {
		const discriminant = this.compiledDiscriminant
		if (!discriminant) {
			return this.branches.some(b =>
				b.allowsRequiresTraversal ?
					(ctx as Traversal).allows(b, data)
				:	b.traverseAllows(data, ctx)
			)
		}
		const caseNode =
			discriminant.cases[
				caseKeyOf(discriminant, valueAtPath(discriminant.path, data))
			]
		return caseNode === true || !!caseNode?.traverseAllows(data, ctx)
	}

	traverseApply: TraverseApply = (data, ctx) => {
		const discriminant = this.compiledDiscriminant
		if (discriminant) {
			const value = valueAtPath(discriminant.path, data)
			const k = caseKeyOf(discriminant, value)
			const caseNode = discriminant.cases[k]
			if (caseNode === true) return
			if (caseNode === undefined) {
				ctx.errorFromNodeContext({
					code: "predicate",
					expected: describeCases(discriminant),
					actual:
						discriminant.kind === "domain" ?
							domainDescriptions[domainOf(value)]
						:	printable(value),
					relativePath: discriminant.path,
					meta: this.meta
				})
				return
			}
			const member = discriminant.members?.[k]
			if (member) applyMember(caseNode, data, ctx, member)
			else caseNode.traverseApply(data, ctx)
			return
		}
		const errors: ArkError[] = []
		for (let i = 0; i < this.branches.length; i++) {
			const branch = this.branches[i]
			ctx.pushBranch()
			applyMember(branch, data, ctx)
			if (!ctx.hasError()) {
				if (branch.transforms) return ctx.popTakenBranch()
				return ctx.popBranch()
			}
			errors.push(ctx.popBranch()!.error!)
		}
		ctx.errorFromNodeContext({ code: "union", errors, meta: this.meta })
	}

	traverseTransform: TraverseTransform = (data, ctx) => {
		const discriminant = this.compiledDiscriminant
		if (discriminant) {
			const k = caseKeyOf(discriminant, valueAtPath(discriminant.path, data))
			const caseNode = discriminant.cases[k]
			if (caseNode === true || !caseNode?.transforms) return data
			const member = discriminant.members?.[k]
			return member ?
					ctx.transformResolution(member.id, data, caseNode.traverseTransform)
				:	ctx.transform(caseNode, data)
		}
		// Apply also takes the first valid branch
		for (let i = 0; i < this.branches.length; i++) {
			const branch = this.branches[i]
			if (ctx.allows(branch, data))
				return branch.transforms ? ctx.transform(branch, data) : data
		}
		return this.transformRequiresContext ? data : unset
	}

	get compiledDiscriminant(): Discriminant | null {
		// if we have a union of two units like `boolean`, the
		// undiscriminated compilation will be just as fast
		return (
				this.unitBranches.length === this.branches.length &&
					this.branches.length === 2
			) ?
				null
			:	this.discriminant
	}

	compile(js: NodeCompiler): void {
		const discriminant = this.compiledDiscriminant
		if (!discriminant) return this.compileIndiscriminable(js)

		// we need to access the path as optional so we don't throw if it isn't present
		let condition = discriminant.optionallyChainedPropString

		if (discriminant.kind === "domain")
			condition = `typeof ${condition} === "object" ? ${condition} === null ? "null" : "object" : typeof ${condition} === "function" ? "object" : typeof ${condition}`

		const cases = discriminant.cases

		js.block(`switch(${condition})`, () => {
			for (const k in cases) {
				const v = cases[k]
				const caseCondition = k === "default" ? k : `case ${k}`
				const member = discriminant.members?.[k]
				if (member && v !== true && js.traversalKind === "Apply") {
					js.line(`${caseCondition}:`).invokeMember(v, member).return()
					continue
				}
				const caseResult =
					js.traversalKind === "Transform" ?
						v !== true && v.transforms ?
							invokeTransform(js, v, member)
						:	"data"
					: v === true ? "true"
					: js.invoke(v)
				js.line(`${caseCondition}: return ${caseResult}`)
			}
			return js
		})

		if (js.traversalKind === "Allows") {
			js.return(false)
			return
		}
		if (js.traversalKind === "Transform") {
			js.return("data")
			return
		}

		const serializedPathSegments = discriminant.path.map(k =>
			typeof k === "symbol" ? registeredReference(k) : JSON.stringify(k)
		)

		const serializedExpected = JSON.stringify(describeCases(discriminant))
		const serializedActual =
			discriminant.kind === "domain" ?
				`${js.ref(jsTypeOfDescriptions)}[${condition}]`
			:	`${js.ref(printable)}(${condition})`

		js.line(`ctx.errorFromNodeContext({
	code: "predicate",
	expected: ${serializedExpected},
	actual: ${serializedActual},
	relativePath: [${serializedPathSegments}],
	meta: ${this.compiledMeta}
})`)
	}

	private compileIndiscriminable(js: NodeCompiler): void {
		if (js.traversalKind === "Apply") {
			js.const("errors", "[]")
			for (const branch of this.branches) {
				js.line("ctx.pushBranch()")
					.invokeMember(branch)
					.if("!ctx.hasError()", () =>
						js.return(
							branch.transforms ? "ctx.popTakenBranch()" : "ctx.popBranch()"
						)
					)
					.line("errors.push(ctx.popBranch().error)")
			}

			js.line(
				`ctx.errorFromNodeContext({ code: "union", errors, meta: ${this.compiledMeta} })`
			)
		} else if (js.traversalKind === "Allows") {
			for (const branch of this.branches) {
				// an error a branch's predicate adds through ctx fails only that branch
				js.if(
					branch.allowsRequiresTraversal ?
						`ctx.allows(${js.ref(branch)}, data)`
					:	js.invoke(branch),
					() => js.return(true)
				)
			}
			js.return(false)
		} else {
			for (const branch of this.branches) {
				js.if(js.invoke(branch, { kind: "Allows" }), () =>
					js.return(branch.transforms ? invokeTransform(js, branch) : "data")
				)
			}
			// unless it requires ctx, a root checks for unset instead of calling its Allows
			js.return(
				this.transformRequiresContext ? "data" : compileSerializedValue(unset)
			)
		}
	}

	get nestableExpression(): string {
		// avoid adding unnecessary parentheses around boolean since it's
		// already collapsed to a single keyword
		return this.isBoolean ? "boolean" : `(${this.expression})`
	}
}

export const Union = {
	implementation,
	Node: UnionNode
}

const valueAtPath = (path: array<PropertyKey>, data: unknown): unknown => {
	let value: any = data
	for (let i = 0; i < path.length; i++) value = value?.[path[i]]
	return value
}

const caseKeyOf = (discriminant: Discriminant, value: unknown): string => {
	const k =
		discriminant.kind === "domain" ? `"${domainOf(value)}"` : unitKeyOf(value)
	return k !== undefined && discriminant.cases[k] !== undefined ? k : "default"
}

// object and symbol units are registered, so an unregistered value matches none
const unitKeyOf = (value: unknown): string | undefined => {
	if (!hasDomain(value, "object") && typeof value !== "symbol")
		return serializePrimitive(value as SerializablePrimitive)
	const name = registeredNameOf(value)
	return name && reference(name)
}

const registeredPrefix = `${registryName}.`

const describeCases = (discriminant: Discriminant): string =>
	describeBranches(
		Object.keys(discriminant.cases).map(k => {
			if (discriminant.kind === "domain") {
				const jsTypeOf = k.slice(1, -1) as JsTypeOf
				return jsTypeOf === "function" ?
						domainDescriptions.object
					:	domainDescriptions[jsTypeOf]
			}
			return k.startsWith(registeredPrefix) ?
					printable($ark[k.slice(registeredPrefix.length)])
				:	k
		})
	)

// a branch whose transform doesn't require ctx returns its errors rather than adding them
const invokeTransform = (
	js: NodeCompiler,
	branch: BaseRoot,
	member?: BaseRoot
): string =>
	member ?
		`ctx.transformResolution("${member.id}", data, ${js.referenceToId(branch.id, { kind: "Transform" })})`
	: js.requiresContext && returnsTransformErrors(branch) ?
		`ctx.transform(${js.ref(branch)}, data)`
	:	js.invoke(branch)

const discriminantToJson = (discriminant: Discriminant): JsonStructure => ({
	kind: discriminant.kind,
	path: discriminant.path.map(k =>
		typeof k === "string" ? k : compileSerializedValue(k)
	),
	cases: flatMorph(discriminant.cases, (k, node) => [
		k,
		node === true ? node
		: node.hasKind("union") && node.discriminantJson ? node.discriminantJson
		: node.json
	])
})

type DescribeBranchesOptions = {
	delimiter?: string
	finalDelimiter?: string
}

const describeExpressionOptions: DescribeBranchesOptions = {
	delimiter: " | ",
	finalDelimiter: " | "
}

const expressBranches = (expressions: string[]) =>
	describeBranches(expressions, describeExpressionOptions)

export const describeBranches = (
	descriptions: string[],
	opts?: DescribeBranchesOptions
): string => {
	const delimiter = opts?.delimiter ?? ", "
	const finalDelimiter = opts?.finalDelimiter ?? " or "

	if (descriptions.length === 0) return "never"

	if (descriptions.length === 1) return descriptions[0]
	if (
		(descriptions.length === 2 &&
			descriptions[0] === "false" &&
			descriptions[1] === "true") ||
		(descriptions[0] === "true" && descriptions[1] === "false")
	)
		return "boolean"

	// keep track of seen descriptions to avoid duplication
	const seen: Record<string, true | undefined> = {}
	const unique = descriptions.filter(s => (seen[s] ? false : (seen[s] = true)))
	const last = unique.pop()!

	return `${unique.join(delimiter)}${unique.length ? finalDelimiter : ""}${last}`
}

export type CaseKey<kind extends DiscriminantKind = DiscriminantKind> =
	DiscriminantKind extends kind ? string : DiscriminantKinds[kind] | "default"

export type DiscriminantLocation<
	kind extends DiscriminantKind = DiscriminantKind
> = {
	path: PropertyKey[]
	optionallyChainedPropString: string
	kind: kind
}

export interface Discriminant<kind extends DiscriminantKind = DiscriminantKind>
	extends DiscriminantLocation<kind> {
	cases: DiscriminatedCases<kind>
	// the cyclic branch a case was pruned from, entered in its place
	members?: { [caseKey in CaseKey<kind>]?: BaseRoot }
}

export type CaseContext = {
	branchIndices: number[]
	condition: nodeOfKind<DiscriminantKind> | Domain.Enumerable
}

export type CaseDiscriminant = nodeOfKind<DiscriminantKind> | Domain.Enumerable

export type DiscriminatedCases<
	kind extends DiscriminantKind = DiscriminantKind
> = {
	[caseKey in CaseKey<kind>]: BaseRoot | true
}

export type DiscriminantKinds = {
	domain: Domain
	unit: SerializedPrimitive | RegisteredReference
}

export type DiscriminantKind = show<keyof DiscriminantKinds>
