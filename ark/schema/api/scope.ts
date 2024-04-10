import type { Json, array, flattenListable } from "@arktype/util"
import type { BaseNode, Node, SchemaDef } from "../base.js"
import type { NodeDef, reducibleKindOf } from "../kinds.js"
import type { NodeParseOptions } from "../parse.js"
import type { distillIn, distillOut } from "../schemas/morph.js"
import type { BaseSchema } from "../schemas/schema.js"
import type {
	ArkConfig,
	destructuredExportContext,
	destructuredImportContext,
	exportedNameOf
} from "../scope.js"
import type { NodeKind, SchemaKind } from "../shared/implement.js"
import type { inferSchema, validateSchema } from "./inference.js"
import type { SchemaModule } from "./module.js"
import type { Schema } from "./schema.js"

export type validateAliases<aliases> = {
	[k in keyof aliases]: validateSchema<aliases[k], aliases>
}

export type instantiateAliases<aliases> = {
	[k in keyof aliases]: inferSchema<aliases[k], aliases>
} & unknown

export declare const schemaScope: <const aliases>(
	aliases: validateAliases<aliases>,
	config?: ArkConfig
) => SchemaScope2<instantiateAliases<aliases>>

export interface SchemaScope2<$ = any> {
	$: $
	infer: distillOut<$>
	inferIn: distillIn<$>

	config: ArkConfig
	references: readonly BaseNode[]
	json: Json
	exportedNames: array<exportedNameOf<$>>

	/** The set of names defined at the root-level of the scope mapped to their
	 * corresponding definitions.**/
	aliases: Record<string, unknown>

	node<kind extends NodeKind, const def extends NodeDef<kind>>(
		kind: kind,
		def: def,
		opts?: NodeParseOptions
	): Node<reducibleKindOf<kind>>

	schema<const def extends SchemaDef>(
		def: def,
		opts?: NodeParseOptions
	): Schema<inferSchema<def, $>, $>

	defineSchema<const def extends SchemaDef>(def: def): def

	units<const branches extends array>(
		values: branches,
		opts?: NodeParseOptions
	): Schema<branches[number], $>

	parseNode<kinds extends NodeKind | array<SchemaKind>>(
		kinds: kinds,
		schema: NodeDef<flattenListable<kinds>>,
		opts?: NodeParseOptions
	): Node<reducibleKindOf<flattenListable<kinds>>>

	parseRoot(def: unknown, opts?: NodeParseOptions): BaseSchema

	import<names extends exportedNameOf<$>[]>(
		...names: names
	): SchemaModule<
		destructuredImportContext<
			$,
			names extends [] ? exportedNameOf<$> : names[number]
		>
	>

	export<names extends exportedNameOf<$>[]>(
		...names: names
	): SchemaModule<
		destructuredExportContext<
			$,
			names extends [] ? exportedNameOf<$> : names[number]
		>
	>
}
