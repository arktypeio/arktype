import {
	CompiledFunction,
	DynamicBase,
	entriesOf,
	hasDomain,
	includes,
	isArray,
	throwInternalError,
	throwParseError,
	type Json
} from "@arktype/util"
import { maybeGetBasisKind, type BasisKind } from "./bases/basis.js"
import { In } from "./io/compile.js"
import { arkKind, isNode, registry } from "./io/registry.js"
import { unflattenConstraints } from "./sets/intersection.js"
import type { ValidatorKind } from "./sets/morph.js"
import type {
	BranchKind,
	UnionSchema,
	parseSchemaBranches,
	validateSchemaBranch
} from "./sets/union.js"
import { createBuiltins } from "./shared/builtins.js"
import type { CompilationContext } from "./shared/compilation.js"
import type { BaseAttributes } from "./shared/declare.js"
import {
	basisKinds,
	closedRefinementKinds,
	constraintKinds,
	defaultInnerKeySerializer,
	openRefinementKinds,
	refinementKinds,
	rootKinds,
	setKinds,
	type ClosedRefinementKind,
	type ConstraintKind,
	type NodeKind,
	type OpenRefinementKind,
	type RefinementKind,
	type Root,
	type RootKind,
	type SchemaParseContext,
	type SchemaParseContextInput,
	type SetKind,
	type UnknownNodeImplementation
} from "./shared/define.js"
import { Disjoint } from "./shared/disjoint.js"
import { leftOperandOf, type intersectionOf } from "./shared/intersect.js"
import {
	NodeImplementationByKind,
	type Attachments,
	type Inner,
	type Node,
	type Schema
} from "./shared/node.js"
import { inferred } from "./shared/symbols.js"

export type UnknownNode = BaseNode<any>

const $ark = registry()

export abstract class BaseNode<
	kind extends NodeKind = NodeKind,
	t = unknown
> extends DynamicBase<Inner<kind> & Attachments<kind> & BaseAttachments<kind>> {
	readonly [arkKind] = "node"
	readonly cls = BaseNode

	readonly implementation: UnknownNodeImplementation = NodeImplementationByKind[
		this.kind
	] as never
	readonly includesMorph: boolean =
		this.kind === "morph" || this.children.some((child) => child.includesMorph)
	readonly referencesById: Record<string, UnknownNode> = this.children.reduce(
		(result, child) => Object.assign(result, child.contributesReferencesById),
		{}
	)
	readonly references: readonly UnknownNode[] = Object.values(
		this.referencesById
	)
	readonly contributesReferencesById: Record<string, UnknownNode> =
		this.id in this.referencesById
			? this.referencesById
			: { ...this.referencesById, [this.id]: this }
	readonly allows: (data: unknown) => data is t
	readonly alias: string = $ark.register(this, this.inner.alias)
	readonly description: string

	protected constructor(baseAttachments: BaseAttachments<kind>) {
		super(baseAttachments as never)
		for (const k in baseAttachments.inner) {
			if (k in this) {
				// if we attempt to overwrite an existing node key, throw unless
				// it is expected and can be safely ignored.
				// in and out cannot overwrite their respective getters, so instead
				// morph assigns them to `inCache` and `outCache`
				if (k !== "in" && k !== "out" && k !== "description") {
					throwInternalError(
						`Unexpected attempt to overwrite existing node key ${k} from ${this.kind} inner`
					)
				}
			} else {
				this[k] = this.inner[k] as never
			}
		}
		const attachments = this.implementation.attach(this as never)
		Object.assign(this, attachments)
		this.allows = new CompiledFunction(
			In,
			this.compile({
				path: [],
				discriminants: [],
				successKind: "true",
				failureKind: "false"
			})
		)
		// important this is last as writeDefaultDescription could rely on attached
		this.description ??= this.implementation.writeDefaultDescription(
			this as never
		)
	}

	compile(ctx: CompilationContext) {
		return this.implementation.compile(this, ctx)
	}

	inCache?: UnknownNode;
	get in(): Node<kind extends "morph" ? ValidatorKind : reducibleKindOf<kind>> {
		if (!this.inCache) {
			this.inCache = this.getIo("in")
		}
		return this.inCache as never
	}

	outCache?: UnknownNode
	get out(): Node<
		kind extends "morph" ? ValidatorKind : reducibleKindOf<kind>
	> {
		if (!this.outCache) {
			this.outCache = this.getIo("out")
		}
		return this.outCache as never
	}

	private getIo(kind: "in" | "out"): UnknownNode {
		if (!this.includesMorph) {
			return this
		}
		const ioInner: Record<string, unknown> = {}
		for (const [k, v] of this.entries) {
			const keyDefinition = this.implementation.keys[k as keyof BaseAttributes]!
			if (keyDefinition.meta) {
				continue
			}
			if (v instanceof BaseNode) {
				ioInner[k] = v[kind]
			} else if (
				Array.isArray(v) &&
				v.every((_): _ is UnknownNode => _ instanceof BaseNode)
			) {
				ioInner[k] = v.map((child) => child[kind])
			} else {
				ioInner[k] = v
			}
		}
		return parseSchema(this.kind, ioInner)
	}

	toJSON() {
		return this.json
	}

	equals(other: UnknownNode) {
		return this.typeId === other.typeId
	}

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === (kind as never)
	}

	isBasis(): this is Node<BasisKind> {
		return includes(basisKinds, this.kind)
	}

	isClosedRefinement(): this is Node<ClosedRefinementKind> {
		return includes(closedRefinementKinds, this.kind)
	}

	isOpenRefinement(): this is Node<OpenRefinementKind> {
		return includes(openRefinementKinds, this.kind)
	}

	isRefinement(): this is Node<RefinementKind> {
		return includes(refinementKinds, this.kind)
	}

	isRoot(): this is Node<RootKind> {
		return includes(rootKinds, this.kind)
	}

	isSet(): this is Node<SetKind> {
		return includes(setKinds, this.kind)
	}

	isConstraint(): this is Node<ConstraintKind> {
		return includes(constraintKinds, this.kind)
	}

	toString() {
		return this.description
	}

	private static intersectionCache: Record<string, UnknownNode | Disjoint> = {}
	intersect<other extends Node>(
		other: other
	): intersectionOf<kind, other["kind"]>
	intersect(other: UnknownNode): UnknownNode | Disjoint | null {
		const cacheKey = `${this.typeId}&${other.typeId}`
		if (BaseNode.intersectionCache[cacheKey] !== undefined) {
			return BaseNode.intersectionCache[cacheKey]
		}
		const closedResult = this.intersectClosed(other as never)
		if (closedResult !== null) {
			BaseNode.intersectionCache[cacheKey] = closedResult
			BaseNode.intersectionCache[`${other.typeId}&${this.typeId}`] =
				// also cache the result with other's condition as the key.
				// if it was a Disjoint, it has to be inverted so that l,r
				// still line up correctly
				closedResult instanceof Disjoint ? closedResult.invert() : closedResult
			return closedResult
		}
		if (this.isSet() || other.isSet()) {
			return throwInternalError(
				`Unexpected null intersection between non-constraints ${this.kind} and ${other.kind}`
			)
		}
		// if either constraint is a basis or both don't require a basis (i.e.
		// are predicates), it can form an intersection
		return this.isBasis() ||
			other.isBasis() ||
			(this.kind === "predicate" && other.kind === "predicate")
			? parseSchema(
					"intersection",
					unflattenConstraints([this as never, other])
			  )
			: null
	}

	intersectClosed<other extends Node>(
		other: other
	): Node<kind | other["kind"]> | Disjoint | null {
		if (this.equals(other)) {
			// TODO: meta
			return this as never
		}
		const l = leftOperandOf(this, other)
		const thisIsLeft = l === this
		const r: UnknownNode = thisIsLeft ? other : this
		const intersections = l.implementation.intersections
		const intersector = (intersections as any)[r.kind] ?? intersections.default
		const result = intersector?.(l, r)
		if (result) {
			if (result instanceof Disjoint) {
				return thisIsLeft ? result : result.invert()
			}
			// TODO: meta
			return parseSchema(l.kind, result) as never
		}
		return null
	}

	static parseSchema = parseSchema
	static parseRootFromKinds = parseRootFromKinds
	static parsePrereduced = parsePrereduced

	static isInitialized = false
	static #builtins: Builtins | undefined
	static get builtins() {
		if (!this.#builtins) {
			this.#builtins = createBuiltins()
			this.isInitialized = true
		}
		return this.#builtins
	}
}

export type Builtins = ReturnType<typeof createBuiltins>

export type NodeParser = {
	<const branches extends readonly unknown[]>(
		schema: {
			branches: {
				[i in keyof branches]: validateSchemaBranch<branches[i]>
			}
		} & UnionSchema
	): parseSchemaBranches<branches>
	<branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: validateSchemaBranch<branches[i]>
		}
	): parseSchemaBranches<branches>
}

const parseBranches: NodeParser = (...branches) =>
	parseSchema(
		"union",
		(branches.length === 1 &&
		hasDomain(branches[0], "object") &&
		"branches" in branches[0]
			? branches[0]
			: branches) as never
	) as never

type UnitsParser = <const branches extends readonly unknown[]>(
	...values: branches
) => branches["length"] extends 1
	? Node<"unit", branches[0]>
	: Node<"union" | "unit", branches[number]>

const parseUnits: UnitsParser = (...values) => {
	const uniqueValues: unknown[] = []
	for (const value of values) {
		if (!uniqueValues.includes(value)) {
			uniqueValues.push(value)
		}
	}
	const branches = uniqueValues.map((unit) =>
		parsePrereduced("unit", { is: unit })
	)
	if (branches.length === 1) {
		return branches[0]
	}
	return parsePrereduced("union", {
		branches
	}) as never
}

export const node = Object.assign(parseBranches, {
	units: parseUnits
})

export function parsePrereduced<kind extends RootKind>(
	kind: kind,
	schema: Schema<kind>
): Node<kind> {
	return parseSchema(kind, schema, {
		prereduced: true
	}) as never
}

export class RootNode<
	kind extends RootKind = RootKind,
	t = unknown
> extends BaseNode<kind, t> {
	// TODO: standardize name with type
	declare infer: t;
	declare [inferred]: t

	// import we only declare this, otherwise it would reinitialize a union's branches to undefined
	declare readonly branches: readonly Node<BranchKind>[]

	protected constructor(attachments: BaseAttachments<kind>) {
		super(attachments)
		// in a union, branches will have already been assigned from inner
		// otherwise, initialize it to a singleton array containing the current branch node
		this.branches ??= [this as never]
	}

	constrain<refinementKind extends RefinementKind>(
		kind: refinementKind,
		schema: Schema<refinementKind>
	): Exclude<intersectionOf<this["kind"], refinementKind>, Disjoint> {
		const refinement = parseSchema(kind, schema)
		return this.and(refinement) as never
	}

	keyof() {
		return this
		// return this.rule.reduce(
		// 	(result, branch) => result.and(branch.keyof()),
		// 	builtins.unknown()
		// )
	}

	// TODO: inferIntersection
	and<other extends Node>(
		other: other
	): Exclude<intersectionOf<kind, other["kind"]>, Disjoint> {
		const result = this.intersect(other)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	// TODO: limit input types
	or<other extends Root>(
		other: other
	): Node<
		"union" | Extract<kind | other["kind"], RootKind>,
		t | other["infer"]
	> {
		return parseSchema("union", [...this.branches, ...other.branches]) as never
	}

	isUnknown(): this is BaseNode<"intersection", unknown> {
		return this.equals(BaseNode.builtins.unknown)
	}

	isNever(): this is BaseNode<"union", never> {
		return this.equals(BaseNode.builtins.never)
	}

	getPath() {
		return this
	}

	array(): Node<"intersection", t[]> {
		return this as never
	}

	extends<other extends Root>(
		other: other
	): this is Node<kind, other["infer"]> {
		const intersection = this.intersect(other)
		return (
			!(intersection instanceof Disjoint) && this.equals(intersection as never)
		)
	}
}

export type BaseAttachments<kind extends NodeKind> = {
	readonly kind: kind
	readonly inner: Inner<kind>
	readonly entries: entriesOf<Inner<kind>>
	readonly json: Json
	readonly typeJson: Json
	readonly collapsibleJson: Json
	readonly children: UnknownNode[]
	readonly id: string
	readonly typeId: string
}

export function parseRootFromKinds<schemaKind extends RootKind>(
	allowedKinds: readonly schemaKind[],
	schema: unknown
): Node<reducibleKindOf<schemaKind>> {
	const kind = rootKindOfSchema(schema)
	if (!allowedKinds.includes(kind as never)) {
		return throwParseError(
			`Schema of kind ${kind} should be one of ${allowedKinds}`
		)
	}
	return parseSchema(kind, schema as never, {}) as never
}

const nodeCache: Record<string, unknown> = {}

export function parseSchema<schemaKind extends NodeKind>(
	kind: schemaKind,
	schema: Schema<schemaKind>,
	ctxInput?: SchemaParseContextInput
): Node<reducibleKindOf<schemaKind>> {
	if (isNode(schema)) {
		return schema as never
	}
	const implementation: UnknownNodeImplementation = NodeImplementationByKind[
		kind
	] as never
	const inner: Record<string, unknown> = {}
	const normalizedSchema: any = implementation.normalize?.(schema) ?? schema
	const ctx: SchemaParseContext<any> = {
		...ctxInput,
		schema: normalizedSchema,
		cls: BaseNode
	}
	implementation.addContext?.(ctx)
	const schemaEntries = entriesOf(normalizedSchema).sort((l, r) =>
		l[0] < r[0] ? -1 : 1
	)
	let json: Record<string, unknown> = {}
	let typeJson: Record<string, unknown> = {}
	const children: UnknownNode[] = []
	for (const [k, v] of schemaEntries) {
		const keyDefinition = implementation.keys[k]
		if (!(k in implementation.keys)) {
			return throwParseError(`Key ${k} is not valid on ${kind} schema`)
		}
		const innerValue = keyDefinition.parse ? keyDefinition.parse(v, ctx) : v
		if (innerValue === undefined && !keyDefinition.preserveUndefined) {
			continue
		}
		inner[k] = innerValue
		if (isNode(innerValue)) {
			json[k] = innerValue.collapsibleJson
			children.push(innerValue)
		} else if (
			isArray(innerValue) &&
			innerValue.every((_): _ is UnknownNode => isNode(_))
		) {
			json[k] = innerValue.map((node) => node.collapsibleJson)
			children.push(...innerValue)
		} else {
			json[k] = keyDefinition.serialize
				? keyDefinition.serialize(v)
				: defaultInnerKeySerializer(v)
		}
		if (!keyDefinition.meta) {
			typeJson[k] = json[k]
		}
	}
	if (!ctx.prereduced) {
		if (implementation.reduce) {
			const reduced = implementation.reduce(inner, ctx)
			if (reduced) {
				return reduced as never
			}
		}
	}
	const innerEntries = entriesOf(inner)
	let collapsibleJson = json
	if (
		innerEntries.length === 1 &&
		innerEntries[0][0] === implementation.collapseKey
	) {
		collapsibleJson = json[implementation.collapseKey] as never
		if (hasDomain(collapsibleJson, "object")) {
			json = collapsibleJson
			typeJson = collapsibleJson
		}
	}
	const id = kind + JSON.stringify(json)
	if (id in nodeCache) {
		return nodeCache[id] as never
	}
	const typeId = kind + JSON.stringify(typeJson)
	if (
		BaseNode.isInitialized &&
		BaseNode.builtins.unknownUnion.typeId === typeId
	) {
		return BaseNode.builtins.unknown as never
	}
	const attachments = {
		kind,
		inner,
		entries: innerEntries,
		json,
		typeJson,
		collapsibleJson,
		children,
		id,
		typeId
	} satisfies Record<keyof BaseAttachments<any>, unknown>
	return includes(refinementKinds, kind)
		? new (BaseNode as any)(attachments)
		: new (RootNode as any)(attachments)
}

function rootKindOfSchema(schema: unknown): RootKind {
	const basisKind = maybeGetBasisKind(schema)
	if (basisKind) {
		return basisKind
	}
	if (typeof schema === "object" && schema !== null) {
		if (schema instanceof BaseNode) {
			if (schema.isRoot()) {
				return schema.kind
			}
			// otherwise, error at end of function
		} else if ("morph" in schema) {
			return "morph"
		} else if ("branches" in schema || isArray(schema)) {
			return "union"
		} else {
			return "intersection"
		}
	}
	return throwParseError(`${schema} is not a valid root schema type`)
}

export type reducibleKindOf<kind extends NodeKind> = kind extends "union"
	? RootKind
	: kind extends "intersection"
	  ? ValidatorKind
	  : kind

const extractBasis = (branch: Node<BranchKind>) =>
	branch.kind === "morph"
		? extractValidatorBasis(branch.in)
		: extractValidatorBasis(branch)

const extractValidatorBasis = (validator: Node<ValidatorKind>) =>
	validator.kind === "intersection" ? validator.basis : validator
