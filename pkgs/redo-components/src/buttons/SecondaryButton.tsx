import React from "react"
import { Theme } from "@material-ui/core"
import { createStyles } from "@material-ui/styles"
import { component } from "blocks"
import { Button, ButtonProps } from "./Button"

const styles = (theme: Theme) =>
    createStyles({
        text: {
            color: theme.palette.common.black
        }
    })

export type SecondaryButtonProps = ButtonProps

export const SecondaryButton = component({
    name: "SecondaryButton",
    defaultProps: {} as Partial<SecondaryButtonProps>,
    styles
})(({ classes, ...rest }) => (
    <Button textClass={classes.text} variant="outlined" {...rest} />
))
