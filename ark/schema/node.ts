import {
	CompiledFunction,
	DynamicBase,
	ParseError,
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
import type { BaseAttributes } from "./shared/declare.ts"
import {
	basisKinds,
	closedConstraintKinds,
	constraintKinds,
	createParseContext,
	openConstraintKinds,
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
	readonly allows: (data: unknown) => data is t = new CompiledFunction(
		In,
		this.isRule()
			? `return ${this.condition}`
			: (this as {} as Node<SetKind>).compile({
					successKind: "true",
					failureKind: "false"
			  })
	)
	readonly alias: string = $ark.register(this, this.inner.alias)
	readonly description: string =
		this.inner.description ??
		this.implementation.writeDefaultDescription(this as never)

	static parseSchemaKind<kind extends NodeKind>(
		kind: kind,
		schema: Schema<kind>
		// TODO: or reduction of kind
	): UnknownNode {
		const implementation: UnknownNodeImplementation = NodeImplementationByKind[
			kind
		] as never
		const expandedSchema = implementation.expand?.(schema) ?? {
			...(schema as any)
		}
		const ctx = createParseContext()
		const inner: Record<string, unknown> = {}
		let json: Record<string, unknown> = {}
		let typeJson: Record<string, unknown> = {}
		const children: UnknownNode[] = []
		for (const [k, keyDefinition] of implementation.keyEntries) {
			if (keyDefinition.parse) {
				// even if expandedSchema[k] is undefined, parse might provide a default value
				expandedSchema[k] = keyDefinition.parse(expandedSchema[k], ctx)
			}
			if (!(k in expandedSchema)) {
				// if there is no parse function and k is undefined, it is an
				// optional key on both the schema and inner types
				continue
			}
			if (keyDefinition.children) {
				const schemaKeyChildren = expandedSchema[k]
				const innerKeyChildren = listFrom(schemaKeyChildren).map((child) => {
					if (typeof keyDefinition.children === "string") {
						return this.parseSchemaKind(keyDefinition.children, child)
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
					return this.parseSchemaKind(rootKind, child)
				})
				inner[k] = innerKeyChildren
				json[k] = innerKeyChildren.map((child) => child.collapsibleJson)
				typeJson[k] = innerKeyChildren.map((child) => child.collapsibleJson)
				children.push(...innerKeyChildren)
			} else {
				inner[k] = expandedSchema[k]
				json[k] = defaultValueSerializer(keyDefinition)
				if (!keyDefinition.meta) {
					typeJson[k] = json[k]
				}
			}
			// remove the schema key so we know we've parsed it
			delete expandedSchema[k]
		}
		const invalidKeys = Object.keys(expandedSchema)
		// any schema keys remaining at this point have no matching key
		// definition and are invalid
		if (invalidKeys.length > 0) {
			throw new ParseError(
				`Key${
					invalidKeys.length === 1
						? ` ${invalidKeys[0]} is`
						: `s ${invalidKeys.join(", ")} are`
				} not valid on ${kind} schema`
			)
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

		const attachments = this.implementation.attach(this as never)
		// important this is last as writeDefaultDescription could rely on attached
		Object.assign(this, attachments)
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
		return includes(ruleKinds, this.kind)
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

export const rootKindOfSchema = (schema: unknown): RootKind => {
	switch (typeof schema) {
		case "string":
			return "domain"
		case "function":
			return "proto"
		case "object":
			if (schema === null) {
				break
			}
			if (schema instanceof BaseNode) {
				if (!schema.isRoot()) {
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
	return throwParseError(`${typeof schema} is not a valid root schema type`)
}

export type NodeParser = {
	<branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: validateSchemaBranch<branches[i]>
		}
	): parseSchemaBranches<branches>
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

// const parseRoot: NodeParser = (...branches) =>
// 	BaseNode.parseRoot(branches) as never

// const parseUnits = <const branches extends readonly unknown[]>(
// 	...values: branches
// ) => BaseNode.parseUnits(values)

// static parseUnits<const branches extends readonly unknown[]>(
// 	values: branches
// ) {
// 	const uniqueValues: unknown[] = []
// 	for (const value of values) {
// 		if (!uniqueValues.includes(value)) {
// 			uniqueValues.push(value)
// 		}
// 	}
// 	return new BaseNode<"union", branches[number]>("union", {
// 		union: uniqueValues.map((unit) => new BaseNode("unit", { is: unit }))
// 	})
// }

export const node = Object.assign(parseRoot, {
	units: parseUnits
})
