import {
	CompiledFunction,
	DynamicBase,
	entriesOf,
	hasDomain,
	includes,
	isArray,
	listFrom,
	stringify,
	throwInternalError,
	throwParseError,
	type Json
} from "@arktype/util"
import type { BasisKind } from "./bases/basis.ts"
import type {
	ClosedConstraintKind,
	ConstraintKind,
	OpenConstraintKind
} from "./constraints/constraint.ts"
import { In, compileSerializedValue } from "./io/compile.ts"
import { registry } from "./io/registry.ts"
import { unflattenRules } from "./sets/intersection.ts"
import type { ValidatorNode } from "./sets/morph.ts"
import type { parseSchemaBranches, validateSchemaBranch } from "./sets/union.ts"
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
	BaseNode.parseSchemaKind("union", branches) as never

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
	return BaseNode.parseSchemaKind("union", {
		union: uniqueValues.map((unit) =>
			BaseNode.parseSchemaKind("unit", { is: unit })
		)
	})
}

export const node = Object.assign(parseRoot, {
	units: parseUnits
})

const $ark = registry()

export type BaseAttachments<kind extends NodeKind> = {
	readonly kind: kind
	readonly inner: Inner<kind>
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
	declare [inferred]: t

	readonly ctor = BaseNode
	protected readonly implementation: UnknownNodeImplementation =
		NodeImplementationByKind[this.kind] as never
	readonly entries: entriesOf<Inner<kind>> = entriesOf(this.inner)
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

	static parseSchemaKind<kind extends NodeKind>(
		kind: kind,
		schema: Schema<kind>,
		ctx = createParseContext()
		// TODO: or reduction of kind
	): UnknownNode {
		if (schema instanceof BaseNode) {
			if (schema.hasKind(kind)) {
				return schema
			}
			return throwParseError(
				`${schema.kind} node is not valid as a ${kind} schema`
			)
		}
		const implementation: UnknownNodeImplementation = NodeImplementationByKind[
			kind
		] as never
		const expandedSchema = implementation.expand?.(schema) ?? {
			...(schema as any)
		}
		const childContext =
			implementation.updateContext?.(expandedSchema, ctx) ?? ctx
		const schemaEntries = entriesOf(expandedSchema)
		const inner: Record<string, unknown> = {}
		let json: Record<string, unknown> = {}
		let typeJson: Record<string, unknown> = {}
		const children: UnknownNode[] = []
		for (const [k, v] of schemaEntries) {
			const keyDefinition = implementation.keys[k]
			if (!(k in implementation.keys)) {
				return throwParseError(`Key ${k} is not valid on ${kind} schema`)
			}
			if (keyDefinition.children) {
				const innerKeyChildren = listFrom(v).map((child) => {
					if (typeof keyDefinition.children === "string") {
						return this.parseSchemaKind(
							keyDefinition.children,
							child,
							childContext
						)
					}
					const rootKind = rootKindOfSchema(child)
					if (!keyDefinition.children!.includes(rootKind)) {
						return throwParseError(
							`Schema ${stringify(
								child
							)} of kind ${rootKind} is not allowed here. Valid kinds are: ${
								keyDefinition.children
							}`
						)
					}
					return this.parseSchemaKind(rootKind, child, childContext)
				})
				if (isArray(v)) {
					inner[k] = innerKeyChildren
					json[k] = innerKeyChildren.map((child) => child.collapsibleJson)
					typeJson[k] = innerKeyChildren.map((child) => child.collapsibleJson)
					children.push(...innerKeyChildren)
				} else {
					inner[k] = innerKeyChildren[0]
					json[k] = innerKeyChildren[0].collapsibleJson
					typeJson[k] = innerKeyChildren[0].collapsibleJson
					children.push(innerKeyChildren[0])
				}
			} else {
				inner[k] = keyDefinition.parse
					? keyDefinition.parse(v, childContext)
					: v
				json[k] = defaultValueSerializer(v)
				if (!keyDefinition.meta) {
					typeJson[k] = json[k]
				}
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
		const id = JSON.stringify(json)
		const typeId = JSON.stringify(typeJson)
		const reducedInner = implementation.reduce?.(inner) ?? inner
		if (reducedInner instanceof BaseNode) {
			return reducedInner
		}
		let collapsibleJson = json
		if (
			Object.keys(expandedSchema).length === 1 &&
			// the presence expand function indicates a single default key that is collapsible
			// this helps avoid nodes like `unit` which would otherwise be indiscriminable
			implementation.expand
		) {
			collapsibleJson = json[kind] as never
			if (hasDomain(collapsibleJson, "object")) {
				json = collapsibleJson
				typeJson = collapsibleJson
			}
		}
		return new BaseNode({
			kind,
			inner,
			json: json as Json,
			typeJson: typeJson as Json,
			collapsibleJson: collapsibleJson as Json,
			children,
			id,
			typeId
		})
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
			if (keyDefinition.children) {
				ioInner[k] = Array.isArray(v)
					? v.map((child) => child[kind])
					: (v as UnknownNode)[kind]
			} else if (!keyDefinition.meta) {
				ioInner[k] = this.inner[k]
			}
		}
		return BaseNode.parseSchemaKind(this.kind, ioInner)
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
		return BaseNode.parseSchemaKind(
			"intersection",
			unflattenRules([this as never, other]) as never
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
			return BaseNode.parseSchemaKind(l.kind, result) as never
		}
		return null
	}

	constrain<constraintKind extends ConstraintKind>(
		this: Node<RootKind>,
		kind: constraintKind,
		definition: Schema<constraintKind>
	): Exclude<intersectionOf<this["kind"], constraintKind>, Disjoint> {
		const result = this.intersect(
			BaseNode.parseSchemaKind(kind, definition as never)
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

	or<other extends Node>(
		other: other
	): Node<
		"union" | Extract<kind | other["kind"], RootKind>,
		t | other["infer"]
	> {
		return this as never
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

	// TODO: this shouldn't be attached here. Use ArkKind to allow checking for BaseNode?
	static getBasisKindOrThrow(schema: unknown) {
		const basisKind = maybeGetBasisKind(schema)
		if (basisKind === undefined) {
			return throwParseError(
				`${stringify(
					schema
				)} is not a valid basis schema. Please provide one of the following:
					- A string representing a non-enumerable domain ("string", "number", "object", "bigint", or "symbol")
					- A constructor like Array
					- A schema object with one of the following keys:
					- "domain"
					- "proto"
					- "is"`
			)
		}
		return basisKind
	}
}

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

export const maybeGetBasisKind = (schema: unknown): BasisKind | undefined => {
	switch (typeof schema) {
		case "string":
			return "domain"
		case "function":
			return "proto"
		case "object":
			if (schema === null) {
				return
			}
			if (schema instanceof BaseNode) {
				if (schema.isBasis()) {
					return schema.kind
				}
			}
			if ("domain" in schema) {
				return "domain"
			} else if ("proto" in schema) {
				return "proto"
			} else if ("is" in schema) {
				return "unit"
			}
	}
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
