import { print } from "graphql/language/printer"
import gql from "graphql-tag"

const contents = gql`
    mutation signUp {
        signUp(
            data: {
                email: "reed@redo.qa"
                password: "redo"
                first: "Reed"
                last: "Doe"
            }
        )
    }

    mutation signIn {
        signIn(data: { email: "reed@redo.qa", password: "redo" })
    }

    mutation createTest {
        createOneTest(
            data: {
                name: "Test 1"
                tags: [{ name: "critical" }]
                steps: {
                    action: "click"
                    value: "something"
                    selector: { css: "#someId" }
                }
            }
        ) {
            id
        }
    }

    query getTests {
        tests {
            name
            id
            steps {
                id
                action
                value
                selector {
                    css
                }
            }
            tags {
                name
            }
        }
    }
`

export const playground = {
    tabs: [
        {
            endpoint: `http://localhost:${process.env.PORT}`,
            query: print(contents)
        }
    ]
}
