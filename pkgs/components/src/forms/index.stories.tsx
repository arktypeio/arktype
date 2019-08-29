import React from "react"
import { storiesOf } from "@storybook/react"
import { withKnobs } from "@storybook/addon-knobs"
import { Text } from "../text"
import { Column } from "../layouts"
import { AutoForm, Form, FormText, FormSubmit } from "."
import { ValueFrom } from "@re-do/utils"
import { FormProps } from "./Form"
import { FormSubmitProps } from "./FormSubmit"

type HelloFormFields = {
    first: string
    last: string
}

const submit: ValueFrom<FormProps<HelloFormFields, string>, "submit"> = async ({
    first,
    last
}) => ({
    data: `Hello, ${first} ${last}.`
})

const validator: ValueFrom<FormProps<HelloFormFields, string>, "validator"> = ({
    first,
    last
}) => ({
    first: first ? [] : ["We need this!"],
    last: last ? [] : ["We need this!"]
})

const responseOptions: ValueFrom<FormSubmitProps, "responseOptions"> = {
    data: {
        displayAs: data => <Text>{data.value}</Text>
    }
}

const reverse = (s: string) => [...s].reverse().join("")

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
    .add("AutoForm", () => (
        <AutoForm<HelloFormFields, string>
            submit={submit}
            validator={validator}
            contents={{ first: "Sarthak", last: "Agrawal" }}
            submitProps={{ responseOptions }}
        />
    ))

const HelloForm = (props?: Partial<FormProps<HelloFormFields, string>>) => (
    <Form<HelloFormFields, string>
        submit={submit}
        validator={validator}
        {...props}
    >
        <Column>
            <FormText name="first" />
            <FormText name="last" />
            <FormSubmit responseOptions={responseOptions}>Submit</FormSubmit>
        </Column>
    </Form>
)
