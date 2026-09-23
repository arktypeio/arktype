import {
	$ark,
	Disjoint,
	type Optional,
	type Prop,
	type Required,
	type nodeOfKind
} from "@ark/schema"
import { printable, throwParseError, unset } from "@ark/util"
import type { IntersectionContext, setImplementationOf } from "../implement.ts"
import { intersectOrPipeNodes } from "../intersections.ts"

export const intersectProps = (
	l: nodeOfKind<Prop.Kind>,
	r: nodeOfKind<Prop.Kind>,
	ctx: IntersectionContext
): nodeOfKind<Prop.Kind> | Disjoint | null => {
	if (l.key !== r.key) return null

	const key = l.key
	let value = intersectOrPipeNodes(l.value, r.value, ctx)
	const kind: Prop.Kind = l.required || r.required ? "required" : "optional"
	if (value instanceof Disjoint) {
		if (kind === "optional") value = $ark.intrinsic.never.internal
		else {
			// if either operand was optional, the Disjoint has to be treated as optional
			return value.withPrefixKey(
				l.key,
				l.required && r.required ? "required" : "optional"
			)
		}
	}

	if (kind === "required") {
		return ctx.$.node("required", {
			key,
			value
		})
	}

	const defaultIntersection =
		l.hasDefault() ?
			r.hasDefault() ?
				l.default === r.default ?
					l.default
				:	throwParseError(writeDefaultIntersectionMessage(l.default, r.default))
			:	l.default
		: r.hasDefault() ? r.default
		: unset

	return ctx.$.node("optional", {
		key,
		value,
		// unset is stripped during parsing
		default: defaultIntersection
	})
}

export const writeDefaultIntersectionMessage = (
	lValue: unknown,
	rValue: unknown
): string =>
	`Invalid intersection of default values ${printable(lValue)} & ${printable(rValue)}`

export const required: setImplementationOf<Required.Declaration> = {
	intersections: {
		required: intersectProps,
		optional: intersectProps
	}
}

export const optional: setImplementationOf<Optional.Declaration> = {
	reduce: (inner, $) => {
		if ($.resolvedConfig.exactOptionalPropertyTypes === false) {
			if (!inner.value.allows(undefined)) {
				return $.node(
					"optional",
					{ ...inner, value: inner.value.or($ark.intrinsic.undefined) },
					{ prereduced: true }
				)
			}
		}
	},
	intersections: {
		optional: intersectProps
	}
}
