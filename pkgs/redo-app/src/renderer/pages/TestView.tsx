import React from "react"
import { HomeActionsRow } from "custom"
import {
    Column,
    Row,
    Button,
    Tree,
    ModalButton,
    FormText,
    Form,
    FormSubmit,
    AutoForm,
    Text
} from "redo-components"
import { useQuery } from "@apollo/react-hooks"
import { store } from "renderer/common"
import { Page } from "renderer/state"

import gql from "graphql-tag"
import { BrowserEvent, Tag } from "redo-model"
import { objectActions } from "../components/custom"
import { TestInput, Test } from "redo-model"

const GET_TESTS = gql`
    query {
        getTest {
            name
            steps {
                type
                selector
                value
            }
            tags {
                name
            }
        }
    }
`

type TestData = {
    getTest: {
        name: string
        tags: Tag[]
        steps: BrowserEvent[]
    }[]
}

export const TestView = () => {
    const { data } = useQuery<TestData>(GET_TESTS)
    return (
        <Column justify="flex-start" full>
            <Row>
                <Button
                    kind="secondary"
                    onClick={() => store.mutate({ page: Page.Home })}
                >
                    Home
                </Button>
                <HomeActionsRow />
            </Row>
            {data && data.getTest ? (
                <Tree labelKey="name" nodeExtras={CustomModalButtonConstructor}>
                    {data.getTest}
                </Tree>
            ) : null}
        </Column>
    )
}

// ((key: string, value: any) => JSX.Element)

const CustomModalButtonConstructor = (key: string, value: any) => {
    const test = {
        input: TestInput,
        data: Test,
        actions: ["delete", "run"],
        key: "test"
    }
    return test.key == key || key == "tags" ? (
        <ModalButton open={false}>
            <Form
                validator={value}
                submit={async () => {
                    const result = await submitForm()

                    return
                }}
            >
                <Row>
                    <FormText name={key}>{key}</FormText>
                    <FormSubmit>Change name</FormSubmit>
                </Row>
                <Tree nodeExtras={EditableLinks}>{value}</Tree>
            </Form>
        </ModalButton>
    ) : null
}

const EditableLinks = (key: string, value: any) => {
    return "test" == key || key == "tags" ? (
        <ModalButton open={false}>
            <AutoForm
                validator={value}
                contents={value}
                submit={async () => {
                    const result = await submitForm()

                    return result
                }}
            />
        </ModalButton>
    ) : null
}

const submitForm = () => {}

// {
//     value.forEach((val: any) => {
//         return <FormText name={val}>{val}</FormText>
//     })
// }
