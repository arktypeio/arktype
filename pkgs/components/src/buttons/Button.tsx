import React from "react"
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

export const Button = ({ kind = "primary", style, ...rest }: ButtonProps) => {
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
