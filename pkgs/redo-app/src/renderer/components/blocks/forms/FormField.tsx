import React from "react"
import { Field } from "formik"
import { component } from "blocks"

export type InnerFormFieldProps = {
    component: string | React.ComponentType<any>
    holds: string
}

export type FormFieldProps = Omit<InnerFormFieldProps, "component">

export const FormField = component({
    name: "FormField",
    defaultProps: {} as Partial<InnerFormFieldProps>
})(({ ...props }) => {
    return <Field {...props} />
})

export type FormFieldElement = React.ReactElement<FormFieldProps>
