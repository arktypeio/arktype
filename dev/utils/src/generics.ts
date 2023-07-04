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

export type equals<t, u> = (<_>() => _ extends t ? 1 : 2) extends <
    _
>() => _ extends u ? 1 : 2
    ? true
    : false

export const id = Symbol("id")

export type id = typeof id

export type nominal<t, id extends string> = t & {
    readonly [id]: id
}

export type extend<t, u extends { [k in keyof t]: t[k] }> = u

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type subsume<t extends u, u> = u

export type defined<t> = t & ({} | null)

export type autocomplete<suggestions extends string> =
    | suggestions
    | (string & {})
