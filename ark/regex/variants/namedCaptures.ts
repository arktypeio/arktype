import type { BaseRegex, Flags, NamedCaptures } from "../regex.ts"

type Regex<
	pattern extends string,
	flags extends Flags,
	captures extends string[],
	namedCaptures extends NamedCaptures
> = BaseRegex<pattern, captures, flags, namedCaptures>

export type { Regex as NamedCapturesRegex }
