import { namesTraversalError } from "./issueFeatures.ts"
import type { ArkIssue } from "./issues.ts"
import { lineOf } from "./issuesUndetailed.ts"

export * from "./issuesUndetailed.ts"

// in place of issuesNone.ts's errors, written for size
export class ArkErrors {
	_: ArkIssue[] = []

	get count(): number {
		return this._.length
	}

	get issues(): readonly ArkIssue[] {
		for (const issue of this._) {
			issue.expected ??= "valid"
			issue.message ??= "is invalid"
		}
		return (this._ as IssuesWithToJson).toJSON ?
				this._
			:	Object.defineProperty(this._, "toJSON", issuesToJson)
	}

	get summary(): string {
		return this._.reduce(
			(summary, issue) => summary + (summary && "\n") + lineOf(issue),
			""
		)
	}

	summaryIn(): string {
		return this.summary
	}

	// as issuesNone.ts's
	throw(): never {
		if (namesTraversalError) throw new ThrownErrors(this)
		if (definedThrown) throw new definedThrown(this)
		const thrown = Error(this.summary)
		thrown.name = "TraversalError"
		throw Object.defineProperty(thrown, "arkErrors", { value: this })
	}

	toJSON(): readonly object[] {
		return this.issues.map(jsonIssueOf)
	}

	toString(): string {
		return this.summary
	}

	[Symbol.iterator](): IterableIterator<ArkIssue> {
		return this.issues[Symbol.iterator]()
	}
}

export { ArkErrors as FirstIssues }

type IssuesWithToJson = ArkIssue[] & { toJSON?: () => readonly object[] }

const jsonIssueOf = ({ code, path, expected, message }: ArkIssue): object => ({
	code,
	path: path.map(k => (typeof k === "symbol" ? String(k) : k)),
	...(expected !== undefined && { expected }),
	message
})

const issuesToJson: PropertyDescriptor & ThisType<readonly ArkIssue[]> = {
	value() {
		return this.map(jsonIssueOf)
	},
	writable: true,
	configurable: true
}

interface ThrownErrors extends Error {
	readonly name: "TraversalError"
	arkErrors: ArkErrors
}

// as issuesNone.ts's
let definedThrown: (new (errors: ArkErrors) => ThrownErrors) | undefined

const ThrownErrors: new (errors: ArkErrors) => ThrownErrors =
	/* @__PURE__ */ (() =>
		(definedThrown = class TraversalError extends Error {
			declare readonly name: "TraversalError"
			declare arkErrors: ArkErrors

			constructor(errors: ArkErrors) {
				super(errors.summary)
				this.name = "TraversalError"
				Object.defineProperty(this, "arkErrors", { value: errors })
			}
		}))()

export { ThrownErrors as TraversalError }
