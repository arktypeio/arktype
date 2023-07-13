import { throwParseError } from "@arktype/utils"
import type { ConstraintBase } from "./constraint.js"
import type { Predicate } from "./predicate.js"

export interface RegexConstraint extends ConstraintBase {
    source: string
    flags: string
}

export type RegexIntersection = readonly RegexConstraint[]

// converting a regex to a string alphabetizes the flags for us
export const serializeRegex = (regex: RegExp) =>
    `${regex}` as SerializedRegexLiteral

export type SerializedRegexLiteral = `/${string}/${string}`

export const sourceFromRegexLiteral = (literal: SerializedRegexLiteral) =>
    literal.slice(1, literal.lastIndexOf("/"))

export const intersectRegex = (
    predicate: Predicate,
    constraint: RegexConstraint
): RegexIntersection => {
    if (!predicate.pattern) {
        return [constraint]
    }
    const matching = predicate.pattern.find(
        (existing) =>
            existing.source === constraint.source &&
            existing.flags === constraint.flags
    )
    if (!matching) {
        return [...predicate.pattern, constraint]
    }
    // TODO: abstract
    if (matching.description !== constraint.description) {
        return throwParseError(
            `Unable to intersect identical regex with descriptions '${matching.description}' and '${constraint.description}'`
        )
    }
}
