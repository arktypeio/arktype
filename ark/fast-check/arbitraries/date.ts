import type { nodeOfKind, RefinementKind } from "@ark/schema"
import type { array } from "@ark/util"
import { date, type Arbitrary } from "fast-check"
import type { ProtoInputNode } from "./proto.ts"

type DateConstraints = { min?: Date; max?: Date }

export const buildDateArbitrary = (node: ProtoInputNode): Arbitrary<Date> => {
	if (node.hasKind("intersection")) {
		const dateConstraints: DateConstraints = getDateRefinements(
			node.refinements
		)
		return date(dateConstraints)
	}
	return date()
}

const getDateRefinements = (refinements: array<nodeOfKind<RefinementKind>>) => {
	const ruleByRefinementKind: DateConstraints = {}
	for (const refinement of refinements) {
		if (refinement.hasKind("after")) ruleByRefinementKind.min = refinement.rule
		else if (refinement.hasKind("before"))
			ruleByRefinementKind.max = refinement.rule
	}
	return ruleByRefinementKind
}
