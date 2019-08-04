import React, { FC } from "react"
import { TextField } from "@material-ui/core"
import { BaseTextFieldProps } from "@material-ui/core/TextField"

export type UnderlinedTextInputProps = Omit<BaseTextFieldProps, "variant">

export const UnderlinedTextInput: FC<UnderlinedTextInputProps> = ({
    ...props
}) => <TextField variant="standard" {...props} />
