export type evaluate<t> = { [k in keyof t]: t[k] } & unknown

export type entryOf<o> = {
	[k in keyof o]-?: [k, o[k] & ({} | null)]
}[o extends readonly unknown[] ? keyof o & number : keyof o] &
	unknown

type Entry<key extends PropertyKey = PropertyKey, value = unknown> = readonly [
	key: key,
	value: value
]

export type fromEntries<entries, result = {}> = entries extends readonly [
	Entry<infer k, infer v>,
	...infer tail
]
	? fromEntries<tail, result & { [_ in k]: v }>
	: evaluate<result>

export type intersectUnion<t> = (
	t extends unknown ? (_: t) => void : never
) extends (_: infer intersection) => void
	? intersection
	: never

type listable<t> = t | readonly t[]
