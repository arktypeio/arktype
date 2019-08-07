import { ValueOf } from "redo-utils"

type ExactPartial<T> = Partial<Record<keyof T, ValueOf<T>>>

export const makeKinds = <Props>() => <
    K extends Record<Key, Partial<Props>>,
    Key extends string,
    Options
>(
    kinds:
        | K & Record<Key, ExactPartial<Props>>
        | ((_: Options) => K & Record<Key, Partial<Props>>)
) => (kind: Key) => kinds[kind]

export type KindsFrom<T extends (...args: any[]) => any> = Parameters<T>[0]

type FakeProps = {
    some: "one" | "two"
    another: number
}

export const f: Partial<FakeProps> = {
    some: "one"
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

const useKinds2 = makeKinds<FakeProps>()((o: boolean) => ({
    primary: {
        some: "one",
        another: 0
    },
    secondary: {
        some: "two"
    }
}))

const y = useKinds("primary")
