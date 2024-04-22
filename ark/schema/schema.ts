import {
	type Callable,
	type Json,
	type conform,
	throwParseError
} from "@arktype/util"
import type { constrain } from "./constraints/ast.js"
import type { Predicate } from "./constraints/predicate.js"
import {
	type PrimitiveConstraintKind,
	throwInvalidOperandError
} from "./constraints/util.js"
import type { inferSchema } from "./inference.js"
import type { NodeDef, reducibleKindOf } from "./kinds.js"
import { type Node, RawNode, type SchemaDef } from "./node.js"
import type { constraintKindOf } from "./schemas/intersection.js"
import type {
	Morph,
	Out,
	distillConstrainableIn,
	distillConstrainableOut,
	distillIn,
	distillOut,
	inferMorphOut
} from "./schemas/morph.js"
import type { UnionChildKind } from "./schemas/union.js"
import type { SchemaScope } from "./scope.js"
import type { BaseMeta, RawNodeDeclaration } from "./shared/declare.js"
import { Disjoint } from "./shared/disjoint.js"
import { ArkErrors } from "./shared/errors.js"
import type {
	NodeAttachments,
	NodeKind,
	SchemaKind,
	kindRightOf
} from "./shared/implement.js"
import {
	type inferIntersection,
	type inferPipe,
	intersectNodesRoot,
	pipeNodesRoot
} from "./shared/intersections.js"
import {
	arkKind,
	type inferred,
	type internalImplementationOf
} from "./shared/utils.js"

export interface RawSchemaDeclaration extends RawNodeDeclaration {
	kind: SchemaKind
	attachments: RawSchemaAttachments<this>
}

export interface RawSchemaAttachments<d extends RawNodeDeclaration>
	extends NodeAttachments<d> {
	rawKeyOf(): RawSchema
}

export type UnknownSchema = Schema | RawSchema

export class RawSchema<
		/** @ts-expect-error allow instantiation assignment to the base type */
		out d extends RawSchemaDeclaration = RawSchemaDeclaration
	>
	extends RawNode<d>
	implements
		internalImplementationOf<
			Schema,
			(keyof Schema & symbol) | "infer" | "inferIn" | "t" | "tIn" | "tOut"
		>
{
	readonly branches: readonly Node<UnionChildKind>[] =
		this.hasKind("union") ? this.inner.branches : [this as never];

	readonly [arkKind] = "schema"

	get raw(): this {
		return this
	}

	#keyofCache: RawSchema | undefined
	keyof(): RawSchema {
		if (!this.#keyofCache) {
			this.#keyofCache = this.rawKeyOf()
			if (this.#keyofCache.branches.length === 0)
				throwParseError(
					`keyof ${this.expression} results in an unsatisfiable type`
				)
		}
		return this.#keyofCache as never
	}

	// TODO: can it be enforced that this is not called internally and instead intersectNodes is used?
	intersect(r: unknown): RawSchema | Disjoint {
		const rNode = this.$.parseRoot(r)
		return intersectNodesRoot(this, rNode, this.$) as never
	}

	and(r: unknown): RawSchema {
		const result = this.intersect(r)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	or(r: unknown): RawSchema {
		const rNode = this.$.parseRoot(r)
		const branches = [...this.branches, ...(rNode.branches as any)]
		return this.$.schema(branches) as never
	}

	assert(data: unknown): unknown {
		const result = this.traverse(data)
		return result instanceof ArkErrors ? result.throw() : result
	}

	// get<key extends PropertyKey>(
	// 	...path: readonly (key | Schema<key>)[]
	// ): this {
	// 	return this
	// }

	extract(r: unknown): RawSchema {
		const rNode = this.$.parseRoot(r)
		return this.$.schema(
			this.branches.filter((branch) => branch.extends(rNode))
		) as never
	}

	exclude(r: UnknownSchema): RawSchema {
		const rNode = this.$.parseRoot(r)
		return this.$.schema(
			this.branches.filter((branch) => !branch.extends(rNode))
		) as never
	}

	array(): RawSchema {
		return this.$.schema(
			{
				proto: Array,
				sequence: this
			},
			{ prereduced: true }
		) as never
	}

	extends(r: UnknownSchema): boolean {
		const intersection = this.intersect(r as never)
		return (
			!(intersection instanceof Disjoint) && this.equals(intersection as never)
		)
	}

	configure(configOrDescription: BaseMeta | string): this {
		return this.configureShallowDescendants(configOrDescription)
	}

	describe(description: string): this {
		return this.configure(description)
	}

	create(input: unknown): unknown {
		// ideally we wouldn't validate here but for now we need to do determine
		// which morphs to apply
		return this.assert(input)
	}

	morph(morph: Morph, outValidator?: unknown): RawSchema {
		if (this.hasKind("union")) {
			const branches = this.branches.map((node) =>
				node.morph(morph, outValidator as never)
			)
			return this.$.node("union", { ...this.inner, branches })
		}
		if (this.hasKind("morph")) {
			return this.$.node("morph", {
				...this.inner,
				morphs: [...this.morphs, morph]
			})
		}
		return this.$.node("morph", {
			from: this,
			morphs: [morph]
		})
	}

	narrow(predicate: Predicate): RawSchema {
		return this.constrain("predicate", predicate)
	}

	constrain<kind extends PrimitiveConstraintKind>(
		kind: kind,
		def: NodeDef<kind>
	): RawSchema {
		const constraint = this.$.node(kind, def)
		if (constraint.impliedBasis && !this.extends(constraint.impliedBasis)) {
			return throwInvalidOperandError(
				kind,
				constraint.impliedBasis as never,
				this as never
			)
		}

		return this.and(
			// TODO: not an intersection
			this.$.node("intersection", {
				[kind]: constraint
			})
		)
	}

	pipe(def: unknown): RawSchema {
		const to = this.$.parseRoot(def)
		return pipeNodesRoot(this, to, this.$) as never
	}
}

export declare abstract class BaseRoot<t = unknown, $ = any> extends Callable<
	(data: unknown) => distillOut<t> | ArkErrors
> {
	t: t
	tIn: distillConstrainableIn<t>
	tOut: distillConstrainableOut<t>
	infer: distillOut<t>
	inferIn: distillIn<t>;
	[inferred]: t

	json: Json
	description: string
	expression: string
	innerId: string
	raw: RawSchema

	abstract $: SchemaScope<$>;
	abstract get in(): unknown
	abstract get out(): unknown
	abstract keyof(): unknown
	abstract intersect(r: never): unknown | Disjoint
	abstract and(r: never): unknown
	abstract or(r: never): unknown
	abstract constrain(kind: never, def: never): unknown
	abstract equals(r: never): this is unknown
	abstract extract(r: never): unknown
	abstract exclude(r: never): unknown
	abstract extends(r: never): this is unknown
	abstract array(): unknown
	abstract morph(morph: Morph): unknown

	assert(data: unknown): this["infer"]

	allows(data: unknown): data is this["inferIn"]

	traverse(data: unknown): distillOut<t> | ArkErrors

	configure(configOrDescription: BaseMeta | string): this

	describe(description: string): this

	create(literal: this["inferIn"]): this["infer"]
}

// this is declared as a class internally so we can ensure all "abstract"
// methods of BaseRoot are overridden, but we end up exporting it as an interface
// to ensure it is not accessed as a runtime value
declare class $Schema<t = unknown, $ = any> extends BaseRoot<t, $> {
	$: SchemaScope<$>;

	get in(): Schema<this["tIn"], $>

	get out(): Schema<this["tOut"], $>

	keyof(): Schema<keyof this["inferIn"], $>

	intersect<r extends Schema>(
		r: r
	): Schema<inferIntersection<t, r["t"]>> | Disjoint

	and<r extends Schema>(r: r): Schema<inferIntersection<t, r["t"]>>

	or<r extends Schema>(r: r): Schema<t | r["t"]>

	array(): Schema<t[], $>

	constrain<
		kind extends PrimitiveConstraintKind,
		const def extends NodeDef<kind>
	>(
		kind: conform<kind, constraintKindOf<this["inferIn"]>>,
		def: def
	): Schema<constrain<t, kind, def>, $>

	equals<r>(r: Schema<r>): this is Schema<r>

	// TODO: i/o
	extract<r>(r: Schema<r>): Schema<t, $>
	exclude<r>(r: Schema<r>): Schema<t, $>

	// add the extra inferred intersection so that a variable of Type
	// can be narrowed without other branches becoming never
	extends<r>(other: Schema<r>): this is Schema<r> & { [inferred]?: r }

	morph<morph extends Morph<this["infer"]>>(
		morph: morph
	): Schema<(In: distillConstrainableIn<t>) => Out<inferMorphOut<morph>>, $>

	pipe<def extends SchemaDef>(
		def: def
	): Schema<inferPipe<t, inferSchema<def, $>>, $>
}

export interface Schema<
	/** @ts-expect-error allow instantiation assignment to the base type */
	out t = unknown,
	$ = any
> extends $Schema<t, $> {}

export type intersectSchema<l extends SchemaKind, r extends NodeKind> =
	[l, r] extends [r, l] ? l
	:	asymmetricIntersectionOf<l, r> | asymmetricIntersectionOf<r, l>

type asymmetricIntersectionOf<l extends NodeKind, r extends NodeKind> =
	l extends unknown ?
		r extends kindRightOf<l> ?
			l | reducibleKindOf<l>
		:	never
	:	never

export type schemaKindRightOf<kind extends SchemaKind> = Extract<
	kindRightOf<kind>,
	SchemaKind
>

export type schemaKindOrRightOf<kind extends SchemaKind> =
	| kind
	| schemaKindRightOf<kind>
