import React, { FC } from "react"
import { RespondTo, ResponseOptions } from "../responses"
import { Button } from "../buttons"
import { useFormContext } from "./FormContext"

export type FormSubmitProps<D = any> = {
    responseOptions?: ResponseOptions<D>
}

export const FormSubmit: FC<FormSubmitProps> = <D extends any = any>({
    responseOptions,
    ...rest
}: FormSubmitProps<D>) => {
    const { submit, submitState } = useFormContext()
    return (
        <RespondTo response={submitState} options={responseOptions}>
            <Button kind="primary" type="submit" onClick={submit} {...rest} />
        </RespondTo>
    )
}
