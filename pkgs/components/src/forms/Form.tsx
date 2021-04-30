import React, { useState } from "react"
import { useForm, SubmitHandler, FormProvider } from "react-hook-form"
import { Column, ColumnProps } from "../layouts"
import { ErrorText } from "../text"

export type FormProps<Inputs extends object> = {
    children: JSX.Element | JSX.Element[]
    submit: SubmitHandler<Inputs>
    columnProps?: ColumnProps
}

export const Form = <Inputs extends object>({
    children,
    submit,
    columnProps
}: FormProps<Inputs>) => {
    const [submitError, setSubmitError] = useState("")
    const context = { ...useForm<Inputs>({ mode: "onBlur" }), submitError }
    const onSubmit = async (data: Inputs) => {
        try {
            await context.handleSubmit(submit)()
        } catch (e) {
            // Propagate a non-field-specific error to FormSubmit
            setSubmitError(e)
        }
    }
    return (
        <FormProvider {...context}>
            <form onSubmit={context.handleSubmit(onSubmit as any)}>
                <Column align="center" {...columnProps}>
                    {children}
                </Column>
            </form>
        </FormProvider>
    )
}
