type Exact<T> = Record<keyof T, T[keyof T]>

export const makeKinds = <Props>() => <
    Kinds extends Record<Kind, Partial<Props>>,
    Kind extends string,
    Options
>(
    kinds:
        | Kinds & Record<Kind, Partial<Exact<Props>>>
        | ((_: Options) => Record<Kind, Partial<Exact<Props>>>)
) =>
    typeof kinds === "function"
        ? (kind: Kind, options?: Options) => kinds(options!)[kind]
        : (kind: Kind) => kinds[kind]

export type KindFrom<T extends (...args: any[]) => any> = Parameters<T>[0]
