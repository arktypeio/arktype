import React, { FC } from "react"
import MuiButton, {
    ButtonProps as MuiButtonProps
} from "@material-ui/core/Button"
import { makeKinds, KindsFrom } from "../common"

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
    kind: KindsFrom<typeof useKind>
}

export const Button: FC<ButtonProps> = ({ kind, ...props }) => {
    return <MuiButton style={{ minWidth: 80 }} {...useKind(kind)} {...props} />
}
