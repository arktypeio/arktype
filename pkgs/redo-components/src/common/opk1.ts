import { ValueOf } from "redo-utils"

type ExactPartial<T> = Partial<Record<keyof T, ValueOf<T>>>

export const makeKinds = <Props>() => <
    Kind extends Record<Key, Partial<Props>>,
    KindFunction extends (options: Options) => Kind,
    Key extends string,
    Options extends Input extends KindFunction ? any : never,
    Input extends Kind | KindFunction
>(
    kinds: Input
) =>
    typeof kinds === "function"
        ? (kind: Key, options?: Options) =>
              (kinds as KindFunction)(options!)[kind]
        : (kind: Key) => (kinds as Kind)[kind]

export type KindsFrom<T extends (...args: any[]) => any> = Parameters<T>[0]

type FakeProps = {
    some: "one" | "two" | "original" | "switched"
    another: number
}

const useKinds = makeKinds<FakeProps>()({
    primary: {
        some: "one",
        another: 0
    },
    secondary: {
        some: "two"
    }
})

const x = useKinds("primary")

const useKindsWithOptions = makeKinds<FakeProps>()((switcheroo: boolean) => ({
    primary: {
        some: switcheroo ? "switched" : "original",
        another: 0
    },
    secondary: {
        some: "two"
    }
}))

const y = useKindsWithOptions("primary", true)
