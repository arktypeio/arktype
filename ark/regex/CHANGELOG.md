# arkregex

## Unreleased

### infer capture indices across alternation branches

A capture in one alternation branch is `undefined` in every other branch, so the inferred tuples line up with what `exec` returns (#1530):

```ts
// was: ["1"] | [undefined, "2"] | [undefined, "3"]
// now: ["1", undefined, undefined] | [undefined, "2", undefined] | [undefined, undefined, "3"]
regex("^(?:(?<a>1)|(?<b>2)|(?<c>3))$").inferCaptures
```

### infer escapes in a character set as what they match

In a character set, `\b` is a backspace and an escape that's unnecessary elsewhere matches its character, so they're inferred as those characters rather than as a boundary or an error message. An escape the `u` or `v` flag makes a `SyntaxError`, like `[\a]`, is a type error with those flags:

```ts
// was: Regex<"", {}>
// now: Regex<"\b", {}>
regex("^[\\b]$")

// was: Regex<"Escape preceding / is unnecessary and should be removed.", {}>
// now: Regex<"/", {}>
regex("^[\\/]$")
```

### infer `\s` as `string`

`\s` matches `\r`, `\f`, `\v` and Unicode spaces as well as `" "`, `"\n"` and `"\t"`, so it's inferred as `string`:

```ts
// was: Regex<`a${" " | "\n" | "\t"}c`, {}>
// now: Regex<`a${string}c`, {}>
regex("^a\\sc$")
```

### don't anchor a pattern at `^` or `$` with the `m` flag

With `m`, `^` and `$` also match at line breaks, so they no longer anchor the inferred pattern, and they're allowed mid-pattern:

```ts
// was: Regex<"abc", { flags: "m" }>
// now: Regex<`${string}abc${string}`, { flags: "m" }>
regex("^abc$", "m")
```

### infer an unbounded run of digits as `string`

`` `${number}` `` doesn't include a run of digits too long to be a finite number, so `\d+`, `\d*` and any unbounded repetition of a digit pattern infer `string` (#1663). A bounded repetition of a union including digits, like `(a|\d){2}`, also no longer drops its other branches:

```ts
// was: Regex<`${number}`, {}>
// now: Regex<string, {}>
regex("^\\d+$")

// was: Regex<`${number}`, {}>
// now: Regex<"aa" | `${number}${number}` | `${number}a` | `a${number}`, {}>
regex("^(?:a|\\d){2}$")
```

### count captures inside lookarounds

A capture inside a lookaround wasn't counted, so later captures were inferred at the wrong index (#1532). A capture inside a negative lookaround is `undefined`:

```ts
// was: Regex<"ab", { captures: ["b"] }>
// now: Regex<"ab", { captures: ["a", "b"] }>
regex("^(?=(a))a(b)$")
```

## 0.0.14

### allow `}` to be escaped

`\}` was a type error as an unnecessary escape, though the `u` and `v` flags require it to match `}` literally (#1691).

```ts
// was: type error
// now: Regex<"a{b}", { flags: "u" }>
regex("^a\\{b\\}$", "u")
```

Thanks to @cpruijsen.

## 0.0.6

### include the empty string when a zero-min quantifier applies to a number pattern

A quantifier with a minimum of `0` permits zero repetitions, which produce `""` — a string that `${number}` does not include on its own.

```ts
// was: Regex<`${number}`>
// now: Regex<"" | `${number}`>
regex("^\\d*$")
```

## 0.0.5

### represent \d as `${number}` instead of `${bigint}`

Though this slightly widens the scope of literal strings allowed by \d, it will now behave consistently and can collapse when multiple `${number}`s appear in sequence, since `${number}` allows 0-prefixed strings like `"00"` that are rejected by `${bigint}`.

```ts
// was: Regex<`${bigint}${bigint}`>
// now: Regex<`${number}`>
regex("^\\d{2}$")
```

## 0.0.4

### consecutive `${bigint}`s are no longer collapsed

```ts
// was: Regex<`${bigint}`>
// now: Regex<`${bigint}${bigint}`>
regex("^\\d{2}$")
```

Though the new representation will be longer for some expressions, it is required to correctly allow a zero-prefix like `"01"` in this case.

## 0.0.3

### fix quantifier behavior for non-natural numbers

```ts
// the following expressions now result in:
// TypeScript: Quantifier {bad-quantifier} must use natural numbers

// leading zeroes
regex("^a{002}$")
// negative quantifier
regex("^a{-1}$")
// non-integer quantifier
regex("^a{1.5}$")
// with whitespace
regex("^a{ 1}$"))
```

🙌(thanks @codpro2005)

## 0.0.1

initial release 🎉
