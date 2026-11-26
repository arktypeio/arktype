import { $ark, type SetEngine } from "@ark/schema"
import { intersectNodesRoot, pipeNodesRoot } from "./intersections.ts"
import { setImplementationsByKind } from "./kinds.ts"
import { constrainIntersection } from "./roots/intersection.ts"
import { discriminateUnion, excludeRoot, extractRoot } from "./roots/union.ts"
import {
	jsonSchemaContextOf,
	jsonSchemaWriters,
	rootToJsonSchema,
	toJsonSchemaRecurse
} from "./toJsonSchema.ts"

export const setEngine: SetEngine = {
	intersect: intersectNodesRoot,
	pipe: pipeNodesRoot,
	constrain: constrainIntersection,
	reduce: (kind, inner, $) => setImplementationsByKind[kind].reduce?.(inner, $),
	sort: (kind, inner) => setImplementationsByKind[kind].sort?.(inner),
	discriminate: discriminateUnion,
	extract: extractRoot,
	exclude: excludeRoot,
	toJsonSchema: rootToJsonSchema,
	toJsonSchemaRecurse: (node, ctx) =>
		toJsonSchemaRecurse(node, jsonSchemaContextOf(ctx, jsonSchemaWriters)),
	registry: $ark
}

// must precede parsing, since nodes are reduced and discriminated when parsed
$ark.sets = setEngine
