import {
	appendUnique,
	domainDescriptions,
	flatMorph,
	isArray,
	jsTypeOfDescriptions,
	printable,
	unset,
	type JsTypeOf,
	type JsonStructure,
	type SerializedPrimitive,
	type array,
	type show
} from "@ark/util"
import type { NodeSchema, RootSchema, nodeOfKind } from "../kinds.ts"
import type { BaseNode } from "../node.ts"
import { compileSerializedValue, type NodeCompiler } from "../shared/compile.ts"
import type {
	BaseErrorContext,
	BaseNormalizedSchema,
	declareNode
} from "../shared/declare.ts"
import type { ArkError } from "../shared/errors.ts"
import {
	defaultErrorWriters,
	describeBranches,
	type DescribeBranchesOptions
} from "../shared/errorWriters.ts"
import {
	implementNode,
	type RootKind,
	type UnionChildKind,
	type nodeImplementationOf
} from "../shared/implement.ts"
import {
	$ark,
	registeredReference,
	type RegisteredReference
} from "../shared/registry.ts"
import {
	Traversal,
	type TraverseAllows,
	type TraverseApply
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

					if (!ctx.def.ordered)
						branches.sort((l, r) => (l.hash < r.hash ? -1 : 1))

					return branches
				}
			}
		},
		normalize: schema => (isArray(schema) ? { branches: schema } : schema),
		defaults: defaultErrorWriters.union
	})

export class UnionNode extends BaseRoot<Union.Declaration> {
	isBoolean: boolean =
		this.branches.length === 2 &&
		this.branches[0].hasUnit(false) &&
		this.branches[1].hasUnit(true)

	unitBranches = this.branches.filter((n): n is Unit.Node | Morph.Node =>
		n.rawIn.hasKind("unit")
	)

	// each node discriminate creates for a case, in order, including those of
	// a discriminant it abandons, all of which are among the union's
	// references
	readonly caseNodes: BaseRoot[] = []

	// discriminating relates the branches and creates the cases. A union
	// discriminates as it is constructed, since relating its branches can
	// throw a ParseError parsing it reports (e.g. where one branch's index
	// signature and another's prop have disjoint values)
	readonly discriminant: Discriminant | null = this.discriminate()

	private _discriminantJson: JsonStructure | null | undefined
	get discriminantJson(): JsonStructure | null {
		if (this._discriminantJson === undefined) {
			this._discriminantJson =
				this.discriminant ? discriminantToJson(this.discriminant) : null
		}
		return this._discriminantJson
	}

	expression: string = this.distribute(
		n => n.nestableExpression,
		expressBranches
	)

	private discriminate(): Discriminant | null {
		// without an engine the union compiles indiscriminated
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

	// a unit binding this union compiles the same statements (compileRootApply
	// in scope.ts), so the two change together
	createBranchedOptimisticRootApply(): BaseNode["rootApply"] {
		return (data, onFail) => {
			const optimisticResult = this.traverseOptimistic(data)
			if (optimisticResult !== unset) return optimisticResult

			const ctx = new Traversal(data, this.$.resolvedConfig)
			this.traverseApply(data, ctx)
			return ctx.finalize(onFail)
		}
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

	traverseAllows: TraverseAllows = (data, ctx) =>
		this.branches.some(b => b.traverseAllows(data, ctx))

	traverseApply: TraverseApply = (data, ctx) => {
		const errors: ArkError[] = []
		for (let i = 0; i < this.branches.length; i++) {
			ctx.pushBranch()
			this.branches[i].traverseApply(data, ctx)
			if (!ctx.hasError()) {
				if (this.branches[i].includesTransform)
					return ctx.queuedMorphs.push(...ctx.popBranch()!.queuedMorphs)
				return ctx.popBranch()
			}
			errors.push(ctx.popBranch()!.error!)
		}
		ctx.errorFromNodeContext({ code: "union", errors, meta: this.meta })
	}

	traverseOptimistic = (data: unknown): unknown => {
		for (let i = 0; i < this.branches.length; i++) {
			const branch = this.branches[i]
			if ((branch.traverseAllows as any)(data)) {
				if (branch.contextFreeMorph) return branch.contextFreeMorph(data)
				// if we're calling this function and the matching branch didn't have
				// a context-free morph, it shouldn't have morphs at all
				return data
			}
		}
		return unset
	}

	// the discriminant compiled traversal switches on, or null if it checks
	// the branches in order, when Apply records an error for each branch that
	// fails before one passes
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

		const caseKeys = Object.keys(cases)

		const { optimistic } = js
		// only the first layer can be optimistic
		js.optimistic = false

		js.block(`switch(${condition})`, () => {
			for (const k in cases) {
				const v = cases[k]
				const caseCondition = k === "default" ? k : `case ${k}`

				let caseResult: string
				if (v === true) caseResult = optimistic ? "data" : "true"
				else if (optimistic) {
					if (v.rootApplyStrategy === "branchedOptimistic")
						caseResult = js.invoke(v, { kind: "Optimistic" })
					else if (v.contextFreeMorph)
						caseResult = `${js.invoke(v)} ? ${js.ref(v.contextFreeMorph)}(data) : "${unset}"`
					else caseResult = `${js.invoke(v)} ? data : "${unset}"`
				} else caseResult = js.invoke(v)

				js.line(`${caseCondition}: return ${caseResult}`)
			}
			return js
		})

		if (js.traversalKind === "Allows") {
			js.return(optimistic ? `"${unset}"` : false)
			return
		}

		const expected = describeBranches(
			discriminant.kind === "domain" ?
				caseKeys.map(k => {
					const jsTypeOf = k.slice(1, -1) as JsTypeOf
					return jsTypeOf === "function" ?
							domainDescriptions.object
						:	domainDescriptions[jsTypeOf]
				})
			:	caseKeys
		)

		const serializedPathSegments = discriminant.path.map(k =>
			typeof k === "symbol" ? registeredReference(k) : JSON.stringify(k)
		)

		const serializedExpected = JSON.stringify(expected)
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
					.line(js.invoke(branch))
					.if("!ctx.hasError()", () =>
						js.return(
							branch.includesTransform ?
								"ctx.queuedMorphs.push(...ctx.popBranch().queuedMorphs)"
							:	"ctx.popBranch()"
						)
					)
					.line("errors.push(ctx.popBranch().error)")
			}

			js.line(
				`ctx.errorFromNodeContext({ code: "union", errors, meta: ${this.compiledMeta} })`
			)
		} else {
			const { optimistic } = js
			// only the first layer can be optimistic
			js.optimistic = false
			for (const branch of this.branches) {
				js.if(`${js.invoke(branch)}`, () =>
					js.return(
						optimistic ?
							branch.contextFreeMorph ?
								`${js.ref(branch.contextFreeMorph)}(data)`
							:	"data"
						:	true
					)
				)
			}

			js.return(optimistic ? `"${unset}"` : false)
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

const describeExpressionOptions: DescribeBranchesOptions = {
	delimiter: " | ",
	finalDelimiter: " | "
}

const expressBranches = (expressions: string[]) =>
	describeBranches(expressions, describeExpressionOptions)

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
}

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
