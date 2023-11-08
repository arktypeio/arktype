import {
	CompiledFunction,
	type conform,
	DynamicBase,
	type evaluate,
	type extend,
	includes,
	isArray,
	isKeyOf,
	type Json,
	type JsonData,
	type listable,
	type merge,
	ParseError,
	type satisfy,
	throwInternalError,
	transform
} from "@arktype/util"
import { type BasisKind } from "./bases/basis.js"
import { type ConstraintKind } from "./constraints/constraint.js"
import { Disjoint } from "./disjoint.js"
import { compileSerializedValue, In } from "./io/compile.js"
import { registry } from "./io/registry.js"
import {
	type Node,
	type NodeClass,
	type NodeDeclarationsByKind,
	type NodeKind,
	type reducibleParseResult,
	type reifyIntersections,
	type RuleKind
} from "./nodes.js"
import { type ValidatorNode } from "./sets/morph.js"
import { type SetKind } from "./sets/set.js"
import { createParseContext, inferred, type ParseContext } from "./utils.js"

export type BaseAttributes = {
	readonly alias?: string
	readonly description?: string
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
	reductions?: kind | rightOf<kind>
}

export type BaseDeclarationInput = {
	kind: NodeKind
	schema: unknown
	inner: BaseAttributes
	intersections: {
		[k in NodeKind | "default"]?: NodeKind | Disjoint | null
	}
	reductions?: NodeKind
}

export type declareNode<
	types extends {
		[k in keyof BaseDeclarationInput]: types extends {
			kind: infer kind extends NodeKind
		}
			? DeclarationInput<kind>[k]
			: never
	} & { [k in Exclude<keyof types, keyof BaseDeclarationInput>]?: never }
> = types &
	("reductions" extends keyof types
		? unknown
		: { reductions: types["kind" & keyof types] })

export type BaseNodeDeclaration = BaseDeclarationInput & { reductions: {} }

export type InnerKeyDefinitions<inner extends BaseAttributes = BaseAttributes> =
	{
		[k in Exclude<keyof inner, keyof BaseAttributes>]: KeyDefinition<inner[k]>
	}

export type KeyDefinition<innerValue = unknown> = {
	children?: (innerValue: innerValue) => listable<UnknownNode>
	serialize?: (innerValue: innerValue) => JsonData
	meta?: boolean
}

export type StaticNodeDefinition<
	d extends BaseNodeDeclaration = BaseNodeDeclaration
> = {
	kind: d["kind"]
	keys: InnerKeyDefinitions<d["inner"]>
	intersections: reifyIntersections<d["kind"], d["intersections"]>
	parseSchema: (schema: d["schema"], ctx: ParseContext) => d["inner"]
	writeDefaultDescription: (inner: d["inner"]) => string
	compileCondition: (inner: d["inner"]) => string
	reduceToNode?: (inner: d["inner"]) => Node<d["reductions"]>
} & (d["reductions"] extends d["kind"] ? unknown : { reduceToNode: {} })

type instantiateNodeClassDefinition<definition> = {
	[k in keyof definition]: k extends "keys"
		? evaluate<
				{
					[k2 in keyof definition[k]]: merge<
						{ serialize: typeof defaultValueSerializer },
						definition[k]
					>
				} & {
					[k in keyof BaseAttributes]: KeyDefinition
				}
		  >
		: definition[k]
}

type declarationOf<nodeClass> = nodeClass extends {
	declaration: infer declaration extends BaseNodeDeclaration
}
	? declaration
	: never

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

export abstract class BaseNode<
	declaration extends BaseNodeDeclaration,
	t = unknown
> extends DynamicBase<declaration["inner"]> {
	// TODO: standardize name with type
	declare infer: t;
	declare [inferred]: t

	readonly nodeClass = this.constructor as NodeClass<declaration["kind"]>
	readonly definition = this.nodeClass
		.definition as {} as instantiateNodeClassDefinition<StaticNodeDefinition>
	readonly json: Json
	readonly typeJson: Json
	readonly id: string
	readonly typeId: string
	// TODO: type
	readonly children: readonly UnknownNode[]
	readonly references: readonly UnknownNode[]
	readonly includesMorph: boolean
	protected readonly contributesReferences: readonly UnknownNode[]
	readonly alias: string
	readonly description: string
	readonly condition: string
	readonly kind: BaseNodeDeclaration extends declaration
		? NodeKind
		: declaration["kind"] = this.definition.kind
	readonly allows: (data: unknown) => data is t

	// TODO: reduce, add param for unsafe
	constructor(public readonly inner: declaration["inner"]) {
		const { in: inCache, out: outCache, ...rest } = inner as any
		super(rest)
		this.inCache = inCache
		this.outCache = outCache
		this.alias = $ark.register(this, inner.alias)
		this.description =
			inner.description ?? this.definition.writeDefaultDescription(inner)
		this.json = {}
		this.typeJson = {}
		const children: UnknownNode[] = []
		for (const k in inner) {
			if (!isKeyOf(k, this.definition.keys)) {
				throw new ParseError(`'${k}' is not a valid ${this.kind} key`)
			}
			const keyDefinition = this.definition.keys[k]
			const childrenAtKey = keyDefinition.children?.(inner[k])

			if (childrenAtKey) {
				if (isArray(childrenAtKey)) {
					children.push(...childrenAtKey)
					this.json[k] = childrenAtKey.map((child) => child.json)
					this.typeJson[k] = childrenAtKey.map((child) => child.typeJson)
				} else {
					children.push(childrenAtKey)
					this.json[k] = childrenAtKey.json
					this.typeJson[k] = childrenAtKey.typeJson
				}
			} else {
				this.json[k] = keyDefinition.serialize(inner[k])
				if (!keyDefinition.meta) {
					this.typeJson[k] = keyDefinition.serialize(inner[k])
				}
			}
		}
		this.id = JSON.stringify(this.json)
		this.typeId = JSON.stringify(this.typeJson)
		this.children = children
		this.includesMorph = this.children.some((child) => child.includesMorph)
		this.references = this.children.flatMap(
			(child) => child.contributesReferences
		)
		this.condition = this.definition.compileCondition(inner)
		this.contributesReferences = [this, ...this.references]
		this.allows = new CompiledFunction(
			BaseNode.argName,
			`return ${this.condition}`
		)
	}

	/**
	 * Each node class is attached when it is imported.
	 * This helps avoid circular import issues that can otherwise occur.
	 */
	static classesByKind = {} as { [k in NodeKind]: NodeClass<k> }

	protected static define<nodeClass, definition>(
		this: nodeClass,
		definition: conform<
			definition,
			/** @ts-expect-error (trying to constrain further breaks types or causes circularities) */
			StaticNodeDefinition<nodeClass["declaration"]>
		>
	) {
		// register the newly defined node class
		;(this as any).classesByKind[definition.kind] = this
		return {
			...definition,
			keys: {
				alias: {
					serialize: defaultValueSerializer,
					meta: true
				},
				description: {
					serialize: defaultValueSerializer,
					meta: true
				},
				...transform(definition.keys, ([k, v]) => [
					k,
					{
						serialize: defaultValueSerializer,
						...v
					}
				])
			}
		} as instantiateNodeClassDefinition<definition>
	}

	static parse<nodeClass>(
		this: nodeClass,
		schema: declarationOf<nodeClass>["schema"],
		ctx = createParseContext()
	): reducibleParseResult<declarationOf<nodeClass>["kind"]> {
		const definition = (this as any).definition as StaticNodeDefinition
		const inner = definition.parseSchema(schema, ctx)
		return definition.reduceToNode?.(inner) ?? new (this as any)(inner)
	}

	protected static readonly argName = In

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
			const keyDefinition = this.definition.keys[k as keyof BaseAttributes]!
			const childrenAtKey = keyDefinition.children?.(this.inner[k])
			if (childrenAtKey) {
				ioInner[k] = isArray(childrenAtKey)
					? childrenAtKey.map((child) => child[kind])
					: childrenAtKey[kind]
			} else {
				ioInner[k] = this.inner[k]
			}
		}
		return (
			this.definition.reduceToNode?.(ioInner) ??
			new (this.nodeClass as any)(ioInner)
		)
	}

	toJSON() {
		return this.json
	}

	equals(other: UnknownNode) {
		return this.typeId === other.typeId
	}

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === kind
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
	): intersectionOf<declaration["kind"], other["kind"]>
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
		return new BaseNode.classesByKind.intersection({
			intersection: [this, other]
		})
	}

	intersectClosed<other extends Node>(
		other: other
	): Node<this["kind"]> | Node<other["kind"]> | Disjoint | null {
		if (this.equals(other)) {
			// TODO: meta
			return this as never
		}
		const l = leftOperandOf(this, other)
		const thisIsLeft = l === this
		const r: UnknownNode = thisIsLeft ? other : this
		const intersections = l.definition.intersections
		const intersector = intersections[r.kind] ?? intersections.default
		const result = intersector?.(l as never, r as never)
		if (result) {
			if (result instanceof Disjoint) {
				return thisIsLeft ? result : result.invert()
			}
			// TODO: meta, use kind entry?
			return new (l.nodeClass as any)(result)
		}
		return null
	}
}

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
			: "rule" extends keyof IntersectionMaps[l]
			? r extends RuleKind
				? instantiateIntersection<IntersectionMaps[l]["rule"]>
				: never
			: "constraint" extends keyof IntersectionMaps[l]
			? r extends ConstraintKind
				? instantiateIntersection<IntersectionMaps[l]["constraint"]>
				: never
			: never
		: r
	: never

type instantiateIntersection<result> = result extends NodeKind
	? reducibleParseResult<result>
	: result
