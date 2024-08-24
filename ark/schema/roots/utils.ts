import { flatMorph } from "@ark/util"
import {
	schemaKindsRightOf,
	type RootIntersection,
	type RootKind
} from "../shared/implement.ts"
import type { schemaKindRightOf } from "./root.ts"

export const defineRightwardIntersections = <kind extends RootKind>(
	kind: kind,
	implementation: RootIntersection<kind, schemaKindRightOf<kind>>
): { [k in schemaKindRightOf<kind>]: RootIntersection<kind, k> } =>
	flatMorph(schemaKindsRightOf(kind), (i, kind) => [
		kind,
		implementation
	]) as never
