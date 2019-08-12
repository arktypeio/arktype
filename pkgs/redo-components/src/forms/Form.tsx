import React, { ReactNode, useState } from "react"
import useForm, { FormContext } from "react-hook-form"
import { FormActions, Fields } from "./FormContext"
import { ResponseState } from "../responses"

export type FormProps<T extends Fields, D = any> = FormActions<T, D> & {
    children: ReactNode
}

export const Form = <T extends Fields, D = any>({
    children,
    validate,
    submit
}: FormProps<T, D>) => {
    const formContext = useForm()
    const [submitState, setSubmitState] = useState<ResponseState>({})
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
                    setSubmitState({ loading: true })
                    const response = (await submit(values as any)) || {}
                    setSubmitState({ ...response, loading: false })
                }
            }}
            submitState={submitState}
            touched={[]}
            {...formContext}
        >
            {children}
        </FormContext>
    )
}
