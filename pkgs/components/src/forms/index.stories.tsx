import React from "react"
import { storiesOf } from "@storybook/react"
import { withKnobs } from "@storybook/addon-knobs"
import { ValueFrom } from "@re-do/utils"
import { Text, ErrorText } from "../text"
import { Spinner } from "../progress"
import { Button } from "../buttons"
import { Row } from "../layouts"
import {
    AutoForm,
    Form,
    FormText,
    FormSubmit,
    FormProps,
    MutationSubmit
} from "."

type HelloFormFields = {
    first: string
    last: string
}

// TODO: Fix any (due to not having apollo types anymore)
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

const reverse = (s: string) => [...s].reverse().join("")

const width = 200

storiesOf("Form", module)
    .addDecorator(withKnobs)
    .add("Standard", () => <HelloForm />)
    .add("With transform", () => (
        <HelloForm
            transformValues={values => ({
                first: reverse(values.first),
                last: reverse(values.last)
            })}
        />
    ))
    .add("Two column", () => <HelloForm testAsRow />)
    .add("AutoForm", () => (
        <AutoForm<HelloFormFields>
            // TODO: Fix any (due to not having apollo types anymore)
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
    ))

const HelloForm = ({
    testAsRow,
    ...props
}: Partial<FormProps<HelloFormFields, string>> & {
    testAsRow?: boolean
}) => (
    <Form<HelloFormFields, string>
        submit={submit}
        validate={validate}
        columnProps={{ width }}
        {...props}
    >
        {({ data, loading, error }) => (
            <>
                {testAsRow ? (
                    <Row spacing={1}>
                        <FormText name="first" />
                        <FormText name="last" />
                    </Row>
                ) : (
                    <>
                        <FormText name="first" />
                        <FormText name="last" />
                    </>
                )}
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
