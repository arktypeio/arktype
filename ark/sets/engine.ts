import { $ark, type SetEngine } from "@ark/schema"
import { intersectNodesRoot, pipeNodesRoot } from "./intersections.ts"
import { setImplementationsByKind } from "./kinds.ts"
import { discriminateUnion } from "./roots/union.ts"
import { rootToJsonSchema, toJsonSchemaRecurse } from "./toJsonSchema.ts"

export const setEngine: SetEngine = {
	intersect: intersectNodesRoot,
	pipe: pipeNodesRoot,
	reduce: (kind, inner, $) => setImplementationsByKind[kind].reduce?.(inner, $),
	sort: (kind, inner) => setImplementationsByKind[kind].sort?.(inner),
	discriminate: discriminateUnion,
	toJsonSchema: rootToJsonSchema,
	toJsonSchemaRecurse: (node, ctx) =>
		toJsonSchemaRecurse(node, {
			...ctx,
			path: "",
			open: [],
			defNamesById: {},
			defs: {}
		})
}

// must precede parsing, since nodes are reduced and discriminated when parsed
$ark.sets = setEngine
