import React from "react"
import { TextField, Theme } from "@material-ui/core"
import { createStyles } from "@material-ui/styles"
import { BaseTextFieldProps } from "@material-ui/core/TextField"
import { component } from "blocks"

const styles = (theme: Theme) => createStyles({})

export type UnderlinedTextInputProps = Omit<BaseTextFieldProps, "variant">

export const UnderlinedTextInput = component({
    name: "UnderlinedTextInput",
    defaultProps: {} as Partial<UnderlinedTextInputProps>,
    styles
})(({ classes, ...rest }) => <TextField variant="standard" {...rest} />)
