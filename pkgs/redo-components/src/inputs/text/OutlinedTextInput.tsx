import React from "react"
import { TextField, Theme } from "@material-ui/core"
import { createStyles } from "@material-ui/styles"
import { BaseTextFieldProps } from "@material-ui/core/TextField"
import { component } from "blocks"

const styles = (theme: Theme) =>
    createStyles({
        focused: {},
        disabled: {},
        error: {},
        notchedOutline: {},
        input: {
            color: theme.palette.primary.dark,
            "&$focused $notchedOutline": {
                borderColor: theme.palette.secondary.main
            },
            "&:not($focused) $notchedOutline": {
                borderColor: theme.palette.primary.light
            },
            "&$error $notchedOutline": {
                borderColor: theme.palette.error.main
            },
            "&:hover:not($disabled):not($focused):not($error) $notchedOutline": {
                borderColor: theme.palette.primary.dark,
                "@media (hover: none)": {
                    borderColor: theme.palette.primary.light
                }
            }
        }
    })

export type OutlinedTextInputProps = Omit<BaseTextFieldProps, "variant">

export const OutlinedTextInput = component({
    name: "OutlinedTextInput",
    defaultProps: {} as Partial<OutlinedTextInputProps>,
    styles
})(({ classes, ...rest }) => (
    <TextField
        variant="outlined"
        InputProps={{
            classes: {
                notchedOutline: classes.notchedOutline,
                disabled: classes.disabled,
                error: classes.error,
                focused: classes.focused,
                root: classes.input
            }
        }}
        {...rest}
    />
))
