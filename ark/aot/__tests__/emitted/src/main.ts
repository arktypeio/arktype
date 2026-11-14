import { summaryOf } from "./errors.js"
import { print } from "./print.js"
import { User } from "./user.js"

const Admin = User.and({ role: "'admin'" })

print(summaryOf(User({ name: "Ada", age: 36 })))
print(summaryOf(Admin({ name: "Ada", age: -1, role: "user" })))
