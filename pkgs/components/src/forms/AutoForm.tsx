import React from "react"
import { Button } from "../buttons"
import { LoadingAnimation } from "../loading"
import { ErrorText } from "../text"
import {
    Form,
    FormText,
    FormTextProps,
    FormSubmit,
    FormSubmitProps,
    FormProps,
    Fields
} from "."

type AutoFormProps<T extends Fields, D = any> = Omit<
    FormProps<T, D>,
    "children"
> & {
    contents: T
    textProps?: FormTextProps
    submitProps?: FormSubmitProps
}

export const AutoForm = <T extends Fields, D = any>({
    contents,
    submitProps,
    textProps,
    ...rest
}: AutoFormProps<T, D>) => (
    <Form<T, D> {...rest}>
        {({ loading, error }) => (
            <>
                {Object.entries(contents).map(([k, v], index) => (
                    <FormText
                        name={k}
                        key={index}
                        {...textProps}
                        defaultValue={v}
                    />
                ))}
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <FormSubmit {...submitProps}>
                        <Button>Submit</Button>
                    </FormSubmit>
                )}
                {error ? <ErrorText>{error.message}</ErrorText> : null}
            </>
        )}
    </Form>
)
