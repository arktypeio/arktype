import { $ark, Disjoint, rootSchema } from "@ark/schema"
import { parse, type Root, type Schema } from "./formats.ts"
import { discriminantCaseToNode } from "./roots/union.ts"

/** every value l accepts, r accepts (false if that can't be proven) */
export const isSubset = (l: Schema, r: Schema): boolean =>
	parse(l).extends(parse(r))

/** l and r accept the same values (false if that can't be proven) */
export const isEqual = (l: Schema, r: Schema): boolean =>
	isSubset(l, r) && isSubset(r, l)

/** no value is accepted by both l and r (false if that can't be proven) */
export const isDisjoint = (l: Schema, r: Schema): boolean =>
	parse(l).intersect(parse(r)) instanceof Disjoint

/** the values every schema accepts: never if they're disjoint, unknown if there are none */
export const intersect = (...schemas: Schema[]): Root =>
	schemas.reduce<Root>(
		(result, schema) => result.intersect(parse(schema)).toNeverIfDisjoint(),
		$ark.intrinsic.unknown
	)

/** the values any schema accepts, without the branches others subsume */
export const union = (...schemas: Schema[]): Root =>
	rootSchema(schemas.map(schema => parse(schema)) as never)

export interface Discriminant {
	path: readonly PropertyKey[]
	/** whether a case is a value (===) or a domain (typeof) */
	kind: "unit" | "domain"
	cases: readonly {
		/** the unit, or the domain's name for kind "domain" */
		value: unknown
		/** the union's branches a value at path matching this case can satisfy */
		branches: Root
	}[]
	/** the branches with nothing at path, or null if a value matching no case is rejected */
	default: Root | null
}

/** the path and cases a union's branches can be told apart by, or null if there are none */
export const discriminate = (schema: Schema): Discriminant | null => {
	const root = parse(schema)
	if (!root.is("union") || !root.discriminant) return null
	const { kind, path, cases } = root.discriminant
	return {
		path,
		kind,
		cases: root.discCases.cases.map(described => {
			// an object case only arrays reach is described as Array
			const value = described === "Array" ? "object" : described
			const atPath = discriminantCaseToNode(
				kind === "unit" ? root.$.node("unit", { unit: value })
				: value === "undefined" || value === "null" || value === "boolean" ?
					value
				:	root.$.node("domain", { domain: value as never }),
				path,
				root.$,
				true
			)
			return {
				value,
				branches: rootSchema(
					root.branches.filter(branch => branch.overlaps(atPath)) as never
				)
			}
		}),
		default: (cases.default as Root | undefined) ?? null
	}
}
