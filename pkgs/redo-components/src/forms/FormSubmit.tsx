import React, { useState, FC } from "react"
import { RespondTo, ResponseState, ResponseOptions } from "../responses"
import { PrimaryButton } from "../buttons"
import { useFormContext } from "./FormContext"

export type FormSubmitProps<D = any> = {
    responseOptions?: ResponseOptions<D>
}

export const FormSubmit: FC<FormSubmitProps> = <D extends any = any>({
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
