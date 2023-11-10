import {
	CastableBase,
	CompiledFunction,
	type Dict,
	type ErrorMessage,
	type evaluate,
	type extend,
	includes,
	isArray,
	isKeyOf,
	type Json,
	type JsonData,
	ParseError,
	type satisfy,
	throwInternalError,
	throwParseError
} from "@arktype/util"
import { type BasisKind } from "./bases/basis.ts"
import { type ConstraintKind } from "./constraints/constraint.ts"
import { Disjoint } from "./disjoint.ts"
import { compileSerializedValue, In } from "./io/compile.ts"
import { registry } from "./io/registry.ts"
import {
	type Attachments,
	type Inner,
	type Node,
	type NodeDeclarationsByKind,
	type NodeKind,
	type reifyIntersections,
	type RootInput,
	type RuleKind
} from "./nodes.ts"
import { type RootKind } from "./root.ts"
import { type ValidatorNode } from "./sets/morph.ts"
import { type SetKind } from "./sets/set.ts"
import { type parseUnion, type validateBranchSchema } from "./sets/union.ts"
import { inferred, type ParseContext } from "./utils.ts"

export type BaseAttributes = {
	readonly alias?: string
	readonly description?: string
	readonly prereduced?: true
}

export type withAttributes<o extends object> = extend<BaseAttributes, o>

export const setKinds = [
	"union",
	"morph",
	"intersection"
] as const satisfies readonly SetKind[]

export const basisKinds = [
	"unit",
	"proto",
	"domain"
] as const satisfies readonly BasisKind[]

export const constraintKinds = [
	"divisor",
	"max",
	"min",
	"pattern",
	"predicate",
	"required",
	"optional"
] as const satisfies readonly ConstraintKind[]

export const ruleKinds = [
	...basisKinds,
	...constraintKinds
] as const satisfies readonly RuleKind[]

export const orderedNodeKinds = [
	...setKinds,
	...ruleKinds
] as const satisfies readonly NodeKind[]

type OrderedNodeKinds = typeof orderedNodeKinds

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type assertIncludesAllKinds = satisfy<OrderedNodeKinds[number], NodeKind>

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type assertNoExtraKinds = satisfy<NodeKind, OrderedNodeKinds[number]>

export type BaseIntersectionMap = {
	[lKey in NodeKind]: evaluate<
		{
			[requiredKey in lKey]:
				| lKey
				| Disjoint
				| (lKey extends ConstraintKind ? null : never)
		} & {
			[rKey in rightOf<lKey> | "default"]?:
				| lKey
				| Disjoint
				| (lKey extends RuleKind ? null : never)
		}
	>
}

export const irreducibleConstraintKinds = {
	pattern: 1,
	predicate: 1,
	required: 1,
	optional: 1
} as const

export type IrreducibleConstraintKind = keyof typeof irreducibleConstraintKinds

export type UnknownNode = BaseNode<any>

export type DeclarationInput<kind extends NodeKind> = {
	kind: kind
	schema: unknown
	// each node's inner definition must have a required key with the same name
	// as its kind that can be used as a discriminator
	inner: BaseAttributes & { [k in kind]: unknown }
	intersections: BaseIntersectionMap[kind]
	attach: Dict
}

export type BaseNodeDeclaration = {
	kind: NodeKind
	schema: unknown
	inner: BaseAttributes
	intersections: {
		[k in NodeKind | "default"]?: NodeKind | Disjoint | null
	}
	attach: Dict
}

export type declareNode<
	types extends {
		[k in keyof BaseNodeDeclaration]: types extends {
			kind: infer kind extends NodeKind
		}
			? DeclarationInput<kind>[k]
			: never
	} & { [k in Exclude<keyof types, keyof BaseNodeDeclaration>]?: never }
> = types

export const defineNode = <
	kind extends NodeKind,
	definition extends NodeImplementation<NodeDeclarationsByKind[kind]>
>(
	definition: { kind: kind } & definition
): instantiateNodeClassDefinition<definition> => {
	Object.assign(definition.keys, {
		alias: {
			meta: true
		},
		description: {
			meta: true
		}
	})
	return definition
}

type instantiateNodeClassDefinition<definition> = evaluate<
	definition & {
		keys: { [k in keyof BaseAttributes]: KeyDefinition }
	}
>

export type InnerKeyDefinitions<inner extends BaseAttributes = BaseAttributes> =
	{
		[k in Exclude<keyof inner, keyof BaseAttributes>]: KeyDefinition
	}

export type RuleAttachments = {
	readonly condition: string
}

export type KeyDefinition = {
	attachAs?: string
	meta?: boolean
}

export type NodeImplementation<
	d extends BaseNodeDeclaration = BaseNodeDeclaration
> = {
	kind: d["kind"]
	keys: InnerKeyDefinitions<d["inner"]>
	intersections: reifyIntersections<d["kind"], d["intersections"]>
	parseSchema: (schema: d["schema"], ctx: ParseContext) => d["inner"]
	writeDefaultDescription: (inner: d["inner"]) => string
	attach: (inner: d["inner"]) => {
		[k in unsatisfiedAttachKey<d["inner"], d["attach"]>]: d["attach"][k]
	}
}

type unsatisfiedAttachKey<inner, attach> = {
	[k in keyof attach]: k extends keyof inner
		? inner[k] extends attach[k]
			? never
			: k
		: k
}[keyof attach]

export type UnknownNodeClass = {
	new (inner: any, ctx?: ParseContext): UnknownNode
	definition: NodeImplementation
}

const $ark = registry()

const defaultValueSerializer = (v: unknown): JsonData => {
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

export class BaseNode<
	kind extends NodeKind = NodeKind,
	t = unknown
> extends CastableBase<Inner<kind> & Attachments<kind>> {
	// TODO: standardize name with type
	declare infer: t;
	declare [inferred]: t

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

	static from<branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: validateBranchSchema<branches[i]>
		}
	): parseUnion<branches>
	static from(...branches: RootInput[]) {
		const nodes = branches.map((schema) => {
			switch (typeof schema) {
				case "string":
					return new BaseNode("domain", { domain: schema })
				case "function":
					return new BaseNode("proto", { proto: schema })
				case "object":
					const kind = orderedNodeKinds.find((kind) => kind in schema)
					if (!kind) {
						return throwParseError(
							`Constraint schema must contain one of the following keys: ${constraintKinds.join(
								", "
							)}`
						)
					}
					return new BaseNode(schema as never, ctx)
				default:
					return throwParseError(`${typeof schema} is not a valid schema type`)
			}
		})

		// export const maybeParseBasis = (
		// 	schema: Schema<"intersection" | BasisKind>
		// ): Node<BasisKind> | undefined => {
		// 	switch (typeof schema) {
		// 		case "string":
		// 			return new DomainNode(schema)
		// 		case "function":
		// 			return new ProtoNode(schema)
		// 		case "object":
		// 			return "unit" in schema
		// 				? new UnitNode(schema)
		// 				: "proto" in schema
		// 				? new ProtoNode(schema)
		// 				: "domain" in schema
		// 				? new DomainNode(schema)
		// 				: undefined
		// 	}
		// }

		// export const parseBasis = (schema: Schema<BasisKind>) =>
		// 	maybeParseBasis(schema) ??
		// 	throwParseError(
		// 		`Basis schema must be a non-enumerable domain, a constructor, or have one of the following keys:
		// "unit", "proto", "domain"`
		// 	)

		// hasDomain(this.schema, "object") && "prevalidated" in this.schema
		// 	? this.schema
		// 	: this.definition.parseSchema(this.schema, ctx)
	}

	static fromUnits<const branches extends readonly unknown[]>(
		...values: branches
	) {
		const uniqueValues: unknown[] = []
		for (const value of values) {
			if (!uniqueValues.includes(value)) {
				uniqueValues.push(value)
			}
		}
		return new BaseNode<"union", branches[number]>("union", {
			union: uniqueValues.map((unit) => new BaseNode("unit", { unit })),
			ordered: false
		})
	}

	readonly alias: string
	protected readonly implementation: NodeImplementation
	readonly description: string
	readonly json: Json
	readonly typeJson: Json
	readonly children: UnknownNode[]
	readonly id: string
	readonly typeId: string
	readonly includesMorph: boolean
	readonly references: readonly UnknownNode[]
	readonly contributesReferences: readonly UnknownNode[]
	readonly condition: string
	readonly allows: (data: unknown) => data is t

	private constructor(
		public kind: kind,
		public inner: Inner<kind>
	) {
		super()
		this.alias = $ark.register(this, this.inner.alias)
		this.implementation = {}
		this.description =
			this.inner.description ??
			this.implementation.writeDefaultDescription(this.inner)
		this.json = {}
		this.typeJson = {}
		this.children = []
		for (const [k, v] of Object.entries<unknown>(this.inner)) {
			if (!isKeyOf(k, this.implementation.keys)) {
				throw new ParseError(`'${k}' is not a valid ${this.kind} key`)
			}
			const keyDefinition = this.implementation.keys[k]!
			if (v instanceof BaseNode) {
				this.json[k] = v.json
				this.typeJson[k] = v.typeJson
				this.children.push(v)
			} else if (isArray(v)) {
				// avoid assuming all elements are nodes until we've been over them
				const jsonElements: JsonData[] = []
				const typeJsonElements: JsonData[] = []
				for (const element of v) {
					if (element instanceof BaseNode) {
						jsonElements.push(element.json)
						typeJsonElements.push(element.typeJson)
					} else {
						break
					}
				}
				if (jsonElements.length === v.length) {
					// all elements were nodes, add them to children and json
					this.children.push(...(v as UnknownNode[]))
					this.json[k] = jsonElements
					this.typeJson[k] = typeJsonElements
				}
			}
			if (this.json[k] === undefined) {
				this.json[k] = defaultValueSerializer(this.inner[k])
				if (!keyDefinition.meta) {
					this.typeJson[k] = this.json[k]
				}
			}
			;(this as any)[keyDefinition.attachAs ?? k] = this.inner[k]
		}
		this.id = JSON.stringify(this.json)
		this.typeId = JSON.stringify(this.typeJson)
		this.includesMorph =
			this.kind === "morph" ||
			this.children.some((child) => child.includesMorph)
		this.references = this.children.flatMap(
			(child) => child.contributesReferences
		)
		this.contributesReferences = [this, ...this.references]
		this.condition = this.implementation.compileCondition(this.inner)
		this.allows = new CompiledFunction(In, `return ${this.condition}`)
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
		for (const k in this.inner) {
			const keyDefinition = this.implementation.keys[k as keyof BaseAttributes]!
			const childrenAtKey = keyDefinition.children?.(this.inner[k])
			if (childrenAtKey) {
				ioInner[k] = isArray(childrenAtKey)
					? childrenAtKey.map((child) => child[kind])
					: childrenAtKey[kind]
			} else {
				ioInner[k] = this.inner[k]
			}
		}
		// TODO; reduce?
		return BaseNode.from(ioInner as never)
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

	isConstraint(): this is Node<ConstraintKind> {
		return includes(constraintKinds, this.kind)
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
		return new BaseNode("intersection", {
			intersection: [this as never, other]
		})
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
		const intersector = intersections[r.kind] ?? intersections.default
		const result = intersector?.(l as never, r as never)
		if (result) {
			if (result instanceof Disjoint) {
				return thisIsLeft ? result : result.invert()
			}
			// TODO: reduce
			// TODO: meta
			return new l.nodeClass(result as never) as never
		}
		return null
	}

	// constrain<kind extends ConstraintKind>(kind: kind, definition: Schema<kind>) {
	// 	const result = this.intersect(new BaseNode(definition as never))
	// 	return result instanceof Disjoint ? result.throw() : result
	// }

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
		return this.hasKind("intersection") && this.children.length === 0
	}

	isNever(): this is BaseNode<"union", never> {
		return this.hasKind("union") && this.children.length === 0
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

	subsumes<other extends Node>(
		other: other
	): other is Node<other["kind"], this["infer"]> {
		return other.extends(this as never)
	}
}

export const node = Object.assign(BaseNode.from, {
	units: BaseNode.fromUnits
})

const leftOperandOf = (l: UnknownNode, r: UnknownNode) => {
	for (const kind of orderedNodeKinds) {
		if (l.kind === kind) {
			return l
		} else if (r.kind === kind) {
			return r
		}
	}
	return throwInternalError(
		`Unable to order unknown node kinds '${l.kind}' and '${r.kind}'.`
	)
}

export type rightOf<kind extends NodeKind> = RightsByKind[kind]

export type RightsByKind = accumulateRightKinds<OrderedNodeKinds, {}>

type accumulateRightKinds<
	remaining extends readonly NodeKind[],
	result
> = remaining extends readonly [
	infer head extends NodeKind,
	...infer tail extends NodeKind[]
]
	? accumulateRightKinds<tail, result & { [k in head]: tail[number] }>
	: result

export type IntersectionMaps = {
	[k in NodeKind]: NodeDeclarationsByKind[k]["intersections"]
}

export type intersectionOf<l extends NodeKind, r extends NodeKind> = [
	l,
	r
] extends [r, l]
	? instantiateIntersection<l>
	: asymmetricIntersectionOf<l, r> | asymmetricIntersectionOf<r, l>

type asymmetricIntersectionOf<
	l extends NodeKind,
	r extends NodeKind
> = l extends unknown
	? r extends unknown
		? r extends keyof IntersectionMaps[l]
			? instantiateIntersection<IntersectionMaps[l][r]>
			: "default" extends keyof IntersectionMaps[l]
			? r extends rightOf<l>
				? instantiateIntersection<IntersectionMaps[l]["default"]>
				: never
			: never
		: r
	: never

type instantiateIntersection<result> = result extends NodeKind
	? Node<result>
	: result
