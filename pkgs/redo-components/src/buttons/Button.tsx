import React from "react"
import { Button as MuiButton, Typography, Theme } from "@material-ui/core"
import { createStyles } from "@material-ui/styles"
import { ButtonProps as MuiButtonProps } from "@material-ui/core/Button"
import { component, GridProps } from "blocks"
import { Page } from "state"

const styles = (theme: Theme) =>
    createStyles({
        button: {
            textTransform: "none",
            minWidth: theme.spacing(10)
        },
        defaultTextClass: {
            color: theme.palette.primary.contrastText
        }
    })

export type ButtonProps = Partial<MuiButtonProps> &
    GridProps & {
        text: string
        textClass?: string
        linkTo?: Page
    }

export const Button = component({
    name: "Button",
    defaultProps: {} as Partial<ButtonProps>,
    gridded: true,
    store: true,
    styles
})(({ text, textClass, classes, linkTo, onClick, store, ...rest }) => (
    <MuiButton
        className={classes.button}
        {...rest}
        onClick={e => {
            if (onClick) {
                onClick(e)
            }
            if (linkTo) {
                store.mutate({ page: linkTo })
            }
        }}
    >
        <Typography
            className={textClass ? textClass : classes.defaultTextClass}
        >
            {text}
        </Typography>
    </MuiButton>
))
