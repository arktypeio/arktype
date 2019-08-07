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

export const Button: FC<ButtonProps> = ({ kind = "primary", ...props }) => {
    return <MuiButton style={{ minWidth: 80 }} {...useKind(kind)} {...props} />
}
