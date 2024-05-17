import { flatMorph } from "@arktype/util"
import {
	schemaKindsRightOf,
	type RootIntersection,
	type RootKind
} from "../shared/implement.js"
import type { schemaKindRightOf } from "./root.js"

export const defineRightwardIntersections = <kind extends RootKind>(
	kind: kind,
	implementation: RootIntersection<kind, schemaKindRightOf<kind>>
): { [k in schemaKindRightOf<kind>]: RootIntersection<kind, k> } =>
	flatMorph(schemaKindsRightOf(kind), (i, kind) => [
		kind,
		implementation
	]) as never
