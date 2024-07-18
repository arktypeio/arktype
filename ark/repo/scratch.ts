import { type } from "arktype"

const user = type({
	email: "email",
	file: "File",
	tags: "string[]"
})

const formUser = type("parse.formData").pipe(user)

const data = new FormData()
data.append("email", "david@arktype.io")
data.append("file", new File([], ""))
data.append("tags", "typescript")
data.append("tags", "arktype")

const out = formUser(data) //?
