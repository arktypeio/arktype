import React from "react"
import {
    Button as MuiButton,
    Typography as MuiTypography,
    Theme
} from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { ButtonProps as MuiButtonProps } from "@material-ui/core/Button"

const stylize = makeStyles((theme: Theme) => ({
    button: {
        textTransform: "none",
        minWidth: theme.spacing(10)
    }
}))

export type ButtonProps = Partial<MuiButtonProps> & {}

export const Button = ({ children, ...rest }: ButtonProps) => {
    const { button } = stylize()
    return (
        <MuiButton className={button} {...rest}>
            {children}
        </MuiButton>
    )
}
