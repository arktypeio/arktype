import type { Stringifiable } from "@arktype/util"

export type astToString<
	ast,
	result extends string = ""
> = ast extends readonly [infer head, ...infer tail]
	? astToString<
			tail,
			`${result extends "" ? "" : `${result} `}${astToString<head, "">}`
	  >
	: ast extends Stringifiable
	? `${result}${ast extends bigint ? `${ast}n` : ast}`
	: result
