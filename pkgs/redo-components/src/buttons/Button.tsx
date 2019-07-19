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
    },
    defaultText: {
        color: theme.palette.primary.contrastText
    }
}))

export type ButtonProps = Partial<MuiButtonProps> & {
    text: string
    textClass?: string
}

export const Button = ({ text, textClass, ...rest }: ButtonProps) => {
    const { button, defaultText } = stylize()
    return (
        <MuiButton className={button} {...rest}>
            <MuiTypography className={textClass ? textClass : defaultText}>
                {text}
            </MuiTypography>
        </MuiButton>
    )
}
