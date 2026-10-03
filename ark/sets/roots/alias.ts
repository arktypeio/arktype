import { $ark, Disjoint, type Alias, type BaseRoot } from "@ark/schema"
import {
	defineRightwardIntersections,
	type setImplementationOf
} from "../implement.ts"
import { intersectOrPipeNodes } from "../intersections.ts"

const neverIfDisjoint = (result: BaseRoot | Disjoint): BaseRoot =>
	result instanceof Disjoint ? $ark.intrinsic.never.internal : result

export const alias: setImplementationOf<Alias.Declaration> = {
	intersections: {
		alias: (l, r, ctx) =>
			ctx.$.lazilyResolve(
				() =>
					neverIfDisjoint(
						intersectOrPipeNodes(l.resolution, r.resolution, ctx)
					),
				`${l.expression}${ctx.pipe ? "=>" : "&"}${r.expression}`
			),
		...defineRightwardIntersections("alias", (l, r, ctx) => {
			if (r.isUnknown()) return l
			if (r.isNever()) return r
			if (r.isBasis() && !r.overlaps($ark.intrinsic.object)) {
				// can be more robust as part of https://github.com/arktypeio/arktype/issues/1026
				return Disjoint.init("assignability", $ark.intrinsic.object as never, r)
			}

			return ctx.$.lazilyResolve(
				() => neverIfDisjoint(intersectOrPipeNodes(l.resolution, r, ctx)),
				`${l.expression}${ctx.pipe ? "=>" : "&"}${r.id}`
			)
		})
	}
}
