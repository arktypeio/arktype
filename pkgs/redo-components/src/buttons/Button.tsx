import React, { FC } from "react"
import MuiButton, {
    ButtonProps as MuiButtonProps
} from "@material-ui/core/Button"
import { makeKinds, KindFrom } from "../common"

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

export type ButtonProps = MuiButtonProps & {
    kind?: KindFrom<typeof useKind>
}

export function Button({ kind = "primary", style, ...rest }: ButtonProps) {
    const { style: kindStyle, ...kindRest } = useKind(kind)
    return (
        <MuiButton
            fullWidth={false}
            style={{
                minWidth: 80,
                textTransform: "none",
                ...(kindStyle ? kindStyle : {}),
                ...(style ? style : {})
            }}
            {...kindRest}
            {...rest}
        />
    )
}

// const Button: FC<ButtonProps> = ({ kind = "primary", style, ...rest }) => {
//     const { style: kindStyle, ...kindRest } = useKind(kind)
//     return (
//         <MuiButton
//             fullWidth={false}
//             style={{
//                 minWidth: 80,
//                 textTransform: "none",
//                 ...(kindStyle ? kindStyle : {}),
//                 ...(style ? style : {})
//             }}
//             {...kindRest}
//             {...rest}
//         />
//     )
// }
