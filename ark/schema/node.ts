import {
	CompiledFunction,
	DynamicBase,
	includes,
	isArray,
	stringify,
	throwInternalError,
	throwParseError
} from "@arktype/util"
import { basisKinds, type BasisKind } from "./bases/basis.ts"
import {
	constraintKinds,
	type ConstraintKind
} from "./constraints/constraint.ts"
import { In } from "./io/compile.ts"
import { registry } from "./io/registry.ts"
import { unflattenRules } from "./main.ts"
import { parseNodeKind, type BaseAttachments } from "./parse.ts"
import type { ValidatorNode } from "./sets/morph.ts"
import { setKinds, type SetKind } from "./sets/set.ts"
import type { BaseAttributes } from "./shared/declare.ts"
import { Disjoint } from "./shared/disjoint.ts"
import {
	leftOperandOf,
	type intersectionOf,
	type rightOf
} from "./shared/intersect.ts"
import type {
	Attachments,
	Inner,
	Node,
	NodeKind,
	Schema
} from "./shared/node.ts"
import { rootKinds, type RootKind } from "./shared/root.ts"
import { ruleKinds, type RuleKind } from "./shared/rule.ts"
import { inferred } from "./shared/symbols.ts"

export type UnknownNode = BaseNode<any>

const $ark = registry()

export class BaseNode<
	kind extends NodeKind = NodeKind,
	t = unknown
> extends DynamicBase<Inner<kind> & Attachments<kind> & BaseAttachments<kind>> {
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

	static parseConstraint<kind extends ConstraintKind>(
		kind: kind,
		schema: Schema<kind>
	): Node<kind> {
		return parseNodeKind(kind, schema) as never
	}

	static parseRoot<kind extends RootKind>(
		schema: Schema<kind>,
		allowed: readonly kind[] = rootKinds as never
	): Node<RootKind & (kind | rightOf<kind>)> {
		return this.parseNode(allowed, schema) as never
	}

	protected static parseNode(
		allowed: readonly NodeKind[],
		schema: unknown
	): UnknownNode {
		// constraints should only ever have one kind
		if (allowed.length === 1) {
			return parseNodeKind(allowed[0], schema)
		}
		const kind = this.rootKindOfSchema(schema as never)
		if (!includes(allowed, kind)) {
			return throwParseError(
				`Schema ${stringify(
					schema
				)} of kind ${kind} is not allowed here. Valid kinds are: ${allowed}`
			)
		}
		return parseNodeKind(kind, schema) as never
	}

	static parseUnits<const branches extends readonly unknown[]>(
		values: branches
	) {
		const uniqueValues: unknown[] = []
		for (const value of values) {
			if (!uniqueValues.includes(value)) {
				uniqueValues.push(value)
			}
		}
		return new BaseNode<"union", branches[number]>("union", {
			union: uniqueValues.map((unit) => new BaseNode("unit", { is: unit }))
		})
	}

	readonly ctor = BaseNode
	readonly alias: string
	readonly description: string
	readonly includesMorph: boolean
	readonly references: readonly UnknownNode[]
	readonly contributesReferences: readonly UnknownNode[]
	readonly allows: (data: unknown) => data is t

	private constructor(baseAttachments: BaseAttachments<kind>) {
		super(baseAttachments)
		this.includesMorph =
			this.kind === "morph" ||
			this.children.some((child) => child.includesMorph)
		this.references = this.children.flatMap(
			(child) => child.contributesReferences
		)
		this.contributesReferences = [this, ...this.references]
		// const attachments = this.implementation.attach(this as never)
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
		this.alias = $ark.register(this, this.inner.alias)
		this.description =
			this.inner.description ??
			this.implementation.writeDefaultDescription(this as never)
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
		return BaseNode.parseRoot(ioInner) as never
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
		return new BaseNode("intersection", unflattenRules([this as never, other]))
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
			return parseNodeKind(l.kind, result)
		}
		return null
	}

	constrain<constraintKind extends ConstraintKind>(
		this: Node<RootKind>,
		kind: constraintKind,
		definition: Schema<constraintKind>
	): Exclude<intersectionOf<this["kind"], constraintKind>, Disjoint> {
		const result = this.intersect(
			new BaseNode(kind, definition as never) as {} as Node
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

	static rootKindOfSchema(schema: Schema<RootKind>): RootKind {
		switch (typeof schema) {
			case "string":
				return "domain"
			case "function":
				return "proto"
			case "object":
				if (schema instanceof BaseNode) {
					if (!includes(rootKinds, schema.kind)) {
						break
					}
					return schema.kind
				} else if ("domain" in schema) {
					return "domain"
				} else if ("proto" in schema) {
					return "proto"
				} else if ("is" in schema) {
					return "unit"
				} else if ("morph" in schema) {
					return "morph"
				} else if ("union" in schema || isArray(schema)) {
					return "union"
				}
				return "intersection"
		}
		return throwParseError(`${typeof schema} is not a valid schema type`)
	}

	static builtins = {
		unknown: new BaseNode<"intersection", unknown>("intersection", {}),
		bigint: new BaseNode<"domain", bigint>("domain", {
			domain: "bigint"
		}),
		number: new BaseNode<"domain", number>("domain", {
			domain: "number"
		}),
		object: new BaseNode<"domain", object>("domain", {
			domain: "object"
		}),
		string: new BaseNode<"domain", string>("domain", {
			domain: "string"
		}),
		symbol: new BaseNode<"domain", symbol>("domain", {
			domain: "symbol"
		}),
		array: new BaseNode<"proto", readonly unknown[]>("proto", {
			proto: Array
		}),
		date: new BaseNode<"proto", Date>("proto", { proto: Date }),
		false: new BaseNode<"unit", false>("unit", {
			is: false
		}),
		null: new BaseNode<"unit", null>("unit", {
			is: null
		}),
		undefined: new BaseNode<"unit", undefined>("unit", {
			is: undefined
		}),
		true: new BaseNode<"unit", true>("unit", {
			is: true
		}),
		never: new BaseNode<"union", never>("union", { union: [] })
	}
}

export type Builtins = typeof BaseNode.builtins
