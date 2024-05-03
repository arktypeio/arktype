import { flatMorph } from "@arktype/util"
import {
	type RootKind,
	type TypeIntersection,
	schemaKindsRightOf
} from "../shared/implement.js"
import type { schemaKindRightOf } from "./root.js"

export const defineRightwardIntersections = <kind extends RootKind>(
	kind: kind,
	implementation: TypeIntersection<kind, schemaKindRightOf<kind>>
): { [k in schemaKindRightOf<kind>]: TypeIntersection<kind, k> } =>
	flatMorph(schemaKindsRightOf(kind), (i, kind) => [
		kind,
		implementation
	]) as never
