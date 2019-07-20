import React from "react"
import { Field } from "formik"

export type InnerFormFieldProps = {
    component: string | React.ComponentType<any>
    holds: string
}

export type FormFieldProps = Omit<InnerFormFieldProps, "component">

export const FormField = ({ ...props }: FormFieldProps) => {
    return <Field {...props} />
}

export type FormFieldElement = React.ReactElement<FormFieldProps>
