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

// installed on import so that `import "arksets"` is the whole opt-in. it has
// to precede scope construction: reduction and discrimination happen at parse
// time, so a node parsed before this point is cached unreduced for good
$ark.sets = setEngine
