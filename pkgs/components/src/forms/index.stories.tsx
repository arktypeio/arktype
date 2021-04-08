import React from "react"
import { ValueFrom } from "@re-do/utils"
import { Text, ErrorText } from "../text"
import { Spinner } from "../progress"
import { Button } from "../buttons"
import {
    AutoForm as RedoAutoForm,
    Form,
    FormText,
    FormSubmit,
    FormProps,
    MutationSubmit
} from "."

export default {
    title: "Form"
}

type HelloFormFields = {
    first: string
    last: string
}

const submit: MutationSubmit<HelloFormFields> = async (params: any) => ({
    called: true,
    loading: false,
    data: `Hello, ${params?.variables?.first} ${params?.variables?.last}.`
})

const validate: ValueFrom<FormProps<HelloFormFields, string>, "validate"> = ({
    first,
    last
}) => ({
    first: first ? [] : ["We need this!"],
    last: last ? [] : ["We need this!"]
})

const HelloForm = (props: Partial<FormProps<HelloFormFields, string>>) => (
    <Form<HelloFormFields, string>
        submit={submit}
        validate={validate}
        columnProps={{ width }}
        {...props}
    >
        {({ data, loading, error }) => (
            <>
                <FormText name="first" />
                <FormText name="last" />
                {loading ? (
                    <Spinner />
                ) : (
                    <FormSubmit>
                        <Button>Submit</Button>
                    </FormSubmit>
                )}
                {data ? <Text>{data}</Text> : null}
                {error ? <ErrorText>{error.message}</ErrorText> : null}
            </>
        )}
    </Form>
)

const reverse = (s: string) => [...s].reverse().join("")

const width = 200

export const Standard = () => <HelloForm />
export const TransformOnSubmit = () => (
    <HelloForm
        transformValues={(values) => ({
            first: reverse(values.first),
            last: reverse(values.last)
        })}
    />
)

export const AutoForm = (
    <RedoAutoForm<HelloFormFields>
        submit={async (options: any) => {
            console.log(
                `Hello, ${options?.variables?.first} ${options?.variables?.last}.`
            )
            return {} as any
        }}
        validate={validate}
        contents={{ first: "Reed", last: "Doe" }}
        columnProps={{ width }}
    />
)
