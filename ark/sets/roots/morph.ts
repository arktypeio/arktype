import {
	Disjoint,
	isResolutionFinal,
	queueUnchecked,
	type Morph
} from "@ark/schema"
import { throwParseError, type mutable } from "@ark/util"
import {
	defineRightwardIntersections,
	type setImplementationOf
} from "../implement.ts"
import { intersectOrPipeNodes } from "../intersections.ts"

export const morph: setImplementationOf<Morph.Declaration> = {
	intersections: {
		morph: (l, r, ctx) => {
			assertEqualMorphs(l, r)
			const inTersection = intersectOrPipeNodes(l.rawIn, r.rawIn, ctx)
			if (inTersection instanceof Disjoint) return inTersection

			const baseInner: Omit<mutable<Morph.Inner>, "in"> = {
				morphs: l.morphs
			}

			if (l.declaredIn || r.declaredIn) {
				const declaredIn = intersectOrPipeNodes(l.rawIn, r.rawIn, ctx)
				// we can't treat this as a normal Disjoint since it's just declared
				// it should only happen if someone's essentially trying to create a broken type
				if (declaredIn instanceof Disjoint) return declaredIn.throw()
				else baseInner.declaredIn = declaredIn as never
			}

			if (l.declaredOut || r.declaredOut) {
				const declaredOut = intersectOrPipeNodes(l.rawOut, r.rawOut, ctx)
				if (declaredOut instanceof Disjoint) return declaredOut.throw()
				else baseInner.declaredOut = declaredOut
			}

			// in case from is a union, we need to distribute the branches
			// to can be a union as any schema is allowed
			return inTersection.distribute(
				inBranch =>
					ctx.$.node("morph", {
						...baseInner,
						in: inBranch
					}),
				ctx.$.parseSchema
			)
		},
		...defineRightwardIntersections("morph", (l, r, ctx) => {
			const inTersection =
				l.inner.in ? intersectOrPipeNodes(l.inner.in, r, ctx) : r
			return (
				inTersection instanceof Disjoint ? inTersection
				: inTersection.equals(l.inner.in) ? l
				: ctx.$.node("morph", {
						...l.inner,
						in: inTersection
					})
			)
		})
	}
}

const assertEqualMorphs = (l: Morph.Node, r: Morph.Node): void => {
	if (l.hasEqualMorphs(r)) return
	// whether morphs piping to an alias are equal is known once its definition closes
	if (!isResolutionFinal() && (l.includesAlias || r.includesAlias))
		queueUnchecked(() => assertEqualMorphs(l, r), `${l.id}&${r.id}`)
	else
		throwParseError(writeMorphIntersectionMessage(l.expression, r.expression))
}

export const writeMorphIntersectionMessage = (
	lDescription: string,
	rDescription: string
): string =>
	`The intersection of distinct morphs at a single path is indeterminate:
Left: ${lDescription}
Right: ${rDescription}`
