import { ValueOf } from "redo-utils"

type ExactPartial<T> = Partial<Record<keyof T, ValueOf<T>>>

type KindsInput<Kinds, Options> =
    | Kinds
    | ((options: Options) => ExactPartial<Kinds>)

export const makeKinds = <Props>() => <
    K extends Record<Key, Partial<Props>>,
    Key extends string,
    Options
>(
    kinds: KindsInput<K & Record<Key, ExactPartial<Props>>, Options>
) =>
    typeof kinds === "function"
        ? (kind: Key, options?: Options) => kinds(options!)[kind]
        : (kind: Key) => kinds[kind]

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
