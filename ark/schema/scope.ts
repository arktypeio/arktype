import { transform, type Dict } from "@arktype/util"
import { parseSchemaFromKinds } from "./parse.js"
import type { Schema } from "./schema.js"
import type { validateSchemaBranch } from "./sets/union.js"
import { schemaKinds, type SchemaKind } from "./shared/define.js"
import type { Definition, NormalizedDefinition } from "./shared/nodes.js"

export type validateScopeSchema<def, $> = {
	[k in keyof def]: {}
}

export class SchemaScope {
	private parseCache: Record<string, Schema> = {}

	private constructor(public aliases: Dict<string, Definition<SchemaKind>>) {}
}

export type validateAliases<aliases> = {
	[k in keyof aliases]: "branches" extends keyof aliases[k]
		? NormalizedDefinition<"union">
		: aliases[k] extends readonly [...infer branches]
		  ? { [i in keyof branches]: validateSchemaBranch<branches[i]> }
		  : validateSchemaBranch<aliases[k]>
}

export const parseSchemaScope = <const aliases>(
	aliases: validateAliases<aliases>
) =>
	transform(aliases, ([k, v]) => {
		return [k, parseSchemaFromKinds(schemaKinds, v)]
	})

const z = parseSchemaScope({
	number: ["number", "string"],
	ordered: {
		ordered: true,
		branches: ["string"]
	}
})
