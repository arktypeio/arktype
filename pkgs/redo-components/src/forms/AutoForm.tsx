import React from "react"
import { Column, ColumnProps } from "../layouts"
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
    columnProps?: ColumnProps
    submitProps?: FormSubmitProps
    textProps?: FormTextProps
}

export const AutoForm = <T extends Fields, D = any>({
    contents,
    columnProps,
    submitProps,
    textProps,
    ...rest
}: AutoFormProps<T, D>) => (
    <Form<T, D> {...rest}>
        <Column {...columnProps}>
            {Object.entries(contents).map(([k, v], index) => (
                <FormText name={k} key={index} {...textProps} />
            ))}
            <FormSubmit {...submitProps}>Submit</FormSubmit>
        </Column>
    </Form>
)
