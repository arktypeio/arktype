import {
	After,
	Before,
	Max,
	MaxLength,
	Min,
	MinLength,
	refinementKinds,
	type NodeKind,
	type nodeOfKind,
	type RefinementKind
} from "@ark/schema"
import { hasKey, throwInternalError } from "@ark/util"
import type { NodeDetails } from "./arktypeFastCheck.ts"

export type Constraint = Partial<ConstraintNameToType>

type ConstraintNameToType = {
	divisor: number
	pattern: string
	min: number
	max: number
	minLength: number
	maxLength: number
	exactLength: number
	after: Date
	before: Date
}

type HandleConstraint = {
	child: nodeOfKind<NodeKind>
	lastNode: NodeDetails
}

export const handleConstraint = ({
	child,
	lastNode
}: HandleConstraint): boolean => {
	let constraintAdded = false
	const kind = child.kind
	const rule = hasKey(child, "rule") ? child.rule : undefined
	const constraint: Partial<
		Record<RefinementKind, Constraint[RefinementKind]>
	> = {}
	if (isRefinementKind(kind)) {
		if (numberConstraintKeywords.includes(kind)) {
			if (isNumberConstraint(rule)) {
				constraint[kind] =
					hasKey(child, "exclusive") && child.exclusive === true ?
						kind === "min" ?
							rule + 1
						:	rule - 1
					:	rule
			}
		} else if (lengthConstraintKeywords.includes(kind)) constraint[kind] = rule
		else if (kind === "divisor") constraint.divisor = rule
		else if (kind === "pattern") {
			if (lastNode.pattern !== undefined)
				throwInternalError("Regex Intersection is not implemented.")
			constraint.pattern = rule
		} else if (kind === "exactLength") constraint.exactLength = rule
		else if (dateConstraintKeywords.includes(kind)) {
			if (kind === "before") constraint.before = rule
			else constraint.after = rule
		}
		if (Object.keys(constraint).length > 0) {
			Object.assign(lastNode, constraint)
			constraintAdded = true
		}
	}
	return constraintAdded
}

const numberConstraintKeywords = [
	Min.implementation.kind,
	Max.implementation.kind
] as string[]

const dateConstraintKeywords = [
	Before.implementation.kind,
	After.implementation.kind
] as string[]

const lengthConstraintKeywords = [
	MinLength.implementation.kind,
	MaxLength.implementation.kind
] as string[]

const isNumberConstraint = (rule: unknown): rule is number =>
	typeof rule === "number"

const isRefinementKind = (kind: NodeKind): kind is RefinementKind =>
	refinementKinds.includes(kind as never)
