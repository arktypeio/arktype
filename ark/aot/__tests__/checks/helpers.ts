export const optional = <def extends string>(def: def) =>
	`${def} | undefined` as const
