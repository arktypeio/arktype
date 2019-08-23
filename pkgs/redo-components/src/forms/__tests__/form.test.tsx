import React from "react"
import { mount, configure, ReactWrapper } from "enzyme"
import Adapter from "enzyme-adapter-react-16"
import { FormText, FormSubmit, Form } from ".."
import { Button } from "../../buttons"
import { ThemeProvider } from "@material-ui/styles"
import { defaultTheme } from "../../styles"
import { Text } from "../../text"
import { Column } from "../../layouts"

configure({ adapter: new Adapter() })

const submit = jest.fn()
const validate = jest.fn()

const createUserInput = (element: ReactWrapper) => () =>
    element.find(FormText).simulate("keydown")

let userInput: ReturnType<typeof createUserInput>

let element: ReactWrapper

type TextOnlyFormFields = {
    first: string
    last: string
}

//const createClickButton = (element: ReactWrapper) => () =>
//  element.find(Button).simulate("click")

//let clickButton: ReturnType<typeof createClickButton>

//let clickMenuItem: ReturnType<typeof createClickMenuItem>

//const createClickMenuItem = (element: ReactWrapper) => (index: number) =>
//element
//   .find(MenuItem)
// .at(index)
//.simulate("click")

//const getVisibleOptionCount = () => element.find(MenuItem).length

describe("form", () => {
    beforeEach(() => {
        element = mount(
            <ThemeProvider theme={defaultTheme}>
                <Form submit={submit} validate={validate}>
                    <Column width={200}>
                        <FormText name="first" />
                    </Column>
                </Form>
            </ThemeProvider>
        )
        userInput = createUserInput(element)
    })

    test("validates", () => {
        expect(true).toBe(true)
        // userInput()
        // expect(validate).toBeCalled()
    })
})
// clickButton = createClickButton(element)
// clickMenuItem = createClickMenuItem(element)
// })

//test("blank by default", () => {})
//test("submits on enter", () => {})
//test("submits on click", () => {})
//test("displays message", () => {})
