import {
	$ark,
	Disjoint,
	type BaseRoot,
	type IntersectionContext,
	type Optional,
	type Prop,
	type Required,
	type nodeOfKind
} from "@ark/schema"
import { printable, throwParseError, unset } from "@ark/util"
import type { setImplementationOf } from "../implement.ts"
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

	// value allows undefined only if both did, whatever ctx.$ configures
	return ctx.$.node(
		"optional",
		defaultIntersection === unset ?
			{ key, value }
		:	{ key, value, default: defaultIntersection },
		{ prereduced: true }
	)
}

export const required: setImplementationOf<Required.Declaration> = {
	intersections: {
		required: intersectProps,
		optional: intersectProps
	}
}

export const optional: setImplementationOf<Optional.Declaration> = {
	reduce: (inner, $) => {
		if ($.resolvedConfig.exactOptionalPropertyTypes === false) {
			const value = withUndefined(inner.value)
			if (value !== inner.value)
				return $.node("optional", { ...inner, value }, { prereduced: true })
		}
	},
	intersections: {
		optional: intersectProps
	}
}

// a value allowing undefined, shared by every optional prop of the value
// rather than reduced again for each
const valuesWithUndefined = new WeakMap<BaseRoot, BaseRoot>()

const withUndefined = (value: BaseRoot): BaseRoot => {
	let result = valuesWithUndefined.get(value)
	if (!result) {
		result =
			value.allowsUnused(undefined) ? value : value.or($ark.intrinsic.undefined)
		// an alias's union is reduced again once it resolves
		if (!value.hasAlias) valuesWithUndefined.set(value, result)
	}
	return result
}

export const writeDefaultIntersectionMessage = (
	lValue: unknown,
	rValue: unknown
): string =>
	`Invalid intersection of default values ${printable(lValue)} & ${printable(rValue)}`
