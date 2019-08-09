import React, { ReactNode, FC } from "react"
import useForm, { FormContext } from "react-hook-form"
import { FormActions, Fields } from "./FormContext"

export type FormProps<T extends Fields, D = any> = FormActions<T, D> & {
    children: ReactNode
}

export const Form = <T extends Fields, D = any>({
    children,
    validate,
    submit
}: FormProps<T, D>) => {
    const formContext = useForm()
    return (
        <FormContext
            validate={validate}
            submit={async () => {
                const values = formContext.getValues()
                if (
                    Object.values(validate(values as any)).every(
                        _ => !_ || !_.length
                    )
                ) {
                    const response = (await submit(values as any)) || {}
                }
            }}
            touched={[]}
            {...useForm()}
        >
            {children}
        </FormContext>
    )
}
