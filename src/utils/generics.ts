export type asConst<t> = t extends [] ? t : asConstRecurse<t>

type asConstRecurse<t> = {
    [k in keyof t]: t[k] extends Literalable | [] ? t[k] : asConstRecurse<t[k]>
}

export type Literalable = string | boolean | number | bigint | null | undefined

export type evaluate<t> = { [k in keyof t]: t[k] } & unknown

export type exact<t, u> = {
    [k in keyof t]: k extends keyof u ? t[k] : never
}

export type defer<t> = [t][t extends any ? 0 : never]

export type merge<base, merged> = evaluate<Omit<base, keyof merged> & merged>

export type isAny<t> = [unknown, t] extends [t, {}] ? true : false

export type isNever<t> = [t] extends [never] ? true : false

export type isUnknown<t> = unknown extends t
    ? [t] extends [{}]
        ? false
        : true
    : false

export type conform<t, base> = t extends base ? t : base

/** Check for type equality without breaking TS for this repo. Fails on some types like Dict/{} */
export type equals<t, u> = identity<t> extends identity<u> ? true : false

export type identity<t> = (_: t) => t

export declare const id: unique symbol

export type nominal<t, id extends string> = t & {
    readonly [id]: id
}

export type extend<t, u extends t> = u

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type subsume<t extends u, u> = u

export type defined<t> = t & ({} | null)

export type autocomplete<suggestions extends string> =
    | suggestions
    | (string & {})
