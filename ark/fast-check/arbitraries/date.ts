import * as fc from "fast-check"
import type { ProtoInputNode } from "./proto.ts"

export const buildDateArbitrary = (
	node: ProtoInputNode
): fc.Arbitrary<Date> => {
	if (node.hasKind("intersection")) {
		const fastCheckDateConstraints: fc.DateConstraints = {}
		if (node.inner.after) fastCheckDateConstraints.min = node.inner.after.rule
		if (node.inner.before) fastCheckDateConstraints.max = node.inner.before.rule

		return fc.date(fastCheckDateConstraints)
	}
	return fc.date()
}
