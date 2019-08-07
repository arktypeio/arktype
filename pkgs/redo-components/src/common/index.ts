import MuiButton, {
    ButtonProps as MuiButtonProps
} from "@material-ui/core/Button"

type Exact<T> = Record<keyof T, T[keyof T]>

export const makeKinds = <Props>() => <
    Input extends Kinds | ((_: Options) => Kinds),
    Kinds extends Record<Kind, Partial<Props>>,
    Kind extends string,
    Options extends any
>(
    input: Input
) => 5
// typeof input === "function"
//     ? (
//           kind: Kind,
//           options: Input extends (options: any) => any
//               ? Parameters<Input>
//               : never
//       ) => input(options)[kind]
//     : (kind: Kind) => (input as Kinds)[kind]

export type KindFrom<T extends (...args: any[]) => any> = Parameters<T>[0]

type FakeProps = {
    some: "one" | "two"
    another: number
}

const useKindsWithOptions = makeKinds<FakeProps>()((s: boolean) => ({
    primary: {
        some: "one"
    },
    secondary: {
        some: "two"
    }
}))

const useKinds = makeKinds<FakeProps>()({
    primary: {
        some: "one",
        another: 
    },
    secondary: {
        some: "two"
    }
})

const useKind = makeKinds<MuiButtonProps>()({
    primary: {
        color: "primary",
        variant: "contained"
    },
    secondary: {
        variant: "outlined",
        style: {
            color: "black"
        }
    }
})
