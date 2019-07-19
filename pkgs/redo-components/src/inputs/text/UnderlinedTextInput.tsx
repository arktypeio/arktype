import React from "react"
import { TextField, Theme } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { BaseTextFieldProps } from "@material-ui/core/TextField"

const styles = makeStyles((theme: Theme) => {})

export type UnderlinedTextInputProps = Omit<BaseTextFieldProps, "variant">

export const UnderlinedTextInput = ({
    classes,
    ...rest
}: UnderlinedTextInputProps) => <TextField variant="standard" {...rest} />
