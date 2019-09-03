import React from "react"
import { Column, ColumnProps } from "../layouts"
import {
    Fields,
    SubmissionState,
    FormContext,
    FormContextProps,
    FullContext,
    createFormContext,
    FormProvider
} from "./FormContext"

export type FormProps<T extends Fields, D = any> = FormContextProps<T, D> & {
    children:
        | JSX.Element
        | JSX.Element[]
        | ((state: SubmissionState<D>) => JSX.Element)
    columnProps?: ColumnProps
}

export const Form = <T extends Fields, D = any>({
    children,
    columnProps,
    ...contextProps
}: FormProps<T, D>) => {
    return (
        <FormProvider {...contextProps}>
            <FormContext.Consumer>
                {({ submissionState }: FullContext<T, D>) => (
                    <Column align="center" full {...columnProps}>
                        {typeof children === "function"
                            ? children(submissionState)
                            : children}
                    </Column>
                )}
            </FormContext.Consumer>
        </FormProvider>
    )
}
