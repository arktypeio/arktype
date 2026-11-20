import * as fc from "fast-check"
import type { ProtoInputNode } from "./proto.ts"

export const buildDateArbitrary = (
	node: ProtoInputNode
): fc.Arbitrary<Date> => {
	// Date rejects an invalid Date, which fast-check 4 generates by default
	const fastCheckDateConstraints: fc.DateConstraints = { noInvalidDate: true }
	if (node.is("intersection")) {
		if (node.inner.after) {
			const min =
				node.inner.after.exclusive ?
					new Date(node.inner.after.rule.getTime() + 1)
				:	node.inner.after.rule
			if (Number.isNaN(min.getTime())) {
				throw new Error(
					`No Date value satisfies >${node.inner.after.rule.toISOString()}`
				)
			}
			fastCheckDateConstraints.min = min
		}
		if (node.inner.before) {
			const max =
				node.inner.before.exclusive ?
					new Date(node.inner.before.rule.getTime() - 1)
				:	node.inner.before.rule
			if (Number.isNaN(max.getTime())) {
				throw new Error(
					`No Date value satisfies <${node.inner.before.rule.toISOString()}`
				)
			}
			fastCheckDateConstraints.max = max
		}
		if (
			fastCheckDateConstraints.min &&
			fastCheckDateConstraints.max &&
			fastCheckDateConstraints.min > fastCheckDateConstraints.max
		) {
			throw new Error(
				`No Date value satisfies >${fastCheckDateConstraints.min.toISOString()} & <${fastCheckDateConstraints.max.toISOString()}`
			)
		}
	}
	return fc.date(fastCheckDateConstraints)
}
