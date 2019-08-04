import React, { useState, ReactNode } from "react"
import { Theme } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { RespondTo, ResponseState, ResponseOptions } from "../responses"
import { PrimaryButton } from "../buttons"
import { useFormContext } from "./FormContext"

const styles = makeStyles((theme: Theme) => {})

export type FormSubmitProps<D = any> = {
    responseOptions?: ResponseOptions<D>
    children?: ReactNode
}

export const FormSubmit = <D extends any = any>({
    responseOptions,
    ...rest
}: FormSubmitProps<D>) => {
    const { getValues, submit, validate } = useFormContext()
    const [state, setState] = useState<ResponseState>({})
    return (
        <RespondTo response={state} options={responseOptions}>
            <PrimaryButton
                type="submit"
                onClick={async () => {
                    const values = getValues()
                    if (
                        Object.values(validate(values)).every(
                            _ => !_ || !_.length
                        )
                    ) {
                        setState({ loading: true })
                        const response = (await submit(values)) || {}
                        setState({ ...response, loading: false })
                    }
                }}
                {...rest}
            />
        </RespondTo>
    )
}
