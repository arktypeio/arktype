import type { BaseNode } from "@ark/schema"
import { throwInternalError } from "@ark/util"
import { letrec, type Arbitrary, type LetrecValue } from "fast-check"
import type { Ctx } from "../fastCheckContext.ts"

export const buildCyclicArbitrary = (
	node: BaseNode,
	buildRoot: () => Arbitrary<unknown>,
	ctx: Ctx
): Arbitrary<unknown> => {
	if (!hasFiniteMember(node, new Set()))
		throwInternalError("Infinitely deep cycles are not supported.")
	const objectArbitrary: LetrecValue<unknown> = letrec(tie => {
		ctx.tieStack.push(tie)
		const arbitraries: Record<string, Arbitrary<unknown>> = {
			root: buildRoot(),
			...ctx.arbitrariesByIntersectionId
		}
		ctx.tieStack.pop()
		// an intersection still being built encloses the root, so an alias to it, e.g. from a type parsed as its own alias, ties to the root
		for (const id in ctx.seenIntersectionIds)
			arbitraries[id] ??= arbitraries.root
		return arbitraries
	})
	return (objectArbitrary as never)["root"]
}

// an alias already being resolved can't contribute to a finite member
const hasFiniteMember = (node: BaseNode, resolving: Set<string>): boolean => {
	if (node.hasKind("alias")) {
		const id = node.resolution.id
		if (resolving.has(id)) return false
		resolving.add(id)
		const result = hasFiniteMember(node.resolution, resolving)
		resolving.delete(id)
		return result
	}
	if (node.hasKind("union"))
		return node.children.some(child => hasFiniteMember(child, resolving))
	if (node.hasKind("morph"))
		return !node.head || hasFiniteMember(node.head, resolving)
	if (!node.hasKind("intersection") || !node.structure) return true
	const structure = node.structure
	return (
		structure.required?.every(prop =>
			hasFiniteMember(prop.value, resolving)
		) !== false &&
		(structure.sequence?.tuple ?? []).every(
			element =>
				(element.kind !== "prefix" && element.kind !== "postfix") ||
				hasFiniteMember(element.node, resolving)
		)
	)
}
