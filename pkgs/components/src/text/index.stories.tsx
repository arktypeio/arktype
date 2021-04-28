import React from "react"
import { Text, ErrorText } from "."

export default {
    title: "Text"
}

const argTypes = {
    tooltipPlacement: {
        control: {
            type: "radio",
            options: [
                "bottom-end",
                "bottom-start",
                "bottom",
                "left-end",
                "left-start",
                "left",
                "right-end",
                "right-start",
                "right",
                "top-end",
                "top-start",
                "top"
            ]
        }
    }
}

export const defaultText = () => <Text>This is default text</Text>

export const errorText = (props: any) => (
    <ErrorText {...props}>This is error text</ErrorText>
)

errorText.argTypes = argTypes

export const longErrorText = (props: any) => (
    <div style={{ width: 200 }}>
        <ErrorText>
            {[
                "This very long error message should be truncated",
                "This even longer error message should display in full in the tooltip"
            ]}
        </ErrorText>
    </div>
)

longErrorText.argTypes = argTypes
