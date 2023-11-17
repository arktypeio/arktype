import {
	CompiledFunction,
	DynamicBase,
	entriesOf,
	hasDomain,
	includes,
	isArray,
	throwInternalError,
	throwParseError,
	type Json,
	type conform
} from "@arktype/util"
import { maybeGetBasisKind, type BasisKind } from "./bases/basis.ts"
import type {
	ClosedConstraintKind,
	ConstraintKind,
	OpenConstraintKind
} from "./constraints/constraint.ts"
import { In, compileSerializedValue } from "./io/compile.ts"
import { arkKind, registry } from "./io/registry.ts"
import { unflattenRules } from "./sets/intersection.ts"
import type { ValidatorKind, ValidatorNode } from "./sets/morph.ts"
import type {
	BranchKind,
	parseSchemaBranches,
	validateSchemaBranch
} from "./sets/union.ts"
import { createBuiltins, type Builtins } from "./shared/builtins.ts"
import type { BaseAttributes } from "./shared/declare.ts"
import {
	basisKinds,
	closedConstraintKinds,
	constraintKinds,
	openConstraintKinds,
	rootKinds,
	ruleKinds,
	setKinds,
	type NodeKind,
	type Root,
	type RootKind,
	type RuleKind,
	type SetKind,
	type UnknownNodeImplementation
} from "./shared/define.ts"
import { Disjoint } from "./shared/disjoint.ts"
import { leftOperandOf, type intersectionOf } from "./shared/intersect.ts"
import {
	NodeImplementationByKind,
	type Attachments,
	type Inner,
	type Node,
	type Schema
} from "./shared/node.ts"
import { inferred } from "./shared/symbols.ts"

export type UnknownNode = BaseNode<any>

export type NodeParser = {
	<branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: validateSchemaBranch<branches[i]>
		}
	): parseSchemaBranches<branches>
}

const parseRoot: NodeParser = (...branches) =>
	BaseNode.parseSchema("union", branches, createParseContext()) as never

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
	const union = uniqueValues.map((unit) =>
		BaseNode.parsePrereduced("unit", { is: unit })
	)
	if (union.length === 1) {
		return union[0]
	}
	return BaseNode.parsePrereduced("union", {
		union
	}) as never
}

export const node = Object.assign(parseRoot, {
	units: parseUnits
})

const $ark = registry()

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

export class BaseNode<
	kind extends NodeKind = NodeKind,
	t = unknown
> extends DynamicBase<Inner<kind> & Attachments<kind> & BaseAttachments<kind>> {
	// TODO: standardize name with type
	declare infer: t;
	declare [inferred]: t;
	readonly [arkKind] = "node"

	readonly ctor = BaseNode
	protected readonly implementation: UnknownNodeImplementation =
		NodeImplementationByKind[this.kind] as never
	readonly includesMorph: boolean =
		this.kind === "morph" || this.children.some((child) => child.includesMorph)
	readonly references = this.children.flatMap(
		(child) => child.contributesReferences
	)
	readonly contributesReferences: readonly UnknownNode[] = [
		this,
		...this.references
	]
	readonly allows: (data: unknown) => data is t
	readonly alias: string = $ark.register(this, this.inner.alias)
	readonly description: string

	static parsePrereduced<kind extends NodeKind>(
		kind: kind,
		schema: Schema<kind>
	): Node<kind> {
		const ctx = createParseContext()
		ctx.prereduced = true
		return this.parseSchema(kind, schema, ctx) as never
	}

	static parseSchema<schemaKind extends NodeKind>(
		allowedKinds: schemaKind | readonly conform<schemaKind, RootKind>[],
		schema: Schema<schemaKind>,
		ctx: ParseContext
	): Node<reducibleKindOf<schemaKind>> {
		const kind =
			typeof allowedKinds === "string" ? allowedKinds : rootKindOfSchema(schema)
		if (isArray(allowedKinds) && !allowedKinds.includes(kind as never)) {
			return throwParseError(`Schema of kind ${kind} should be ${allowedKinds}`)
		}
		if (schema instanceof BaseNode) {
			return schema as never
		}
		const implementation: UnknownNodeImplementation = NodeImplementationByKind[
			kind
		] as never
		const normalizedSchema: any = implementation.normalize?.(schema) ?? schema
		const childContext =
			implementation.updateContext?.(normalizedSchema, ctx) ?? ctx
		const schemaEntries = entriesOf(normalizedSchema)
		const inner: Record<string, unknown> = {}
		let json: Record<string, unknown> = {}
		let typeJson: Record<string, unknown> = {}
		const children: UnknownNode[] = []
		for (const [k, v] of schemaEntries) {
			const keyDefinition = implementation.keys[k]
			if (!(k in implementation.keys)) {
				return throwParseError(`Key ${k} is not valid on ${kind} schema`)
			}
			const innerValue = keyDefinition.parse
				? keyDefinition.parse(v, childContext)
				: v
			if (innerValue === undefined && !keyDefinition.preserveUndefined) {
				continue
			}
			inner[k] = innerValue
			if (innerValue instanceof BaseNode) {
				json[k] = innerValue.collapsibleJson
				children.push(innerValue)
			} else if (
				isArray(innerValue) &&
				innerValue.every((_): _ is UnknownNode => _ instanceof BaseNode)
			) {
				json[k] = innerValue.map((node) => node.collapsibleJson)
				children.push(...innerValue)
			} else {
				json[k] = defaultValueSerializer(v)
			}
			if (!keyDefinition.meta) {
				typeJson[k] = json[k]
			}
		}
		for (const k of implementation.defaultableKeys) {
			if (inner[k] === undefined) {
				const defaultableDefinition = implementation.keys[k]
				inner[k] = defaultableDefinition.parse!(undefined, childContext)
				json[k] = defaultValueSerializer(inner[k])
				if (!defaultableDefinition.meta) {
					typeJson[k] = json[k]
				}
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
		const id = JSON.stringify(json)
		const typeId = JSON.stringify(typeJson)
		if (this.#builtins?.unknownUnion.typeId === typeId) {
			return this.#builtins.unknown as never
		}
		const innerEntries = entriesOf(inner)
		let collapsibleJson = json
		if (innerEntries.length === 1 && innerEntries[0][0] === kind) {
			collapsibleJson = json[kind] as never
			if (hasDomain(collapsibleJson, "object")) {
				json = collapsibleJson
				typeJson = collapsibleJson
			}
		}
		return new BaseNode({
			kind,
			inner: inner as never,
			entries: innerEntries as never,
			json: json as Json,
			typeJson: typeJson as Json,
			collapsibleJson: collapsibleJson as Json,
			children,
			id,
			typeId
		}) as never
	}

	private constructor(baseAttachments: BaseAttachments<kind>) {
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
		// important this is last as writeDefaultDescription could rely on attached
		Object.assign(this, attachments)
		this.allows = new CompiledFunction(
			In,
			this.isRule()
				? `return ${this.condition}`
				: (this as {} as Node<SetKind>).compile({
						successKind: "true",
						failureKind: "false"
				  })
		)
		this.description ??= this.implementation.writeDefaultDescription(
			this as never
		)
	}

	inCache?: UnknownNode;
	get in(): this["kind"] extends "morph" ? ValidatorNode : UnknownNode {
		if (!this.inCache) {
			this.inCache = this.getIo("in")
		}
		return this.inCache as never
	}

	outCache?: UnknownNode
	get out(): this["kind"] extends "morph" ? ValidatorNode : UnknownNode {
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
		return BaseNode.parseSchema(this.kind, ioInner, createParseContext())
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

	isClosedConstraint(): this is Node<ClosedConstraintKind> {
		return includes(closedConstraintKinds, this.kind)
	}

	isOpenConstraint(): this is Node<OpenConstraintKind> {
		return includes(openConstraintKinds, this.kind)
	}

	isConstraint(): this is Node<ConstraintKind> {
		return includes(constraintKinds, this.kind)
	}

	isRoot(): this is Node<RootKind> {
		return includes(rootKinds, this.kind)
	}

	isRule(): this is Node<RuleKind> {
		return includes(ruleKinds, this.kind)
	}

	isSet(): this is Node<SetKind> {
		return includes(setKinds, this.kind)
	}

	toString() {
		return this.description
	}

	// TODO: add input kind, caching
	intersect<other extends Node>(
		other: other
	): intersectionOf<kind, other["kind"]>
	intersect(other: UnknownNode): UnknownNode | Disjoint {
		const closedResult = this.intersectClosed(other as never)
		if (closedResult !== null) {
			return closedResult as UnknownNode | Disjoint
		}
		if (!this.isRule() || !other.isRule()) {
			return throwInternalError(
				`Unexpected null intersection between non-rules ${this.kind} and ${other.kind}`
			)
		}
		return BaseNode.parseSchema(
			"intersection",
			unflattenRules([this as never, other]) as never,
			createParseContext()
		)
	}

	intersectClosed<other extends Node>(
		other: other
	): BaseNode<kind> | Node<other["kind"]> | Disjoint | null {
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
			return BaseNode.parseSchema(l.kind, result, createParseContext()) as never
		}
		return null
	}

	constrain<constraintKind extends ConstraintKind>(
		this: Node<RootKind>,
		kind: constraintKind,
		definition: Schema<constraintKind>
	): Exclude<intersectionOf<this["kind"], constraintKind>, Disjoint> {
		const result: Disjoint | UnknownNode = this.intersect(
			BaseNode.parseSchema(
				kind,
				definition as never,
				createParseContext()
			) as any
		)
		return result instanceof Disjoint ? result.throw() : (result as never)
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
		const lBranches = (
			this.hasKind("union") ? this.union : [this]
		) as Node<BranchKind>[]
		const rBranches = (
			other.hasKind("union") ? other.union : [other]
		) as Node<BranchKind>[]
		return BaseNode.parseSchema(
			"union",
			[...lBranches, ...rBranches],
			createParseContext()
		) as never
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

	array(): BaseNode<"intersection", t[]> {
		return this as never
	}

	extends<other extends Node>(
		other: other
	): this is Node<kind, other["infer"]> {
		const intersection = this.intersect(other)
		return (
			!(intersection instanceof Disjoint) && this.equals(intersection as never)
		)
	}

	static #builtins: Builtins | undefined
	static get builtins() {
		if (!this.#builtins) {
			this.#builtins = createBuiltins()
		}
		return this.#builtins
	}
}

export type reducibleKindOf<kind extends NodeKind> = kind extends "union"
	? RootKind
	: kind extends "intersection"
	  ? ValidatorKind
	  : kind

const defaultValueSerializer = (v: unknown) => {
	if (
		typeof v === "string" ||
		typeof v === "boolean" ||
		typeof v === "number" ||
		v === null
	) {
		return v
	}
	return compileSerializedValue(v)
}

export type ParseContext = {
	ctor: typeof BaseNode
	basis: Node<BasisKind> | undefined
	prereduced?: true
}

export function createParseContext(): ParseContext {
	return {
		ctor: BaseNode,
		basis: undefined
	}
}

export const rootKindOfSchema = (schema: unknown): RootKind => {
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
		} else if ("union" in schema || isArray(schema)) {
			return "union"
		} else {
			return "intersection"
		}
	}
	return throwParseError(`${schema} is not a valid root schema type`)
}

// static from<const branches extends readonly unknown[]>(
// 	schema: {
// 		branches: {
// 			[i in keyof branches]: validateBranchInput<branches[i]>
// 		}
// 	} & ExpandedUnionSchema
// ) {
// 	return new UnionNode<inferNodeBranches<branches>>({
// 		...schema,
// 		branches: schema.branches.map((branch) => branch as never)
// 	})
// }
