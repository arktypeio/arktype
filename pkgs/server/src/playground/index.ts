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

    query users {
        users {
            email
        }
    }

    query steps {
        steps {
            action
            value
            selector {
                css
            }
        }
    }

    mutation createTest {
        createTest(
            data: {
                name: "Test 1"
                steps: [
                    { action: "Click", value: "", selector: { css: "#id" } }
                ]
                tags: [{ name: "fast" }, { name: "easy" }]
            }
        ) {
            id
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
