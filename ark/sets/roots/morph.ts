import { Disjoint, type Morph } from "@ark/schema"
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
			// the heads keep their own morphs, which must be equal, too
			const headTersection =
				l.head ?
					r.head ?
						intersectOrPipeNodes(l.head, r.head, ctx)
					:	l.head
				:	r.head
			if (headTersection instanceof Disjoint) return headTersection

			const baseInner: mutable<Morph.Inner> = { ...l.inner, morphs: l.piped }

			if (l.declaredIn || r.declaredIn) {
				const declaredIn = intersectOrPipeNodes(l._in, r._in, ctx)
				// we can't treat this as a normal Disjoint since it's just declared
				// it should only happen if someone's essentially trying to create a broken type
				if (declaredIn instanceof Disjoint) return declaredIn.throw()
				else baseInner.declaredIn = declaredIn as never
			}

			if (l.declaredOut || r.declaredOut) {
				const declaredOut = intersectOrPipeNodes(l._out, r._out, ctx)
				if (declaredOut instanceof Disjoint) return declaredOut.throw()
				else baseInner.declaredOut = declaredOut
			}

			if (!headTersection) return ctx.$.node("morph", baseInner)

			// in case from is a union, we need to distribute the branches
			// to can be a union as any schema is allowed
			return headTersection.distribute(
				headBranch =>
					ctx.$.node("morph", {
						...baseInner,
						morphs: [headBranch, ...l.piped]
					}),
				branches => ctx.$.node("union", { branches })
			)
		},
		...defineRightwardIntersections("morph", (l, r, ctx) => {
			const headTersection = l.head ? intersectOrPipeNodes(l.head, r, ctx) : r
			if (headTersection instanceof Disjoint) return headTersection
			const declaredIn =
				l.declaredIn ? intersectOrPipeNodes(l.declaredIn, r, ctx) : undefined
			if (declaredIn instanceof Disjoint) return declaredIn
			// a morph with no head allows whatever unknown does
			const sameHead =
				l.head ? headTersection.equals(l.head) : headTersection.isUnknown()
			return sameHead && (!declaredIn || declaredIn.equals(l.declaredIn)) ?
					l
				:	ctx.$.node("morph", {
						...l.inner,
						...(declaredIn && { declaredIn }),
						morphs: [headTersection, ...l.piped]
					})
		})
	}
}

const assertEqualMorphs = (l: Morph.Node, r: Morph.Node): void => {
	if (!l.sameMorphs(r))
		throwParseError(writeMorphIntersectionMessage(l.expression, r.expression))
}

export const writeMorphIntersectionMessage = (
	lDescription: string,
	rDescription: string
): string =>
	`The intersection of distinct morphs at a single path is indeterminate:
Left: ${lDescription}
Right: ${rDescription}
To apply both, pipe one to the other instead, e.g. with .to().`
