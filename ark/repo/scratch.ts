const ark: { foo?: string } = {}

ark.foo &&= `${ark.foo}1`

console.log(ark.foo)
