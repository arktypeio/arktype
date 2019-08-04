import React, { FC } from "react"
import { Button as MuiButton, Theme } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { ButtonProps as MuiButtonProps } from "@material-ui/core/Button"

const stylize = makeStyles((theme: Theme) => ({
    button: {
        textTransform: "none",
        minWidth: theme.spacing(10)
    }
}))

export type ButtonProps = Partial<MuiButtonProps> &
    Required<Pick<MuiButtonProps, "onClick">>

export const Button: FC<ButtonProps> = props => {
    const { button } = stylize()
    return <MuiButton className={button} {...props} />
}
