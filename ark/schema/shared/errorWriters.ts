import {
	appendUnique,
	describeCollapsibleDate,
	domainDescriptions,
	domainOf,
	groupBy,
	isValidDate,
	objectKindDescriptions,
	objectKindOrDomainOf,
	printable
} from "@ark/util"
import type { NodeConfig, ResolvedUnknownNodeConfig } from "../config.ts"
import type { Declaration } from "../kinds.ts"
import type { Predicate } from "../predicate.ts"
import type { ArkError, ArkErrorCode } from "./errors.ts"
import type { nodeImplementationInputOf } from "./implement.ts"

export type DescribeBranchesOptions = {
	delimiter?: string
	finalDelimiter?: string
}

export const describeBranches = (
	descriptions: string[],
	opts?: DescribeBranchesOptions
): string => {
	const delimiter = opts?.delimiter ?? ", "
	const finalDelimiter = opts?.finalDelimiter ?? " or "

	if (descriptions.length === 0) return "never"

	if (descriptions.length === 1) return descriptions[0]
	if (
		(descriptions.length === 2 &&
			descriptions[0] === "false" &&
			descriptions[1] === "true") ||
		(descriptions[0] === "true" && descriptions[1] === "false")
	)
		return "boolean"

	// keep track of seen descriptions to avoid duplication
	const seen: Record<string, true | undefined> = {}
	const unique = descriptions.filter(s => (seen[s] ? false : (seen[s] = true)))
	const last = unique.pop()!

	return `${unique.join(delimiter)}${unique.length ? finalDelimiter : ""}${last}`
}

const describePredicate = (predicate: Predicate | undefined) =>
	`valid according to ${predicate?.name || "an anonymous predicate"}`

type writersInputOf<code extends ArkErrorCode> = nodeImplementationInputOf<
	Declaration<code>
>["defaults"]

// completes each code's writers in place, defining those it leaves out
const implementErrorWriters = (writersByCode: {
	[code in ArkErrorCode]: writersInputOf<code>
}): { [code in ArkErrorCode]: Required<NodeConfig<code>> } => {
	let code: ArkErrorCode
	for (code in writersByCode) {
		const writers: ResolvedUnknownNodeConfig = writersByCode[code] as never
		writers.expected ??= ctx =>
			"description" in ctx ?
				(ctx.description as string)
			:	writers.description(ctx as never)
		writers.actual ??= data => printable(data)
		writers.problem ??= ctx =>
			`must be ${ctx.expected}${ctx.actual ? ` (was ${ctx.actual})` : ""}`
		writers.message ??= ctx => {
			if (ctx.path.length === 0) return ctx.problem
			const problemWithLocation = `${ctx.propString} ${ctx.problem}`
			if (problemWithLocation[0] === "[") {
				// clarify paths like [1], [0][1], and ["key!"] that could be confusing
				return `value at ${problemWithLocation}`
			}
			return problemWithLocation
		}
	}
	return writersByCode as never
}

/**
 * The writers each error code is described with unless configured otherwise,
 * one object per code that its node kind's implementation also holds as its
 * defaults. Nothing here imports a node, so emitted code can describe its
 * errors without node, scope or parse code.
 *
 * A description writer is passed a node, or, from the default expected
 * writer, the context of an error created without a description.
 */
export const defaultErrorWriters: {
	[code in ArkErrorCode]: Required<NodeConfig<code>>
} = implementErrorWriters({
	union: {
		description: node =>
			node.distribute(branch => branch.description, describeBranches),
		expected: ctx => {
			const byPath = groupBy(ctx.errors, "propString") as Record<
				string,
				ArkError[]
			>
			const pathDescriptions = Object.entries(byPath).map(([path, errors]) => {
				const branchesAtPath: string[] = []
				for (const errorAtPath of errors)
					appendUnique(branchesAtPath, errorAtPath.expected)

				const expected = describeBranches(branchesAtPath)
				// if there are multiple actual descriptions that differ,
				// just fall back to printable, which is the most specific
				const actual =
					errors.every(e => e.actual === errors[0].actual) ?
						errors[0].actual
					:	printable(errors[0].data)
				return `${path && `${path} `}must be ${expected}${
					actual && ` (was ${actual})`
				}`
			})
			return describeBranches(pathDescriptions)
		},
		problem: ctx => ctx.expected,
		message: ctx => {
			if (ctx.problem[0] === "[") {
				// clarify paths like [1], [0][1], and ["key!"] that could be confusing
				return `value at ${ctx.problem}`
			}

			return ctx.problem
		}
	},
	unit: {
		description: node => printable(node.unit),
		problem: ({ expected, actual }) =>
			`${expected === actual ? `must be reference equal to ${expected} (serialized to the same value)` : `must be ${expected} (was ${actual})`}`
	},
	intersection: {
		description: node => {
			if (node.children.length === 0) return "unknown"
			if (node.structure) return node.structure.description

			const childDescriptions: string[] = []

			if (
				node.basis &&
				!node.prestructurals.some(r => r.impl.obviatesBasisDescription)
			)
				childDescriptions.push(node.basis.description)

			if (node.prestructurals.length) {
				const sortedRefinementDescriptions = node.prestructurals
					.slice()
					// override alphabetization to describe min before max
					.sort((l, r) => (l.kind === "min" && r.kind === "max" ? -1 : 0))
					.map(r => r.description)
				childDescriptions.push(...sortedRefinementDescriptions)
			}

			if (node.inner.predicate)
				childDescriptions.push(...node.inner.predicate.map(p => p.description))

			return childDescriptions.join(" and ")
		},
		expected: source =>
			`  ◦ ${source.errors.map(e => e.expected).join("\n  ◦ ")}`,
		problem: ctx => `(${ctx.actual}) must be...\n${ctx.expected}`
	},
	proto: {
		description: node =>
			node.builtinName ?
				objectKindDescriptions[node.builtinName]
			:	`an instance of ${node.proto.name}`,
		actual: data =>
			data instanceof Date && !isValidDate(data) ?
				"an invalid Date"
			:	objectKindOrDomainOf(data)
	},
	domain: {
		description: node => domainDescriptions[node.domain],
		actual: data =>
			Number.isNaN(data) ? "NaN" : domainDescriptions[domainOf(data)]
	},
	pattern: {
		description: node => `matched by ${node.rule}`
	},
	divisor: {
		description: node =>
			node.rule === 1 ? "an integer"
			: node.rule === 2 ? "even"
			: `a multiple of ${node.rule}`
	},
	exactLength: {
		description: node => `exactly length ${node.rule}`,
		actual: data => `${data.length}`
	},
	max: {
		description: node => {
			if (node.rule === 0) return node.exclusive ? "negative" : "non-positive"
			return `${node.exclusive ? "less than" : "at most"} ${node.rule}`
		}
	},
	min: {
		description: node => {
			if (node.rule === 0) return node.exclusive ? "positive" : "non-negative"
			return `${node.exclusive ? "more than" : "at least"} ${node.rule}`
		}
	},
	maxLength: {
		description: node => `at most length ${node.rule}`,
		actual: data => `${data.length}`
	},
	minLength: {
		description: node =>
			node.rule === 1 ? "non-empty" : `at least length ${node.rule}`,
		// avoid default message like "must be non-empty (was 0)"
		actual: data => (data.length === 0 ? "" : `${data.length}`)
	},
	before: {
		description: node => `${node.collapsibleLimitString} or earlier`,
		actual: describeCollapsibleDate
	},
	after: {
		description: node => `${node.collapsibleLimitString} or later`,
		actual: describeCollapsibleDate
	},
	predicate: {
		description: node => describePredicate(node.predicate),
		// error contexts from ctx.reject have neither a description nor a predicate
		expected: ctx => ctx.description ?? describePredicate(ctx.predicate)
	},
	required: {
		description: node => `${node.compiledKey}: ${node.value.description}`,
		expected: ctx => ctx.missingValueDescription,
		actual: () => "missing"
	}
})
