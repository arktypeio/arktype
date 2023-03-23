---
hide_table_of_contents: true
---

# validationScope

## keywords

-   keywords: { "alpha": "only letters", "alphanumeric": "only letters and digits", "lowercase": "only lowercase letters", "uppercase": "only uppercase letters", "creditCard": "a valid credit card number", "email": "a valid email", "uuid": "a valid UUID", "parsedNumber": "a well-formed numeric string", "parsedInteger": "a well-formed integer string", "parsedDate": "a valid date", "semver": "a valid semantic version", "json": "a JSON-parsable string", "integer": "an integer"}

## text

| Name          | Type                                     | Description                  |
| ------------- | ---------------------------------------- | ---------------------------- |
| alpha         | <code> string</code>                     | only letters                 |
| alphanumeric  | <code> string</code>                     | only letters and digits      |
| lowercase     | <code> string</code>                     | only lowercase letters       |
| uppercase     | <code> string</code>                     | only uppercase letters       |
| creditCard    | <code> string</code>                     | a valid credit card number   |
| email         | <code> string</code>                     | a valid email                |
| uuid          | <code> string</code>                     | a valid UUID                 |
| parsedNumber  | <code> (In: string) =&gt; number</code>  | a well-formed numeric string |
| parsedInteger | <code> (In: string) =&gt; number</code>  | a well-formed integer string |
| parsedDate    | <code> (In: string) =&gt; Date</code>    | a valid date                 |
| semver        | <code> string</code>                     | a valid semantic version     |
| json          | <code> (In: string) =&gt; unknown</code> | a JSON-parsable string       |
| integer       | <code> number</code>                     | an integer                   |
