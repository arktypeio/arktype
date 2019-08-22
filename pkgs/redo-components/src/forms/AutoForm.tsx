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
import { isRecursible, fromEntries } from "redo-utils"

type AutoFormProps<T extends Fields, D = any> = Omit<
    FormProps<T, D>,
    "children"
> & {
    // changed the type of contents to be Record<string, any> to allow for formExtras
    contents: string[] | Record<string, any>
    formExtras?: JSX.Element | ((key: string, value: any) => JSX.Element | null)
    children?: any
}

// AutoForm will take in a Record<string, string> and map the values (nothing with keys)
// to FormTexts. It will also render a FormSubmit component. It will take in
// the object Input type from metadata for the validation prop, and for the submit prop
// will take in a submit function from a Apollo React hook.

export const AutoForm = <T extends Fields, D = any>({
    contents,
    validator,
    staticValues,
    formExtras,
    submit
}: AutoFormProps<T, D>) => {
    return (
        <Form<T, D>
            staticValues={staticValues}
            validator={validator}
            submit={submit}
        >
            <Column>
                {Array.isArray(contents)
                    ? contents!.map((k, index) => (
                          <FormText name={k} key={index} />
                      ))
                    : Object.entries(contents).map(([k, v], index) =>
                          isRecursible(v) ? (
                              typeof formExtras === "function" ? (
                                  formExtras(k, v)
                              ) : (
                                  formExtras
                              )
                          ) : (
                              <FormText name={k} label={v} key={index} />
                          )
                      )}
                {staticValues
                    ? Object.entries(staticValues).map(([k, v], index) =>
                          isRecursible(v)
                              ? typeof formExtras === "function"
                                  ? formExtras(k, v)
                                  : formExtras
                              : null
                      )
                    : null}

                <FormSubmit>
                    {Array.isArray(contents) ? "Submit" : "Save changes"}
                </FormSubmit>
            </Column>
        </Form>
    )
}
