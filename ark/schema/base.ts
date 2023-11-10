import {
	CastableBase,
	CompiledFunction,
	type conform,
	type evaluate,
	type extend,
	hasDomain,
	includes,
	isArray,
	isKeyOf,
	type Json,
	type JsonData,
	ParseError,
	type satisfy,
	throwInternalError
} from "@arktype/util"
import { type BasisKind } from "./bases/basis.js"
import { type ConstraintKind } from "./constraints/constraint.js"
import { Disjoint } from "./disjoint.js"
import { compileSerializedValue, In } from "./io/compile.js"
import { registry } from "./io/registry.js"
import {
	type Inner,
	type Node,
	type NodeClass,
	type NodeDeclarationsByKind,
	type NodeKind,
	type reifyIntersections,
	type RuleKind,
	type Schema
} from "./nodes.js"
import { type ValidatorNode } from "./sets/morph.js"
import { type SetKind } from "./sets/set.js"
import { createParseContext, inferred, type ParseContext } from "./utils.js"

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
	definition extends StaticNodeDefinition<NodeDeclarationsByKind[kind]>
>(
	definition: { kind: kind } & definition
) => definition

export type BaseNodeDeclaration = {
	kind: NodeKind
	schema: unknown
	inner: BaseAttributes
	intersections: {
		[k in NodeKind | "default"]?: NodeKind | Disjoint | null
	}
}

export type InnerKeyDefinitions<inner extends BaseAttributes = BaseAttributes> =
	{
		[k in Exclude<keyof inner, keyof BaseAttributes>]: KeyDefinition<inner[k]>
	}

export type KeyDefinition<innerValue = unknown> = {
	attachAs?: string
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
}

export type UnknownNodeClass = {
	new (inner: any, ctx?: ParseContext): UnknownNode
	definition: StaticNodeDefinition
}

type instantiateNodeClassDefinition<definition> = evaluate<
	definition & {
		keys: { [k in keyof BaseAttributes]: KeyDefinition }
	}
>

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

export class BaseNode<
	kind extends NodeKind = NodeKind,
	t = unknown
> extends CastableBase<Inner<kind>> {
	// TODO: standardize name with type
	declare infer: t;
	declare [inferred]: t

	// TODO: reduce, add param for unsafe
	constructor(
		public schema: Schema<kind>,
		ctx = createParseContext()
	) {
		super()
		if (schema instanceof BaseNode) {
			// return schema.kind === this.kind
			// 	? schema
			// 	: throwParseError(
			// 			`Node of kind ${schema.kind} is not valid as input for node of kind ${this.kind}`
			// 	  )
		}
		this.initialize()
	}

	readonly nodeClass = this.constructor as UnknownNodeClass
	readonly definition = this.nodeClass
		.definition as {} as instantiateNodeClassDefinition<StaticNodeDefinition>
	readonly kind: kind = "divisor"
	readonly inner: Inner<kind> =
		hasDomain(this.schema, "object") && "prevalidated" in this.schema
			? this.schema
			: this.definition.parseSchema(this.schema, ctx)
	readonly alias = $ark.register(this, this.inner.alias)
	readonly description =
		this.inner.description ??
		this.definition.writeDefaultDescription(this.inner)
	readonly json: Json = {}
	readonly typeJson: Json = {}
	readonly children: UnknownNode[] = []
	readonly id = JSON.stringify(this.json)
	readonly typeId = JSON.stringify(this.typeJson)
	readonly includesMorph: boolean =
		this.kind === "morph" || this.children.some((child) => child.includesMorph)
	readonly references: readonly UnknownNode[] = this.children.flatMap(
		(child) => child.contributesReferences
	)
	readonly contributesReferences: readonly UnknownNode[] = [
		this,
		...this.references
	]
	readonly condition = this.definition.compileCondition(this.inner)
	readonly allows = new CompiledFunction<(data: unknown) => data is t>(
		In,
		`return ${this.condition}`
	)

	private initialize() {
		for (const [k, v] of Object.entries<unknown>(this.inner)) {
			if (!isKeyOf(k, this.definition.keys)) {
				throw new ParseError(`'${k}' is not a valid ${this.kind} key`)
			}
			const keyDefinition = this.definition.keys[k]!
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
			StaticNodeDefinition<declarationOf<nodeClass>>
		>
	): definition {
		// register the newly defined node class
		;(this as any).classesByKind[definition.kind] = this
		return {
			...definition,
			keys: {
				alias: {
					meta: true
				},
				description: {
					meta: true
				},
				...definition.keys
			}
		} as never
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
		// TODO; reduce?
		return new this.nodeClass(ioInner as never)
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
	intersect<other extends BaseNode>(
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
		return new BaseNode({
			intersection: [this, other]
		})
	}

	intersectClosed<other extends BaseNode>(
		other: other
	): BaseNode<kind> | Node<other["kind"]> | Disjoint | null {
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
			// TODO: reduce
			// TODO: meta
			return new l.nodeClass(result as never) as never
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
