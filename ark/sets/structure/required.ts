import type { Required } from "@ark/schema"
import type { setImplementationOf } from "../implement.ts"
import { intersectProps } from "./prop.ts"

export const required: setImplementationOf<Required.Declaration> = {
	intersections: {
		required: intersectProps,
		optional: intersectProps
	}
}
