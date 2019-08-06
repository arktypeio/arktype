import React, { FC, useState } from "react"
import { TextField, Theme } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { BaseTextFieldProps } from "@material-ui/core/TextField"

const stylize = makeStyles((theme: Theme) => ({
    focused: {},
    disabled: {},
    error: {},
    notchedOutline: {},
    root: {
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
}))

export type OutlinedTextInputProps = Omit<BaseTextFieldProps, "variant">

export const OutlinedTextInput: FC<OutlinedTextInputProps> = props => {
    return (
        <TextField
            variant="outlined"
            InputProps={{
                classes: stylize()
            }}
            {...props}
        />
    )
}
