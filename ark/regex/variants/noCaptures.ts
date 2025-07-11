import type { BaseRegexExecArray, Flags, Regex } from "./shared.ts"

interface Regex<pattern extends string, flags extends Flags>
	extends Regex<pattern, flags, [], {}> {
	exec(s: string): RegexExecArray<pattern> | null
}

interface RegexExecArray<pattern extends string>
	extends BaseRegexExecArray<pattern, []> {}
