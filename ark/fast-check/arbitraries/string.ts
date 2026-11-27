import type {
	IntersectionNode,
	nodeOfKind,
	PrestructuralKind
} from "arktype/schema"
import { throwInternalError, type array } from "arktype/util"
import * as fc from "fast-check"
import type { DomainInputNode } from "./domain.ts"

const minIsoDate = new Date("0000-01-01T00:00:00.000Z")
const maxIsoDate = new Date("9999-12-31T23:59:59.999Z")

const getKeywordStringArbitrary = (
	node: IntersectionNode
): fc.Arbitrary<string> | undefined => {
	const predicates = node.inner.predicate
	if (!predicates) return
	for (const pred of predicates) {
		switch (pred.meta.keyword) {
			case "string.url":
			case "string.url.http":
				return fc.webUrl()
			case "string.date":
				return fc
					.date({ min: minIsoDate, max: maxIsoDate, noInvalidDate: true })
					.map(d => d.toISOString())
			case "string.json":
				return fc.json()
		}
	}
}

export const buildStringArbitrary = (
	node: DomainInputNode
): fc.Arbitrary<string> => {
	if (node.is("domain")) return fc.string()
	const stringConstraints = getFastCheckStringConstraints(node.preStruct)
	const keywordArbitrary = getKeywordStringArbitrary(node)
	if (keywordArbitrary) {
		const { minLength, maxLength, pattern, flags } = stringConstraints
		const regex = pattern !== undefined ? new RegExp(pattern, flags) : undefined
		return (
				minLength !== undefined ||
					maxLength !== undefined ||
					regex !== undefined
			) ?
				keywordArbitrary.filter(
					s =>
						(minLength === undefined || s.length >= minLength) &&
						(maxLength === undefined || s.length <= maxLength) &&
						(regex === undefined || regex.test(s))
				)
			:	keywordArbitrary
	}
	if ("pattern" in stringConstraints) {
		if (
			stringConstraints.minLength !== undefined ||
			stringConstraints.maxLength !== undefined
		)
			throwInternalError("Bounded regex is not supported.")
		const base = fc.stringMatching(
			new RegExp(stringConstraints.pattern, stringConstraints.flags)
		)
		return stringConstraints.originalRegex ?
				base.filter(s => stringConstraints.originalRegex!.test(s))
			:	base
	}

	return fc.string(stringConstraints)
}

const getFastCheckStringConstraints = (
	refinements: array<nodeOfKind<PrestructuralKind>>
) => {
	const stringConstraints: fc.StringConstraints & {
		pattern?: string
		flags?: string
		originalRegex?: RegExp
	} = {}
	for (const refinement of refinements) {
		if (refinement.is("pattern")) {
			if (stringConstraints.pattern !== undefined) {
				throwInternalError(
					"Multiple regexes on a single node is not supported."
				)
			}
			stringConstraints["pattern"] = refinement.rule
			// the flags change what the source means (under u, \u{1F600} is one
			// code point rather than the text "u{1F600}"), so they must reach
			// fast-check. It rejects i, so drop i when calling stringMatching
			// and filter against the original RegExp so negated classes like
			// /[^a]/i never emit failing characters. Flags it cannot honor
			// soundly (y, v) are passed through so it throws rather than
			// generating strings the type rejects.
			if (refinement.flags) {
				stringConstraints["flags"] = refinement.flags.replace("i", "")
				if (refinement.flags.includes("i")) {
					stringConstraints["originalRegex"] = new RegExp(
						refinement.rule,
						refinement.flags
					)
				}
			}
		} else if (refinement.is("exactLength")) {
			stringConstraints["minLength"] = refinement.rule
			stringConstraints["maxLength"] = refinement.rule
		} else
			stringConstraints[refinement.kind as never] = refinement.rule as never
	}
	return stringConstraints
}
