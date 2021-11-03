import React, { useState } from "react"
import { useForm, SubmitHandler, FormProvider } from "react-hook-form"
import { Column, ColumnProps } from "../layouts"

export type FormProps<Inputs extends object> = ColumnProps & {
    children: JSX.Element | JSX.Element[]
    submit: SubmitHandler<Inputs>
}

export const Form = <Inputs extends object>({
    children,
    submit,
    ...columnProps
}: FormProps<Inputs>) => {
    const [submitError, setSubmitError] = useState("")
    const context: any = {
        ...useForm<Inputs>({ mode: "onChange" }),
        submitError
    }
    const onSubmit = async (data: Inputs) => {
        try {
            await context.handleSubmit(submit)()
        } catch (e) {
            // Propagate a non-field-specific error to FormSubmit
            setSubmitError(String(e))
        }
    }
    return (
        <FormProvider {...context}>
            <form
                style={{ height: "100%", width: "100%" }}
                onSubmit={context.handleSubmit(onSubmit as any)}
            >
                <Column align="center" {...columnProps}>
                    {children}
                </Column>
            </form>
        </FormProvider>
    )
}
