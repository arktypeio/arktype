import React from "react"
import { Merge } from "@re-do/utils"
import MuiButton, {
    ButtonProps as MuiButtonProps
} from "@material-ui/core/Button"
import { ButtonBaseProps } from "@material-ui/core/ButtonBase"
import MuiIconButton from "@material-ui/core/IconButton"
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

export type ButtonProps = Merge<
    ButtonBaseProps,
    {
        kind?: KindFrom<typeof useKind>
        Icon?: (...args: any[]) => JSX.Element
        fontSize?: number
        textColor?: string
        color?: string
    }
>

export const Button = ({
    kind = "primary",
    style,
    Icon,
    fontSize,
    color,
    textColor,
    ...rest
}: ButtonProps) => {
    const { style: kindStyle, ...kindRest } = useKind(kind)
    const props: any = { ...kindRest, ...rest }
    const styles = { ...kindStyle, ...style, fontSize }
    return Icon ? (
        <MuiIconButton style={styles} {...props}>
            <Icon style={{ fontSize, color }} />
        </MuiIconButton>
    ) : (
        <MuiButton
            fullWidth={false}
            style={{ ...styles, background: color, color: textColor }}
            {...props}
        />
    )
}
