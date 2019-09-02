import React from "react"
import { storiesOf } from "@storybook/react"
import { AppBar } from "."
import { Icons } from "../icons"
import { TextInput } from "../inputs"
import { Text } from "../text"

storiesOf("AppBar", module).add("basic", () => {
    return (
        <>
            <AppBar>
                <Text>Admiral AppBar</Text>
                <TextInput kind="underlined" colorTemplate="light" />
                <Icons.account onClick={() => console.log("clicked")} />
            </AppBar>
            <p>This is content.</p>
            <p>This is content.</p>
            <p>This is content.</p>
            <p>This is content.</p>
            <p>This is content.</p>
            <p>This is content.</p>
            <p>This is content.</p>
            <p>This is content.</p>
            <p>This is content.</p>
            <div style={{ height: 2000 }} />
        </>
    )
})
