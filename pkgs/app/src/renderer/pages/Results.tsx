import React from "react"
import { Column, Table, ThemeProvider } from "@re-do/components"
import { RedoAppBar } from "renderer/components/custom"

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
        result: { passed: true },
        steps: signInSteps
    },

    {
        source: "New User Tests",
        result: {
            passed: 1,
            total: 2
        },
        tests: [
            { source: "Sign In", result: { passed: true }, steps: signInSteps },
            {
                source: "Sign Up",
                result: {
                    passed: false,
                    error: "Couldn't find #confirmPassword."
                },
                steps: signUpSteps
            }
        ]
    }
]
type Step = {
    action: string
    selector: string
    value?: string
}
type TestResult = {
    source: string
    result: { passed: boolean }
    steps: Step[]
}
type SuiteResult = {
    source: string
    result: { passed: number; total: number }
    tests: TestResult[]
}

type TestResultsData = (TestResult | SuiteResult)[]

const toSuiteData = (result: SuiteResult, rowId: number) => {
    let rows = [
        {
            id: rowId,
            source: result.source,
            passed: JSON.stringify(result.result)
        }
    ]
    rows = rows.concat(
        result.tests.map((testResult, testIndex) =>
            toTestData(testResult, rowId + testIndex + 1, rowId)
        )
    )
    return rows
}
const toTestData = (result: TestResult, rowId: number, parentId?: number) => ({
    id: rowId,
    source: result.source,
    passed: JSON.stringify(result.result.passed),
    parentId
})

const toTableData = (testResultsData: TestResultsData) => {
    let tableData: any[] = []
    testResultsData.forEach(result => {
        tableData = tableData.concat(
            "tests" in result
                ? toSuiteData(result, tableData.length)
                : toTestData(result, tableData.length)
        )
    })
    return tableData
}

export const Results = () => (
    <Column>
        <RedoAppBar>{["newTest", "home", "search", "account"]}</RedoAppBar>
        <Table
            columns={[
                { title: "Test Name", field: "source" },
                { title: "Results", field: "passed" },
                { title: "Sign-in Steps", field: "steps" }
            ]}
            data={toTableData(fakeResultsDataRaw)}
            title="Test Results"
            parentChildData={(row, rows) => {
                const result = rows.find(a => a.id === row.parentId)
                console.log(result)
                return result
            }}
        />
    </Column>
)
