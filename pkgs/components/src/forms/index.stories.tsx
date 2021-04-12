import React, { useState } from "react"
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
    title: "Forms"
}

type HelloFormFields = {
    first: string
    last: string
    password: string
    passwordMatch: string
}

const submit: MutationSubmit<HelloFormFields> = async (params: any) => ({
    called: true,
    loading: false,
    data: `Hello, ${params?.variables?.first} ${params?.variables?.last}.`
})

const validate: ValueFrom<FormProps<HelloFormFields, string>, "validate"> = ({
    password,
    passwordMatch
}) => {
    return {
        passwordMatch:
            password === passwordMatch ? [] : ["Passwords must match."]
    }
}

const HelloForm = (props: Partial<FormProps<HelloFormFields, string>>) => (
    <Form<HelloFormFields, string>
        submit={submit}
        validate={validate}
        columnProps={{ width }}
        {...props}
    >
        {({ data, loading, error }) => (
            <>
                <FormText name="first" defaultValue="Default" />
                <FormText name="last" />
                <FormText name="password" type="password" />
                <FormText
                    name="passwordMatch"
                    label="retype password"
                    type="password"
                />
                {loading ? (
                    <Spinner />
                ) : (
                    <FormSubmit>
                        <Button>Submit</Button>
                    </FormSubmit>
                )}
                {<Text>{data ? data : "Submit the form!"}</Text>}
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

export const AutoForm = () => {
    const [message, setMessage] = useState("Submit the form!")
    return (
        <>
            <RedoAutoForm
                submit={async (options: any) =>
                    setMessage(
                        `Hello, ${options?.variables?.first} ${options?.variables?.last}.`
                    )
                }
                validate={validate}
                // TODO: Update to take an object with parameters like default value, type (e.g. password), label, validate, etc.
                contents={{
                    first: "Default",
                    last: "",
                    password: "",
                    passwordMatch: ""
                }}
                columnProps={{ width }}
            />
            <Text>{message}</Text>
        </>
    )
}
