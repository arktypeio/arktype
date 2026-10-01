import { $ark, type SetEngine } from "@ark/schema"
import { intersectNodesRoot, pipeNodesRoot } from "./intersections.ts"
import { setImplementationsByKind } from "./kinds.ts"
import { discriminate } from "./roots/union.ts"
import { toJsonSchema } from "./toJsonSchema.ts"

export const setEngine: SetEngine = {
	intersect: intersectNodesRoot,
	pipe: pipeNodesRoot,
	reduce: (kind, inner, $) => setImplementationsByKind[kind].reduce?.(inner, $),
	discriminate,
	toJsonSchema
}

// must precede parsing, since nodes are reduced and discriminated when parsed
$ark.sets = setEngine
