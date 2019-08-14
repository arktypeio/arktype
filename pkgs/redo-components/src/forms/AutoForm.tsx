import React, { ReactNode, useState } from "react"
import useForm, { FormContext } from "react-hook-form"
import { FormActions, Fields } from "./FormContext"
import { ResponseState } from "../responses"
import { FormErrors } from "../forms"
import { plainToClassFromExist } from "class-transformer"
import { validateSync } from "class-validator"
import { Form, FormText, FormSubmit, FormProps } from "./"
import { Row, Column } from "../layouts"
import { DisplayAs } from "../displayAs"
import { Text } from "../text"

type AutoFormProps<T extends Fields, D = any> = Omit<
    FormProps<T, D>,
    "children"
> & {
    // displayAs: DisplayAs
    fields?: T
    contents: T
    children?: any
}

export const AutoForm = <T extends Fields, D = any>({
    contents,
    validator,
    submit
}: AutoFormProps<T, D>) => (
    <Form<T, D> validator={validator} submit={submit}>
        <Column>
            {contents
                ? Object.entries(contents).map(([k, v], index) => (
                      <FormText
                          name={`${JSON.stringify(k)}: ${JSON.stringify(v)} `}
                          key={index}
                      />
                  ))
                : null}
            <FormSubmit>Submit</FormSubmit>
        </Column>
    </Form>
)
