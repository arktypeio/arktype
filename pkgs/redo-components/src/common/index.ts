export type Kinds<Props> = Record<string, Partial<Props>>

type KindsFunction<Props, Options, K extends Kinds<Props>> = (
    options: Options
) => K

export const makeKinds = <Props>() => <K extends Kinds<Props>, Options>(
    kinds: K | KindsFunction<Props, Options, K>
) =>
    typeof kinds === "function"
        ? (kind: keyof K, options?: Options) => kinds(options!)[kind]
        : (kind: keyof K) => kinds[kind]

export type KindsFrom<T extends (...args: any[]) => any> = Parameters<T>[0]

const useKinds = makeKinds<{ some: "one" | "two" }>()({
    primary: {
        some: "one"
    },
    secondary: {
        some: "two"
    }
})

const x = useKinds("primary")

const useKindsWithOptions = makeKinds<{ some: "one" | "two" }>()(
    (options: { switch: boolean }) => ({
        primary: {
            some: options.switch ? "one" : "two"
        },
        secondary: {
            some: "two"
        }
    })
)

const y = useKindsWithOptions("primary")
