import "reflect-metadata"
import React from "react"
import { storiesOf } from "@storybook/react"
import { withKnobs } from "@storybook/addon-knobs"
import { IsIn } from "class-validator"
import { ValueFrom } from "@re-do/utils"
import { Text, ErrorText } from "../text"
import { Spinner } from "../progress"
import { Button } from "../buttons"
import { AutoForm, Form, FormText, FormSubmit, FormProps } from "."

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

const reverse = (s: string) => [...s].reverse().join("")

const width = 200

class HelloValidator {
    @IsIn(["David", "Savannah"])
    first: string

    @IsIn(["Blass", "Bosse"])
    last: string
}

const helloClassValidator = new HelloValidator()

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
    .add("With class validator", () => (
        <HelloForm validator={helloClassValidator} />
    ))
    .add("AutoForm", () => (
        <AutoForm<HelloFormFields, string>
            submit={async ({ first, last }) =>
                console.log(`Hello, ${first} ${last}.`)
            }
            validator={validator}
            contents={{ first: "Reed", last: "Doe" }}
            columnProps={{ width }}
        />
    ))

const HelloForm = (props?: Partial<FormProps<HelloFormFields, string>>) => (
    <Form<HelloFormFields, string>
        submit={submit}
        validator={validator}
        columnProps={{ width }}
        {...props}
    >
        {({ data, loading, errors }) => (
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
                {errors ? <ErrorText>{errors}</ErrorText> : null}
            </>
        )}
    </Form>
)
