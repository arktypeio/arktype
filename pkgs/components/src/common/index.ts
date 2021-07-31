export const makeKinds =
    <Props>() =>
    <Kind extends string, Options = undefined>(
        kinds:
            | Record<Kind, Partial<Props>>
            | ((options: Options) => Record<Kind, Partial<Props>>)
    ) =>
        (typeof kinds === "function"
            ? (kind: Kind, options: Options) => kinds(options)[kind]
            : (kind: Kind) => kinds[kind]) as any as Options extends undefined
            ? (kind: Kind) => Partial<Props>
            : (kind: Kind, options: Options) => Partial<Props>

export type KindFrom<T extends (...args: any[]) => any> = Parameters<T>[0]
