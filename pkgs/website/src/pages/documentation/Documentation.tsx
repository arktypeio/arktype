import React from "react"
import { Column, Link, Text, TextProps } from "@re-do/components"
import { Page } from "../../components"

const docTextStyle = { marginBottom: 16, whiteSpace: "pre-wrap" as const }

type DocTextProps = {
    isCode?: boolean
} & TextProps

const DocText = ({ isCode, children, ...rest }: DocTextProps) =>
    isCode ? (
        <code style={docTextStyle}>{children}</code>
    ) : (
        <Text style={docTextStyle} {...rest}>
            {children}
        </Text>
    )

const exampleJestCode = `
import { getTests, run } from "@re-do/test"

describe.each(getTests())(
    "",
    ({ name, id }) => {
        test(name, async () => {
            await run({ id })
        }, 30000)
    }
)`

export const Documentation = () => {
    return (
        <Page subHeader={false} getStarted={false} overrideMobile={true}>
            <div style={{ maxWidth: 600 }}>
                <Column>
                    <DocText variant="h3">Getting Started</DocText>
                    <DocText>
                        Before you can start testing you'll need to install redo
                        using your package manager of choice (npm, yarn, pnpm,
                        etc.):
                    </DocText>
                    <DocText isCode>npm install @re-do/test</DocText>
                    <DocText>
                        Now you can launch the app, which will install your
                        release automatically:
                    </DocText>
                    <DocText>npx redo launch</DocText>
                    <DocText>
                        After you click the "+" icon in the top left corner of
                        the app to create a new test, a browser will launch. Use
                        it to navigate to the site you'd like to test, and start
                        interacting with it the way you would normally. You'll
                        see steps representing each action you take.
                        Highlighting a text value will assert its presence. When
                        you're done with your test, name it and click the "✔"
                        icon to save. All of the data needed to run your test
                        will be stored in a "redo.json" file in your current
                        directory. Your tests can be easily integrated with test
                        runners like Jest as follows:
                    </DocText>
                    <DocText style={{}} isCode>
                        {exampleJestCode}
                    </DocText>
                    <DocText>
                        The snippet above tells jest to run every test in your
                        `redo.json` data.
                    </DocText>
                    <DocText>
                        We are still in beta and have lots more functionality to
                        document and build, but we've love to hear your
                        feedback! If you run into any problems or would like to
                        suggest a feature, please create an issue for us{" "}
                        <a href="https://github.com/re-do/redo" target="_blank">
                            on Github
                        </a>{" "}
                        or email me at david@redo.qa 😻
                    </DocText>
                </Column>
            </div>
        </Page>
    )
}

export default Documentation
