import type { BaseRegex, Flags } from "../regex.ts"

type Regex<
	pattern extends string,
	captures extends string[],
	flags extends Flags
> = BaseRegex<pattern, captures, flags, {}>

export type { Regex as FlagsRegex }
