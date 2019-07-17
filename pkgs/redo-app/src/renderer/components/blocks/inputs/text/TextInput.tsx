import React from "react"
import { Theme } from "@material-ui/core"
import { createStyles } from "@material-ui/styles"
import { BaseTextFieldProps } from "@material-ui/core/TextField"
import { component, ErrorText } from "blocks"
import { TextInputVariants } from "./TextInputVariants"

const styles = (theme: Theme) =>
    createStyles({
        label: {
            color: theme.palette.primary.light,
            "&$focused": {
                color: theme.palette.primary.dark
            }
        }
    })

export type BaseTextFieldVariantProps = Omit<BaseTextFieldProps, "variant">

export type TextInputProps = BaseTextFieldVariantProps & {
    icon?: JSX.Element
    label?: string
    variant?: "outlined" | "underlined"
}

export const TextInput = component({
    name: "TextInput",
    defaultProps: {
        variant: "outlined"
    } as Partial<TextInputProps>,
    // gridded: true,
    styles
})(({ classes, icon, label, variant, ...rest }) => {
    const Component = TextInputVariants[variant!]
    return (
        <Component
            label={label}
            margin="dense"
            fullWidth
            InputLabelProps={{
                classes: { root: label }
            }}
            {...rest}
        />
    )
})
