import React, { ReactNode } from "react"
import { Theme } from "@material-ui/core/styles"
import { makeStyles } from "@material-ui/styles"
import useForm, { FormContext } from "react-hook-form"
import { FormActions, Fields } from "./FormContext"

const stylize = (theme: Theme) => makeStyles({})

export type FormProps<T extends Fields, D = any> = FormActions<T, D> & {
    children: ReactNode
}

export const Form = <T extends Fields, D = any>({
    children,
    validate,
    submit
}: FormProps<T, D>) => (
    <FormContext
        validate={validate}
        submit={submit}
        touched={[]}
        {...useForm()}
    >
        {children}
    </FormContext>
)
