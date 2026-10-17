import type { ResolvedConfig } from "../config.ts"
import {
	ArkErrors,
	ArkTraversal,
	errorOfIssue,
	type ArkError
} from "./errors.ts"
import { $ark } from "./registry.ts"
import { rootApplyRuntime } from "./rootApply.ts"
import { Traversal, type FailHandler } from "./traversal.ts"

// errors "first" stops at the first issue, dropping any added after it
export class ArkFirstIssueTraversal extends ArkTraversal {
	override get failFast(): boolean {
		return true
	}

	override finalize(onFail?: FailHandler | null): unknown {
		const errors = this._errors?._
		if (errors && errors.length > 1) errors.length = 1
		return super.finalize(onFail)
	}
}

/**
 * The errors a Type configured with `errors: "none"` returns: one issue at
 * the root, whose message is `is invalid`.
 */
export class UndetailedErrors extends ArkErrors {
	override get issues(): readonly ArkError[] {
		return this._.reduce(
			(issues, issue) => ((issue.message ??= "is invalid"), issues),
			this._
		)
	}

	override get summary(): string {
		return this._.reduce(
			(summary, issue) =>
				summary + (summary && "\n") + (issue.message ?? "is invalid"),
			""
		)
	}

	override toLocaleString(): string {
		return this.summary
	}

	// merged into arktype's errors as a standalone validator's issues are
	override get _issues(): ArkError[] {
		return this.issues.map(issue =>
			errorOfIssue(issue, [], $ark.resolvedConfig!)
		)
	}
}

// errors "none" fails a root with one issue, whatever ctx added
export class UndetailedTraversal extends Traversal {
	override createErrors(): UndetailedErrors {
		return new UndetailedErrors(this.config)
	}

	// a root apply finalizes it only once data is invalid
	override finalize(onFail?: FailHandler | null): unknown {
		return rejectUndetailed(null, this.root, this.config, onFail)
	}
}

const undetailedPrototype = UndetailedErrors.prototype

// errors "none" in place of applyRejected, which would apply node
export const rejectUndetailed = (
	node: unknown,
	data: unknown,
	config: ResolvedConfig,
	onFail: FailHandler | null | undefined
): unknown => {
	// one issue at the root reads none of the fields a constructor sets
	const errors: UndetailedErrors = Object.create(undetailedPrototype)
	errors._ = [{ code: "predicate", path: [], data } as never]
	return onFail ? onFail(errors as never) : errors
}

// what a root apply reads in place of rootApplyRuntime, by its errors
$ark.errorModes = {
	first: { ...rootApplyRuntime, Traversal: ArkFirstIssueTraversal },
	none: {
		...rootApplyRuntime,
		Traversal: UndetailedTraversal,
		applyCyclic: (node: unknown, data: unknown, ctx: never) => ctx,
		applyRejected: rejectUndetailed
	} as never
}
