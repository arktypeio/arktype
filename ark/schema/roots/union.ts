import {
	appendUnique,
	domainOf,
	hasDomain,
	registeredNameOf,
	serializePrimitive,
	unset,
	type SerializablePrimitive,
	type SerializedPrimitive,
	type array,
	type omit,
	type show
} from "@ark/util"
import type { nodeOfKind } from "../kinds.ts"
import { forgetReferences, type BaseNode } from "../node.ts"
import {
	compileSerializedValue,
	expectedOf,
	isDecidedByAllows,
	returnsTransformErrors,
	type NodeCompiler,
	type SwitchCase
} from "../shared/compile.ts"
import type {
	BaseErrorContext,
	BaseNodeInput,
	declareNode
} from "../shared/declare.ts"
import {
	errorFromNodeAt,
	errorFromUnion,
	type ArkError
} from "../shared/errors.ts"
import type { UnionSite } from "../shared/issues.ts"
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
	allowsInBranch,
	applyMember,
	transform,
	transformed,
	transformResolution,
	type AliasDepth,
	type InternalTraversal,
	type Traversal
} from "../shared/traversal.ts"
import {
	composing,
	describeBranches,
	describeCases,
	expressBranches,
	isAbsent,
	valueAtPath
} from "../shared/utils.ts"
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
			errorCtx: ErrorContext
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
	/**
	 * the domains or unit values the discriminant expected, with Array for
	 * an object case only arrays reach
	 */
	readonly cases: readonly (kind extends "domain" ? DomainCase : unknown)[]
	/** the discriminant is at a key, so meta describes the value around it */
	readonly onKey: boolean
	/** the discriminant key is not in its parent; false unless onKey */
	readonly absent: boolean
	readonly data: unknown
}

const implementation: nodeImplementationOf<Union.Declaration> =
	implementNode<Union.Declaration>({
		kind: "union",
		ownErr: true,
		bareKey: "branches",
		keys: {
			ordered: {},
			branches: {
				child: true
			}
		},
		defaults: {
			description: node =>
				node.distribute(branch => branch.description, describeBranches)
		}
	})

export class UnionNode extends BaseRoot<Union.Declaration> {
	isBoolean: boolean =
		this.branches.length === 2 &&
		this.branches[0].hasUnit(false) &&
		this.branches[1].hasUnit(true)

	unitBranches = this.branches.filter((n): n is Unit.Node | Morph.Node =>
		n._in.is("unit")
	)

	// every case node discriminate creates, even for a discriminant it abandons
	readonly caseNodes: BaseRoot[] = []

	private _disc: Discriminant | null | undefined
	// discriminated when first read
	get discriminant(): Discriminant | null {
		if (this._disc === undefined) {
			// null while discriminating, which can read this union's references
			this._disc = null
			this._disc = this.discriminate()
		}
		return this._disc
	}

	/** `discCases`, once read */
	private _discCases: DiscriminantCases | undefined
	/** the cases of its discriminant, by the serialized value each branch is discriminated by */
	get discCases(): DiscriminantCases {
		return (this._discCases ??= casesOf(this.discriminant!))
	}

	/** `missLists`, once read */
	private _missLists: boolean | undefined
	/** whether a miss of its own value lists its branches: if one is described, as an indiscriminable union's does */
	get missLists(): boolean {
		return (this._missLists ??=
			!isAuthored(this) &&
			this.discriminant!.path.length === 0 &&
			this.branches.some(isAuthored))
	}

	/** `discDesc`, once read */
	private _discDesc: string | undefined
	/** the description of what its discriminant expects */
	get discDesc(): string {
		return (this._discDesc ??=
			isAuthored(this) ? this.meta.description! : describeCases(this.discCases))
	}

	// a standalone issue reads only the union's description
	override get failSite(): UnionSite {
		return (this.c.failSite ??= {
			meta: this.meta,
			description: expectedOf(this.meta, this.description)
		}) as UnionSite
	}

	// a described union's miss is reported at its own path
	get missPath(): array<PropertyKey> {
		return isAuthored(this) ? [] : this.discriminant!.path
	}

	/** `discMeta`, once read */
	private _discMeta: ArkEnv.meta | undefined
	/** the meta its discriminant's errors are written with: at a key, expected and actual describe the object around it */
	get discMeta(): ArkEnv.meta {
		return (this._discMeta ??= metaAtDiscriminant(this.meta, this.missPath))
	}

	get expression(): string {
		return (this.c.expression ??= composing(() =>
			this.distribute(expressBranch, expressBranches)
		))
	}

	discriminate(): Discriminant | null {
		this.caseNodes.length = 0
		// an alias branch is replaced by its resolution before the union is used
		if (this.topAlias) return null
		const discriminant = $ark.sets?.discriminate(this) ?? null
		if (this.c.byId)
			for (const node of this.caseNodes) Object.assign(this.c.byId, node.byId)

		// what was read of its references while discriminating lacks its cases
		forgetReferences(this)
		return discriminant
	}

	override get otherRefs(): readonly BaseNode[] {
		// discriminating creates the case nodes
		void this.discriminant
		return this.caseNodes
	}

	// an indiscriminable union picks the branch it transforms by its Allows
	protected override get ctxSel(): boolean {
		const discriminant = this.discriminant
		if (!discriminant) return true
		for (const k in discriminant.cases) {
			const caseNode = discriminant.cases[k]
			if (caseNode !== true && caseNode.tfCtx) return true
		}
		return false
	}

	get topMorphs(): array<Morph> {
		return this.branches.reduce(
			(morphs, branch) => appendUnique(morphs, branch.topMorphs),
			[] as Morph[]
		)
	}

	get brief(): string {
		return this.distribute(branch => branch.brief, describeBranches)
	}

	/**
	 * whether a discriminant was found, finding it first if it wasn't
	 * uncompiled checks don't discriminate
	 */
	private get foundDisc(): Discriminant | null {
		return this._disc === undefined ? null : this.discriminant
	}

	tAllows(data: unknown, ctx: InternalTraversal | AliasDepth): boolean {
		const discriminant = this.foundDisc
		if (!discriminant) {
			return this.branches.some(b =>
				b.checksCtx ?
					allowsInBranch(ctx as Traversal, b, data)
				:	b.tAllows(data, ctx)
			)
		}
		const caseNode =
			discriminant.cases[
				caseKeyOf(discriminant, valueAtPath(discriminant.path, data))
			]
		return caseNode === true || !!caseNode?.tAllows(data, ctx)
	}

	tApply(data: unknown, ctx: InternalTraversal): void {
		const discriminant = this.discriminant
		if (discriminant) {
			const value = valueAtPath(discriminant.path, data)
			const k = caseKeyOf(discriminant, value)
			const caseNode = discriminant.cases[k]
			if (caseNode === true) return
			if (caseNode === undefined) {
				this.applyMiss(data, ctx, value)
				return
			}
			if (k === "default") {
				this.applyDefault(data, ctx, value)
				return
			}
			const member = discriminant.members?.[k]
			if (member) applyMember(caseNode, data, ctx, member)
			else caseNode.tApply(data, ctx)
			return
		}
		this.applyBranches(data, ctx)
	}

	// data matching no case fails each branch at the discriminant, unless the
	// discriminant can't be read from it, which then tells no branch apart
	applyMiss(data: unknown, ctx: InternalTraversal, value: unknown): boolean {
		if (this.missLists || !readsPath(this.discriminant!.path, data))
			this.applyBranches(data, ctx)
		else this.errorFromMiss(ctx, data, value)
		return !ctx.failFast
	}

	// data in the default case was matched by no case, so the branches without
	// the discriminant fail beside its miss
	applyDefault(data: unknown, ctx: InternalTraversal, value: unknown): boolean {
		ctx.pushBr()
		applyMember(this.discriminant!.cases.default as BaseRoot, data, ctx)
		const failed = ctx.popBr()!.error as ArkError | undefined
		if (!failed) return true
		if (this.missLists || !readsPath(this.discriminant!.path, data))
			this.applyBranches(data, ctx)
		else {
			ctx.pushBr()
			this.errorFromMiss(ctx, data, value)
			const miss = ctx.popBr()!.error as ArkError
			errorFromUnion(ctx, [miss, failed], this.meta, data)
		}
		return !ctx.failFast
	}

	private errorFromMiss(
		ctx: InternalTraversal,
		data: unknown,
		value: unknown
	): ArkError {
		const path = this.missPath
		const absent = value === undefined && isAbsent(path, data)
		return errorFromNodeAt(
			ctx,
			this.missContexts[absent ? 1 : 0],
			path,
			path.length ? value : data
		)
	}

	private _missContexts: omit<DiscriminantErrorContext, "data">[] | undefined
	// a miss's contexts, present and absent, built once as a node's is so its
	// errors share a builder
	private get missContexts(): omit<DiscriminantErrorContext, "data">[] {
		return (this._missContexts ??= [false, true].map(
			(absent): omit<DiscriminantErrorContext, "data"> => ({
				code: "discriminant",
				...this.discCases,
				onKey: this.missPath.length !== 0,
				absent,
				description: this.discDesc,
				meta: this.discMeta
			})
		))
	}

	applyBranches(data: unknown, ctx: InternalTraversal): void {
		const errors: ArkError[] = []
		for (let i = 0; i < this.branches.length; i++) {
			const branch = this.branches[i]
			ctx.pushBr()
			applyMember(branch, data, ctx)
			if (!ctx.hasError()) {
				ctx.popBr()
				return
			}
			errors.push(ctx.popBr()!.error as ArkError)
		}
		errorFromUnion(ctx, errors, this.meta, data)
	}

	tTransform(data: unknown, ctx: InternalTraversal): unknown {
		const discriminant = this.foundDisc
		if (discriminant) {
			const k = caseKeyOf(discriminant, valueAtPath(discriminant.path, data))
			const caseNode = discriminant.cases[k]
			if (caseNode === true || !caseNode?.tfs) return data
			const member = discriminant.members?.[k]
			return member ?
					transformResolution(
						ctx,
						member.id,
						data,
						caseNode.tTransform!,
						caseNode
					)
				:	transform(ctx, caseNode, data)
		}
		// Apply also takes the first valid branch
		for (let i = 0; i < this.branches.length; i++) {
			const branch = this.branches[i]
			if (allowsInBranch(ctx, branch, data))
				return branch.tfs ? transform(ctx, branch, data) : data
		}
		return this.tfCtx ? data : unset
	}

	jsCond(js: NodeCompiler, data: string): string | undefined {
		if (this.branches.length > maxInlinedBranches) return
		const conditions: string[] = []
		for (const branch of this.branches) {
			const condition = branch.jsCond?.(js, data)
			if (condition === undefined) return
			conditions.push(condition.includes("&&") ? `(${condition})` : condition)
		}
		return conditions.join(" || ") || "false"
	}

	compile(js: NodeCompiler): void {
		const discriminant = this.discriminant
		if (!discriminant) return this.jsIndisc(js)
		// two branches of different domains are checked in turn, a unit first,
		// which is cheaper than finding data's domain
		if (
			js.trav === "Allows" &&
			discriminant.kind === "domain" &&
			this.branches.length === 2
		) {
			const [a, b] = this.branches
			return this.jsIndisc(js, b.is("unit") ? [b, a] : [a, b])
		}

		// we need to access the path as optional so we don't throw if it isn't present
		const value = `data${discriminant.path.map(k => js.prop(k, true)).join("")}`
		const cases = discriminant.cases
		const written: SwitchCase[] = []
		for (const k in cases) {
			const v = cases[k]
			// a case transforming nothing returns data as the switch's end does
			if (
				js.trav === "Transform" &&
				(v === true || !v.tfs) &&
				!("default" in cases)
			)
				continue
			const caseCondition =
				k === "default" ? k
				: k.startsWith(registeredPrefix) ?
					`case ${js.ref($ark[k.slice(registeredPrefix.length)] as never)}`
				:	`case ${k}`
			const member = discriminant.members?.[k]
			const caseResult =
				js.trav === "Transform" ?
					v !== true && v.tfs ?
						invokeTransform(js, v, member)
					:	"data"
				: v === true ? "true"
				: js.trav !== "Apply" ? js.inv(v)
				: k === "default" ?
					(js.defaultFails?.(this, v) ??
					`${js.ref(this)}.applyDefault(data, ctx, ${value})`)
				: member ? js.applyMember(v, member)
				: js.inv(v)
			written.push([caseCondition, caseResult])
		}
		const otherwise =
			js.trav === "Allows" ? "false"
			: js.trav === "Transform" ? "data"
			: (js.missFails?.(this) ??
				`${js.ref(this)}.applyMiss(data, ctx, ${value})`)
		// an Apply of one domain or a unit it allows, as `T | null`, needn't switch
		if (js.trav === "Apply" && written.length === 2) {
			const unitIndex = written.findIndex(
				([label, result]) =>
					result === "true" &&
					(label === `case "null"` || label === `case "undefined"`)
			)
			const [label, result] = written[1 - unitIndex] ?? []
			if (
				unitIndex !== -1 &&
				label !== `case "object"` &&
				label !== "default"
			) {
				js.return(
					`${value} === ${written[unitIndex][0].slice(6, -1)} || (typeof ${value} === ${label!.slice(5)} ? ${result} : ${otherwise})`
				)
				return
			}
		}
		js.switch(
			discriminant.kind === "domain" ?
				compileDomainOf(
					value,
					written.map(([label]) => label)
				)
			:	value,
			written,
			otherwise
		)
	}

	/** writes the check of branches no discriminant tells apart */
	private jsIndisc(js: NodeCompiler, branches = this.branches): void {
		if (js.trav === "Apply" && !this.hasAlias && isDecidedByAllows(this)) {
			for (const branch of this.branches) {
				js.if(
					branch.jsCond?.(js, "data") ?? js.inv(branch, { kind: "Allows" }),
					() => js.return(true)
				)
			}
			js.return(
				js.unionFails?.(this) ??
					`!ctx.failsUnion([${this.branches.map(branch => js.traversal(branch, "Apply")).join(", ")}], ${js.site(this)}, data)`
			)
		} else if (js.trav === "Apply") {
			// each branch is applied once, as Allows can't enter its resolution
			// a compiler writing unionFails needs no branch errors
			const collects = !js.unionFails
			if (collects) js.const("errors", "[]")
			for (const branch of this.branches) {
				js.line("ctx.pushBr()")
					.line(js.applyMember(branch))
					.if("!ctx.hasError()", () => js.line("ctx.popBr()").return(true))
					.line(collects ? "errors.push(ctx.popBr().error)" : "ctx.popBr()")
			}
			if (collects) {
				js.line(
					`${js.ref(errorFromUnion)}(ctx, errors, ${js.ref(this.meta)}, data)`
				).return("!ctx.failFast")
			} else js.return(js.unionFails!(this))
		} else if (js.trav === "Allows") {
			for (const branch of branches) {
				// an error a branch's predicate adds through ctx fails only that branch
				js.if(
					branch.checksCtx ?
						`${js.ref(allowsInBranch)}(ctx, ${js.ref(branch)}, data)`
					:	(branch.jsCond?.(js, "data") ?? js.inv(branch)),
					() => js.return(true)
				)
			}
			js.return(false)
		} else {
			for (const branch of this.branches) {
				js.if(
					branch.jsCond?.(js, "data") ?? js.inv(branch, { kind: "Allows" }),
					() => js.return(branch.tfs ? invokeTransform(js, branch) : "data")
				)
			}
			// unless it requires ctx, a root checks for unset instead of calling its Allows
			js.return(this.tfCtx ? "data" : compileSerializedValue(unset))
		}
	}

	get nestedExpr(): string {
		// boolean and never are already single keywords
		return this.isBoolean || this.isNever() ?
				this.expression
			:	`(${this.expression})`
	}
}

export const Union = {
	impl: implementation,
	Node: UnionNode
}

const maxInlinedBranches = 4

// the name of a value's domain a switch with these case labels reads: a
// function's is "object", and without an object case, any but null's is its
// typeof
export const compileDomainOf = (
	value: string,
	labels: readonly string[]
): string =>
	labels.includes(`case "object"`) ?
		`typeof ${value} === "object" ? ${value} === null ? "null" : "object" : typeof ${value} === "function" ? "object" : typeof ${value}`
	: labels.includes(`case "null"`) ?
		`${value} === null ? "null" : typeof ${value}`
	:	`typeof ${value}`

// an intersection binds more tightly than a union, so it never needs parens
const expressBranch = (branch: Union.ChildNode): string =>
	branch.is("intersection") ? branch.expression : branch.nestedExpr

// whether each key on a path is read from an object, or an array at an index
const readsPath = (path: array<PropertyKey>, data: unknown): boolean => {
	let parent: any = data
	for (const k of path) {
		if (
			typeof k === "number" ? !Array.isArray(parent) : Object(parent) !== parent
		)
			return false
		parent = parent[k]
	}
	return true
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

export type DiscriminantCases = {
	[kind in DiscriminantKind]: Pick<
		DiscriminantErrorContextOf<kind>,
		"discriminantKind" | "cases"
	>
}[DiscriminantKind]

export type DomainCase = Domain | "Array"

const casesOf = (discriminant: Discriminant): DiscriminantCases => {
	const keys = Object.keys(discriminant.cases).filter(k => k !== "default")
	return discriminant.kind === "domain" ?
			{
				discriminantKind: "domain",
				cases: Object.freeze(
					keys.map(k =>
						k === '"object"' && isArrayCase(discriminant.cases[k]) ?
							"Array"
						:	(k.slice(1, -1) as Domain)
					)
				)
			}
		:	{ discriminantKind: "unit", cases: Object.freeze(keys.map(unitOf)) }
}

// a description someone wrote, not a keyword's phrase or a default
const isAuthored = (node: { meta: ArkEnv.meta }): boolean =>
	node.meta.description !== undefined && node.meta.keyword === undefined

const isArrayCase = (caseNode: BaseRoot | true): boolean =>
	caseNode !== true && caseNode._in.extends($ark.kw.Array.internal)

const metaAtDiscriminant = (
	meta: ArkEnv.meta,
	path: array<PropertyKey>
): ArkEnv.meta => {
	if (path.length === 0) return meta
	const { expected, actual, ...rest } = meta
	return rest
}

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
		`${js.ref(transformResolution)}(ctx, "${js.nameOf(member.id)}", data, ${js.refToId(branch.id, { kind: "Transform" })})`
	: js.needsCtx && returnsTransformErrors(branch) ?
		`${js.ref(transformed)}(ctx, ${js.inv(branch)}, data)`
	:	js.inv(branch)

export type CaseKey<kind extends DiscriminantKind = DiscriminantKind> =
	DiscriminantKind extends kind ? string : DiscriminantKinds[kind] | "default"

export type DiscriminantLocation<
	kind extends DiscriminantKind = DiscriminantKind
> = {
	path: PropertyKey[]
	/** the discriminant's path as optional-chained property accesses */
	pathStr: string
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
