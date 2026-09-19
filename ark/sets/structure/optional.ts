import { intrinsic, type Optional } from "@ark/schema"
import type { setImplementationOf } from "../implement.ts"
import { intersectProps } from "./prop.ts"

export const optional: setImplementationOf<Optional.Declaration> = {
	reduce: (inner, $) => {
		if ($.resolvedConfig.exactOptionalPropertyTypes === false) {
			if (!inner.value.allows(undefined)) {
				return $.node(
					"optional",
					{ ...inner, value: inner.value.or(intrinsic.undefined) },
					{ prereduced: true }
				)
			}
		}
	},
	intersections: {
		optional: intersectProps
	}
}
