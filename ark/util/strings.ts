export const capitalize = <s extends string>(s: s): Capitalize<s> =>
	(s[0].toUpperCase() + s.slice(1)) as never
