import { print } from "graphql/language/printer"
import gql from "graphql-tag"

const contents = gql`
    mutation signUp {
        signUp(
            email: "oder@redo.qa"
            password: "redo"
            firstName: "Reed"
            lastName: "Doe"
        ) {
            token
        }
    }

    mutation signIn {
        signIn(email: "oder@redo.qa", password: "redo") {
            token
        }
    }

    mutation createTest {
        createTest(
            name: "Test Something"
            tags: [{ name: "BAT" }, { name: "short" }]
            steps: [{ key: "set", selector: "#someId", value: "someText" }]
        )
    }

    mutation updateTest {
        updateTest(
            name: "NewName"
            id: ""
            tags: [{ name: "BAT" }, { name: "short" }]
            steps: [{ key: "set", selector: "#someId", value: "someText" }]
        )
    }

    query getTest {
        getTest {
            name
            id
            user {
                email
            }
            tags {
                name
            }
        }
    }

    query getTag {
        getTag {
            user {
                id
            }
            name
        }
    }

    query getSteps {
        getSteps {
            key
            selector
            value
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
