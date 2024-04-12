import { flatMorph } from "@arktype/util"
import type { schemaKindRightOf } from "../schema.js"
import {
	type SchemaKind,
	type TypeIntersection,
	schemaKindsRightOf
} from "../shared/implement.js"

export const defineRightwardIntersections = <kind extends SchemaKind>(
	kind: kind,
	implementation: TypeIntersection<kind, schemaKindRightOf<kind>>
): { [k in schemaKindRightOf<kind>]: TypeIntersection<kind, k> } =>
	flatMorph(schemaKindsRightOf(kind), (i, kind) => [
		kind,
		implementation
	]) as never
