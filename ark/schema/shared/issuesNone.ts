import { arkKind } from "@ark/util"
import type { ArkIssue } from "./issues.ts"

export * from "./issuesUndetailed.ts"

// in place of issues.ts, so errors "none" ships nothing writing detail
export class ArkErrors {
	_: ArkIssue[] = []

	get [arkKind](): "errors" {
		return "errors"
	}

	get count(): number {
		return this._.length
	}

	get issues(): readonly ArkIssue[] {
		return this._.reduce(
			(issues, issue) => ((issue.message ??= "is invalid"), issues),
			this._
		)
	}

	get summary(): string {
		return this._.reduce(
			(summary, issue) =>
				summary + (summary && "\n") + (issue.message ?? "is invalid"),
			""
		)
	}

	toJSON(): readonly ArkIssue[] {
		return this.issues
	}

	toString(): string {
		return this.summary
	}
}

export { ArkErrors as FirstIssues }
