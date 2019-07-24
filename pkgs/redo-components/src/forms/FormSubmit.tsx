import React, { useState, ReactNode } from "react"
import { Theme } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { RespondTo, ResponseState, ResponseOptions } from "../responses"
import { PrimaryButton } from "../buttons"
import { useFormContext } from "./FormContext"

const styles = makeStyles((theme: Theme) => {})

export type FormSubmitProps<T = any> = {
    responseOptions?: ResponseOptions<T>
    children: ReactNode
}

export const FormSubmit = <T extends any = any>({
    responseOptions,
    ...rest
}: FormSubmitProps<T>) => {
    const { getValues, submit, errors, validate } = useFormContext()
    const [state, setState] = useState<ResponseState>({})
    console.log(state)
    return (
        <RespondTo response={state} options={responseOptions}>
            <PrimaryButton
                type="submit"
                onClick={async () => {
                    const values = getValues()
                    if (Object.values(validate(values)).every(_ => !_.length)) {
                        setState({ loading: true })
                        setState({ ...(await submit(values)), loading: false })
                    }
                }}
                {...rest}
            />
        </RespondTo>
    )
}
