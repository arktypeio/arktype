import type { Dict } from "@arktype/util"
import type { Schema } from "./schema.js"
import type { SchemaKind } from "./shared/define.js"
import type { Definition } from "./shared/nodes.js"

export type validateScopeSchema<def, $> = {
	[k in keyof def]: {}
}

export class SchemaScope {
	private parseCache: Record<string, Schema> = {}

	constructor(public aliases: Dict<string, Definition<SchemaKind>>) {}
}
