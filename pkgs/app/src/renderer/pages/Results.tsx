import React from "react"
import { Column, Table } from "@re-do/components"
import { RedoAppBar } from "renderer/components/custom"
import { fromEntries } from "@re-do/utils"

const signInSteps = [
    {
        action: "set",
        selector: "#email",
        value: "savannah@redo.qa"
    },
    {
        action: "set",
        selector: "#password",
        value: "redo"
    },
    {
        action: "click",
        selector: "#signInButton"
    }
]

const signUpSteps = [
    {
        action: "set",
        selector: "#firstName",
        value: "Savannah"
    },
    {
        action: "set",
        selector: "#lastName",
        value: "Bosse"
    },
    {
        action: "set",
        selector: "#email",
        value: "savannah@redo.qa"
    },
    {
        action: "set",
        selector: "#password",
        value: "redo"
    },
    {
        action: "set",
        selector: "#confirmPassword",
        value: "redo"
    },
    {
        action: "click",
        selector: "#signUpButton"
    }
]

const fakeResultsDataRaw = [
    {
        source: "Sign In",
        passed: true,
        steps: signInSteps
    }
    // {
    //     source: "New User Tests",
    //     result: {
    //         passed: 1,
    //         total: 2
    //     },
    //     tests: [
    //         { name: "Sign In", result: { passed: true }, steps: signInSteps },
    //         {
    //             name: "Sign Up",
    //             result: {
    //                 passed: false,
    //                 error: "Couldn't find #confirmPassword."
    //             },
    //             steps: signUpSteps
    //         }
    //     ]
    // }
]
type TestResultsData = typeof fakeResultsDataRaw
const toTableData = (data: TestResultsData) => {
    return data.map(result => ({
        source: result.source,
        passed: JSON.stringify(result.passed),
        steps: JSON.stringify(result.steps)
    }))
}

export const Results = () => (
    <Column full={true}>
        <RedoAppBar>{["newTest", "home", "search", "account"]}</RedoAppBar>
        <Table
            columns={[
                { title: "Test Name", field: "source" },
                { title: "Passed", field: "passed" },
                { title: "Sign-in Steps", field: "steps" }
            ]}
            data={toTableData(fakeResultsDataRaw)}
            title="Test Results"
        />
    </Column>
)
