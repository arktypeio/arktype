export const makeKinds = <Props>() => <
    Kind extends string,
    Options = undefined
>(
    kinds:
        | Record<Kind, Partial<Props>>
        | ((options: Options) => Record<Kind, Partial<Props>>)
) =>
    ((typeof kinds === "function"
        ? (kind: Kind, options: Options) => kinds(options)[kind]
        : (kind: Kind) => kinds[kind]) as any) as Options extends undefined
        ? (kind: Kind) => Record<Kind, Partial<Props>>
        : (
              kind: Kind,
              // Boolean expansion is a workaround for:
              // https://github.com/Microsoft/TypeScript/issues/30029
              options: Options extends boolean ? true | false : Options
          ) => Record<Kind, Partial<Props>>

export type KindFrom<T extends (...args: any[]) => any> = Parameters<T>[0]
