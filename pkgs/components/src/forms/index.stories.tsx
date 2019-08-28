import React from "react"
import { storiesOf } from "@storybook/react"
import { withKnobs } from "@storybook/addon-knobs"
import { Text } from "../text"
import { Column } from "../layouts"
import { AutoForm, Form, FormText, FormSubmit } from "."
import { ValueFrom } from "@re-do/utils"
import { FormProps } from "./Form"
import { FormSubmitProps } from "./FormSubmit"
import { Card } from "../cards"

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

storiesOf("Form", module)
    .addDecorator(withKnobs)
    .add("Standard", () => <HelloForm />)
    .add("AutoForm", () => (
        <AutoForm<HelloFormFields, string>
            submit={submit}
            validator={validator}
            contents={{ first: "Sarthak", last: "Agrawal" }}
            submitProps={{ responseOptions }}
        />
    ))

const HelloForm = () => (
    <Card
        style={{
            width: 400,
            height: 400
        }}
    >
        <Form<HelloFormFields, string> submit={submit} validator={validator}>
            <FormText name="first" />
            <FormText name="last" />
            <FormSubmit responseOptions={responseOptions}>Submit</FormSubmit>
        </Form>
    </Card>
)
// I think the reason the layout looks funny is that space-between aligns things based on the top, not the center?
