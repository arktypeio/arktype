# arktype.io

Source code for ArkType's docs at [arktype.io](https://arktype.io)

Built with [Starlight](https://starlight.astro.build/)

# Definitions

- Primitives

  - string
    - keywords
      - Autogenerate from JSDoc
    - literals
    - patterns
    - lengths
  - number
    - keywords
      - Autogenerate from JSDoc
    - literals
    - ranges
    - divisors
  - more
    - bigint
    - boolean
    - symbol
    - null
    - undefined

- Objects

  - properties
    - required
    - optional
    - defaultable
    - index
    - undeclared
    - more
      - merge
      - keyof
      - get
      - map
  - arrays
    - lengths
    - tuples
      - prefix
      - optional
      - variadic
      - postfix
  - dates
    - keywords
      - Autogenerate from JSDoc
    - literals
    - ranges
  - instanceOf
    - keywords
      - Autogenerate from JSDoc

- Expressions

  - intersection
  - union
  - brand
  - narrow
  - morph
  - more
    - unit
    - enumerated
    - meta
    - cast
    - parenthetical
    - this
    - thunk

# Other stuff

- Types (how you can use existing types)

  - Top-level type invocation

  - Autogenerate from JSDoc <!-- properties of a Type instance -->

  - define <!-- type utilities not attached to a type instance -->
  - raw

- Configuration

  - errors
  - clone
  - onUndeclaredKey
  - jitless

- Scopes (advanced)

  - syntax
  - private
  - modules
  - submodules

- Generics (advanced)

  - keywords
    - Autogenerate from JSDoc
  - syntax
  - hkt (advanced++)

- Integrations

  - Standard Schema
  - tRPC
  - react-hook-form
  - hono

- FAQ
- About the project
