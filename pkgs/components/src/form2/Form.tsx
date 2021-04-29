import React from "react"
import { useForm, SubmitHandler, FormProvider } from "react-hook-form"
import { Column, ColumnProps } from "../layouts"

export type FormProps<Inputs extends object> = {
    children: JSX.Element | JSX.Element[]
    onSubmit: SubmitHandler<Inputs>
    columnProps?: ColumnProps
}

export const Form = <Inputs extends object>({
    children,
    onSubmit,
    columnProps
}: FormProps<Inputs>) => {
    const context = useForm<Inputs>()
    return (
        <FormProvider {...context}>
            <form onSubmit={context.handleSubmit(onSubmit)}>
                <Column align="center" {...columnProps}>
                    {children}
                </Column>
            </form>
        </FormProvider>
    )
}
