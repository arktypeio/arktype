import React from "react"
import { FieldProps } from "formik"
import { component, GridProps } from "blocks"
import { FormField, FormFieldProps } from "./FormField"
import { TextInput, TextInputProps } from "blocks"
import { createStyles } from "@material-ui/styles"
import { Theme } from "@material-ui/core"
import { ErrorText } from "../typography"
import { Column } from "../layouts"

const styles = (theme: Theme) =>
    createStyles({
        size: { width: "100%" } // height 100% fixes spcing
    })

type CommonProps = TextInputProps & FormFieldProps

type FormTextInnerProps = FieldProps & CommonProps

export type FormTextProps = GridProps & CommonProps

export const FormText = component({
    name: "FormText",
    defaultProps: {} as Partial<FormTextProps>
})(props => {
    return <FormField component={FormTextField} {...props} />
})

const FormTextField = component({
    name: "FormTextField",
    defaultProps: {} as Partial<FormTextInnerProps>
})(
    ({
        field: { name, onBlur, onChange },
        form: { touched, errors },
        holds,
        label,
        ...rest
    }) => {
        const errorMessage = !!(touched[holds] && errors[holds])
            ? (errors[holds] as string)
            : ""
        return (
            <Column>
                <TextInput
                    id={holds}
                    label={label ? label : holds}
                    error={!!errorMessage}
                    {...{ name, onBlur, onChange }}
                    {...rest}
                />
                {errorMessage ? <ErrorText>{errorMessage}</ErrorText> : null}
            </Column>
        )
    }
)
