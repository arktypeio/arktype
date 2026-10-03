import {
	$ark,
	Disjoint,
	identityOf,
	isResolvable,
	type Alias,
	type BaseRoot
} from "@ark/schema"
import {
	defineRightwardIntersections,
	type IntersectionContext,
	type setImplementationOf
} from "../implement.ts"
import { intersectOrPipeNodes } from "../intersections.ts"

const neverIfDisjoint = (result: BaseRoot | Disjoint): BaseRoot =>
	result instanceof Disjoint ? $ark.intrinsic.never.internal : result

const resolutionOf = (node: BaseRoot): BaseRoot =>
	node.hasKind("alias") ? node.resolution : node

const intersectedOperandsOf = (node: BaseRoot): readonly BaseRoot[] =>
	node.hasKind("alias") && node.operands && node.operator === "&" ?
		node.operands
	:	[node]

// an operation's alias is referenced by its operands' identities, so an equivalent operation reuses it
const operate = (
	l: Alias.Node,
	r: BaseRoot,
	ctx: IntersectionContext
): BaseRoot => {
	if (ctx.pipe) {
		return ctx.$.lazilyResolve(
			() =>
				neverIfDisjoint(
					intersectOrPipeNodes(resolutionOf(l), resolutionOf(r), ctx)
				),
			`${identityOf(l)}=>${identityOf(r)}`,
			"=>",
			[l, r]
		)
	}
	const operandsByIdentity: Record<string, BaseRoot> = {}
	for (const operand of [
		...intersectedOperandsOf(l),
		...intersectedOperandsOf(r)
	]) {
		const identity = identityOf(operand)
		if (!operandsByIdentity[identity]?.hasKind("alias"))
			operandsByIdentity[identity] = operand
	}
	const identities = Object.keys(operandsByIdentity).sort()
	if (identities.length === 1) return operandsByIdentity[identities[0]]
	const operands = identities.map(identity => operandsByIdentity[identity])
	return ctx.$.lazilyResolve(
		() => {
			let result: BaseRoot | Disjoint = resolutionOf(operands[0])
			for (let i = 1; i < operands.length && !(result instanceof Disjoint); i++)
				result = intersectOrPipeNodes(result, resolutionOf(operands[i]), ctx)
			return neverIfDisjoint(result)
		},
		identities.join("&"),
		"&",
		operands
	)
}

export const alias: setImplementationOf<Alias.Declaration> = {
	intersections: {
		alias: operate,
		...defineRightwardIntersections("alias", (l, r, ctx) => {
			if (r.isUnknown()) return l
			if (r.isNever()) return r
			// a primitive is often disjoint from a cyclic type, which discrimination and morph unions need to know
			if (!r.overlaps($ark.intrinsic.object) && isResolvable(l))
				return intersectOrPipeNodes(l.resolution, r, ctx)
			return operate(l, r, ctx)
		})
	}
}
