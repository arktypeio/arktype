import * as fc from "fast-check"
import type { ProtoInputNode } from "./proto.ts"

export const buildDateArbitrary = (
	node: ProtoInputNode
): fc.Arbitrary<Date> => {
	if (node.hasKind("intersection")) {
		const fastCheckDateConstraints: fc.DateConstraints = {}
		if (node.after) fastCheckDateConstraints.min = node.after.rule
		if (node.before) fastCheckDateConstraints.max = node.before.rule

		return fc.date(fastCheckDateConstraints)
	}
	return fc.date()
}
