import * as fc from "fast-check"
import type { ProtoInputNode } from "./proto.ts"

export const buildDateArbitrary = (
	node: ProtoInputNode
): fc.Arbitrary<Date> => {
	// Date rejects an invalid Date, which fast-check 4 generates by default
	const fastCheckDateConstraints: fc.DateConstraints = { noInvalidDate: true }
	if (node.is("intersection")) {
		if (node.inner.after) fastCheckDateConstraints.min = node.inner.after.rule
		if (node.inner.before) fastCheckDateConstraints.max = node.inner.before.rule
	}
	return fc.date(fastCheckDateConstraints)
}
