import {
	CompiledFunction,
	DynamicBase,
	entriesOf,
	hasDomain,
	includes,
	isArray,
	stringify,
	throwInternalError,
	throwParseError,
	type Json
} from "@arktype/util"
import { maybeGetBasisKind, type BasisKind } from "./bases/basis.js"
import { SchemaNode, type Schema } from "./schema.js"
import { unflattenConstraints } from "./sets/intersection.js"
import type { ValidatorKind } from "./sets/morph.js"
import type {
	UnionDefinition,
	parseSchemaBranches,
	validateSchemaBranch
} from "./sets/union.js"
import {
	In,
	compilePropAccess,
	type CheckResult,
	type CompilationContext,
	type CompilationKind
} from "./shared/compilation.js"
import type { BaseAttributes } from "./shared/declare.js"
import {
	basisKinds,
	closedRefinementKinds,
	constraintKinds,
	defaultInnerKeySerializer,
	openRefinementKinds,
	refinementKinds,
	schemaKinds,
	setKinds,
	type ClosedRefinementKind,
	type ConstraintKind,
	type NodeKind,
	type OpenRefinementKind,
	type RefinementKind,
	type SchemaKind,
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
	type Input,
	type childKindOf,
	type reducibleKindOf
} from "./shared/nodes.js"
import { arkKind, isNode, registry } from "./shared/registry.js"

export type validateScopeSchema<def, $> = {
	[k in keyof def]: {}
}
export type BaseAttachments<kind extends NodeKind> = {
	readonly kind: kind
	readonly inner: Inner<kind>
	readonly entries: entriesOf<Inner<kind>>
	readonly json: Json
	readonly typeJson: Json
	readonly collapsibleJson: Json
	readonly children: Node<childKindOf<kind>>[]
	readonly id: string
	readonly typeId: string
}

export function parseUnion<const branches extends readonly unknown[]>(
	input: {
		branches: {
			[i in keyof branches]: validateSchemaBranch<branches[i]>
		}
	} & UnionDefinition
): parseSchemaBranches<branches> {
	return parseNode("union", input) as never
}

export function parseBranches<const branches extends readonly unknown[]>(
	...branches: {
		[i in keyof branches]: validateSchemaBranch<branches[i]>
	}
): parseSchemaBranches<branches> {
	return parseNode("union", branches) as never
}

export function parseUnits<const branches extends readonly unknown[]>(
	...values: branches
): branches["length"] extends 1
	? Node<"unit", branches[0]>
	: Node<"union" | "unit", branches[number]> {
	const uniqueValues: unknown[] = []
	for (const value of values) {
		if (!uniqueValues.includes(value)) {
			uniqueValues.push(value)
		}
	}
	const branches = uniqueValues.map((unit) =>
		parsePrereducedSchema("unit", { is: unit })
	)
	if (branches.length === 1) {
		return branches[0]
	}
	return parsePrereducedSchema("union", {
		branches
	}) as never
}

export function parsePrereducedSchema<kind extends SchemaKind>(
	kind: kind,
	input: Input<kind>
): Node<kind> {
	return parseNode(kind, input, {
		prereduced: true
	}) as never
}

export function parseSchemaFromKinds<defKind extends SchemaKind>(
	allowedKinds: readonly defKind[],
	input: unknown
): Node<reducibleKindOf<defKind>> {
	const kind = schemaKindOf(input)
	if (!allowedKinds.includes(kind as never)) {
		return throwParseError(
			`Schema of kind ${kind} should be one of ${allowedKinds}`
		)
	}
	return parseNode(kind, input as never, {}) as never
}

const parseCache: Record<string, unknown> = {}

export function parseNode<defKind extends NodeKind>(
	kind: defKind,
	input: Input<defKind>,
	ctxInput?: SchemaParseContextInput
): Node<reducibleKindOf<defKind>> {
	if (isNode(input)) {
		return input as never
	}
	const implementation: UnknownNodeImplementation = NodeImplementationByKind[
		kind
	] as never
	const inner: Record<string, unknown> = {}
	const normalizedInput: any = implementation.normalize?.(input) ?? input
	const ctx: SchemaParseContext<any> = {
		...ctxInput,
		input: normalizedInput,
		cls: BaseNode
	}
	implementation.addContext?.(ctx)
	const schemaEntries = entriesOf(normalizedInput).sort((l, r) =>
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
	if (id in parseCache) {
		return parseCache[id] as never
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
		: new (SchemaNode as any)(attachments)
}

function schemaKindOf(input: unknown): SchemaKind {
	const basisKind = maybeGetBasisKind(input)
	if (basisKind) {
		return basisKind
	}
	if (typeof input === "object" && input !== null) {
		if (input instanceof BaseNode) {
			if (input.isSchema()) {
				return input.kind
			}
			// otherwise, error at end of function
		} else if ("morph" in input) {
			return "morph"
		} else if ("branches" in input || isArray(input)) {
			return "union"
		} else {
			return "intersection"
		}
	}
	return throwParseError(`${stringify(input)} is not a valid type schema`)
}

export function createBuiltins() {
	return {
		unknown: parseBranches({}),
		bigint: parseBranches("bigint"),
		number: parseBranches("number"),
		object: parseBranches("object"),
		string: parseBranches("string"),
		symbol: parseBranches("symbol"),
		array: parseBranches(Array),
		date: parseBranches(Date),
		false: parseBranches({ is: false }),
		null: parseBranches({ is: null }),
		undefined: parseBranches({ is: undefined }),
		true: parseBranches({ is: true }),
		never: parseBranches(),
		// this is parsed as prereduced so we can compare future
		// unions to it to determine if they should be reduced to unknown
		unknownUnion: parsePrereducedSchema("union", [
			"string",
			"number",
			"object",
			"bigint",
			"symbol",
			{ is: true },
			{ is: false },
			{ is: null },
			{ is: undefined }
		])
	} as const
}

export type Builtins = ReturnType<typeof createBuiltins>

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
	readonly alias = registry().register(this)
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
			: { ...this.referencesById, [this.alias]: this }
	readonly contributesReferences: readonly UnknownNode[] = Object.values(
		this.contributesReferencesById
	)
	readonly allows: (data: unknown) => data is t
	readonly traverse: (data: unknown) => CheckResult<t>
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
		// important this is last as writeDefaultDescription could rely on attached
		this.description ??= this.implementation.writeDefaultDescription(
			this as never
		)
		this.allows = this.compile("allows")
		this.traverse = this.compile("traverse")
	}

	// TODO: Cache
	compile<kind extends CompilationKind>(kind: kind): this[kind] {
		const $ = this.contributesReferences
			.map((reference) =>
				reference.compileReference({
					compilationKind: "allows",
					path: [],
					discriminants: []
				})
			)
			.join("\n")
		if (kind === "allows") {
			return new CompiledFunction($ + "\n" + `return ${this.alias}`)() as never
		}
		return new CompiledFunction(
			$ +
				"\n" +
				`const problems = []
	${this.alias}(${In}, problems)
	if(problems.length === 0) {
		return { data: ${In} }
	}
	return { problems }`
		)
	}

	// TODO: Cache
	compileReference(ctx: CompilationContext) {
		return `function ${this.alias}(${In}){${this.implementation.compile(
			this as never,
			ctx
		)}}`
	}

	compileInvocation(ctx: CompilationContext, prop?: string) {
		return `${this.alias}(${In}${
			prop === undefined ? "" : compilePropAccess(prop)
		}${ctx.compilationKind === "traverse" ? ", problems" : ""})`
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
		return parseNode(this.kind, ioInner)
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

	isSchema(): this is Node<SchemaKind> {
		return includes(schemaKinds, this.kind)
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
			? parseNode("intersection", unflattenConstraints([this as never, other]))
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
			return parseNode(l.kind, result) as never
		}
		return null
	}

	static parseSchema = parseNode
	static parseTypeFromKinds = parseSchemaFromKinds
	static parsePrereduced = parsePrereducedSchema

	static isInitialized = false
	static #builtins: Builtins | undefined
	static get builtins() {
		if (!this.#builtins) {
			this.#builtins = {} as Builtins
			this.isInitialized = true
		}
		return this.#builtins
	}
}

export type Node<
	kind extends NodeKind = NodeKind,
	t = unknown
> = kind extends SchemaKind ? Schema<kind, t> : BaseNode<kind, t>
export type UnknownNode = BaseNode<any>
