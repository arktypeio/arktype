import {
	appendUnique,
	domainDescriptions,
	domainOf,
	hasDomain,
	printable,
	registeredNameOf,
	serializePrimitive,
	unset,
	type SerializablePrimitive,
	type SerializedPrimitive,
	type array,
	type show
} from "@ark/util"
import type { nodeOfKind } from "../kinds.ts"
import type { BaseNode } from "../node.ts"
import {
	compileSerializedValue,
	returnsTransformErrors,
	type NodeCompiler
} from "../shared/compile.ts"
import type {
	BaseErrorContext,
	BaseNodeInput,
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
	registryName,
	type RegisteredReference
} from "../shared/registry.ts"
import {
	applyMember,
	type Traversal,
	type TraverseAllows,
	type TraverseApply,
	type TraverseTransform
} from "../shared/traversal.ts"
import { isAbsent, valueAtPath } from "../shared/utils.ts"
import type { Domain } from "./domain.ts"
import type { Morph } from "./morph.ts"
import { BaseRoot } from "./root.ts"
import type { Unit } from "./unit.ts"

export declare namespace Union {
	export type ChildKind = UnionChildKind

	export type ChildNode = nodeOfKind<ChildKind>

	export interface Inner {
		readonly branches: readonly ChildNode[]
		readonly ordered?: true
	}

	// a union's branches are flattened when it's created, so any root can be one
	export interface Input extends BaseNodeInput {
		readonly branches: readonly BaseRoot[]
		readonly ordered?: true
	}

	export interface ErrorContext extends BaseErrorContext<"union"> {
		errors: readonly ArkError[]
	}

	export interface Declaration
		extends declareNode<{
			kind: "union"
			inner: Inner
			errorContext: ErrorContext
			reducibleTo: RootKind
			childKind: UnionChildKind
		}> {}

	export type Node = UnionNode
}

export type DiscriminantErrorContext = {
	[kind in DiscriminantKind]: DiscriminantErrorContextOf<kind>
}[DiscriminantKind]

interface DiscriminantErrorContextOf<kind extends DiscriminantKind>
	extends BaseErrorContext<"discriminant"> {
	readonly discriminantKind: kind
	/** the domains or unit values the discriminant expected */
	readonly cases: readonly (kind extends "domain" ? Domain : unknown)[]
	/** the discriminant is at a key, so meta describes the value around it */
	readonly onKey: boolean
	/** the discriminant key is not in its parent; false unless onKey */
	readonly absent: boolean
	readonly data: unknown
}

const implementation: nodeImplementationOf<Union.Declaration> =
	implementNode<Union.Declaration>({
		kind: "union",
		hasAssociatedError: true,
		collapsibleKey: "branches",
		keys: {
			ordered: {},
			branches: {
				child: true
			}
		},
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

	unitBranches = this.branches.filter((n): n is Unit.Node | Morph.Node =>
		n.rawIn.hasKind("unit")
	)

	// every case node discriminate creates, even for a discriminant it abandons
	readonly caseNodes: BaseRoot[] = []

	// discriminated on construction, since relating branches can throw a ParseError,
	// e.g. for an index signature and a prop with disjoint values
	discriminant = this.discriminate()

	private _discriminantCases: DiscriminantCases | undefined
	get discriminantCases(): DiscriminantCases {
		return (this._discriminantCases ??= casesOf(this.discriminant!))
	}

	private _discriminantDescription: string | undefined
	get discriminantDescription(): string {
		return (this._discriminantDescription ??= describeCases(
			this.discriminantCases
		))
	}

	private _discriminantMeta: ArkEnv.meta | undefined
	// at a key, the union's expected and actual describe the object around it
	get discriminantMeta(): ArkEnv.meta {
		return (this._discriminantMeta ??= metaAtDiscriminant(
			this.meta,
			this.discriminant!
		))
	}

	expression: string = this.distribute(
		// an intersection binds more tightly than a union, so it never needs parens
		n => (n.hasKind("intersection") ? n.expression : n.nestableExpression),
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

	override get referencedBesidesChildren(): readonly BaseNode[] {
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
				ctx.errorFromContext({
					code: "discriminant",
					...this.discriminantCases,
					onKey: discriminant.path.length !== 0,
					absent: value === undefined && isAbsent(discriminant.path, data),
					description: this.discriminantDescription,
					relativePath: discriminant.path,
					data: value,
					meta: this.discriminantMeta
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
			if (!ctx.hasError()) return ctx.popBranch()
			errors.push(ctx.popBranch()!.error!)
		}
		ctx.errorFromContext({ code: "union", errors, meta: this.meta, data })
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
		const value = `data${discriminant.path.map(k => js.prop(k, true)).join("")}`
		let condition = value

		if (discriminant.kind === "domain")
			condition = `typeof ${condition} === "object" ? ${condition} === null ? "null" : "object" : typeof ${condition} === "function" ? "object" : typeof ${condition}`

		const cases = discriminant.cases

		js.block(`switch(${condition})`, () => {
			for (const k in cases) {
				const v = cases[k]
				const caseCondition =
					k === "default" ? k
					: k.startsWith(registeredPrefix) ?
						`case ${js.ref($ark[k.slice(registeredPrefix.length)] as never)}`
					:	`case ${k}`
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

		const serializedPathSegments = discriminant.path.map(k => js.serialize(k))

		const absent =
			discriminant.path.length ?
				`${value} === undefined && ${js.ref(isAbsent)}(${js.ref(discriminant.path)}, data)`
			:	"false"

		js.line(`ctx.errorFromContext({
	code: "discriminant",
	discriminantKind: "${discriminant.kind}",
	cases: ${js.ref(this.discriminantCases.cases)},
	onKey: ${discriminant.path.length !== 0},
	absent: ${absent},
	description: ${js.ref(this)}.discriminantDescription,
	relativePath: [${serializedPathSegments}],
	data: ${value},
	meta: ${js.ref(this.discriminantMeta)}
})`)
	}

	private compileIndiscriminable(js: NodeCompiler): void {
		if (js.traversalKind === "Apply") {
			js.const("errors", "[]")
			for (const branch of this.branches) {
				js.line("ctx.pushBranch()")
					.invokeMember(branch)
					.if("!ctx.hasError()", () => js.return("ctx.popBranch()"))
					.line("errors.push(ctx.popBranch().error)")
			}

			js.line(
				`ctx.errorFromContext({ code: "union", errors, meta: ${js.ref(this.meta)}, data })`
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

type DiscriminantCases = {
	[kind in DiscriminantKind]: Pick<
		DiscriminantErrorContextOf<kind>,
		"discriminantKind" | "cases"
	>
}[DiscriminantKind]

const casesOf = (discriminant: Discriminant): DiscriminantCases => {
	const keys = Object.keys(discriminant.cases).filter(k => k !== "default")
	return discriminant.kind === "domain" ?
			{
				discriminantKind: "domain",
				cases: Object.freeze(keys.map(k => k.slice(1, -1) as Domain))
			}
		:	{ discriminantKind: "unit", cases: Object.freeze(keys.map(unitOf)) }
}

const metaAtDiscriminant = (
	meta: ArkEnv.meta,
	discriminant: Discriminant
): ArkEnv.meta => {
	if (discriminant.path.length === 0) return meta
	const { expected, actual, ...rest } = meta
	return rest
}

const describeCases = ({ discriminantKind, cases }: DiscriminantCases) =>
	describeBranches(
		discriminantKind === "domain" ?
			cases.map(domain => domainDescriptions[domain])
		:	cases.map(unit => printable(unit, { ownDataOnly: true }))
	)

// the inverse of unitKeyOf
const unitOf = (k: string): unknown =>
	k.startsWith(registeredPrefix) ? $ark[k.slice(registeredPrefix.length)]
	: k.endsWith("n") ? BigInt(k.slice(0, -1))
	: k === "undefined" ? undefined
	: k.endsWith("Infinity") ? Number(k)
	: JSON.parse(k)

// a branch whose transform doesn't require ctx returns its errors rather than adding them
const invokeTransform = (
	js: NodeCompiler,
	branch: BaseRoot,
	member?: BaseRoot
): string =>
	member ?
		`ctx.transformResolution("${js.nameOf(member.id)}", data, ${js.referenceToId(branch.id, { kind: "Transform" })})`
	: js.requiresContext && returnsTransformErrors(branch) ?
		`ctx.transform(${js.ref(branch)}, data)`
	:	js.invoke(branch)

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
	descriptions: readonly string[],
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
	const seen: Record<string, true | undefined> = Object.create(null)
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
