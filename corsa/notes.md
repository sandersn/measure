# three.js

unchecked JS

## Notes

1. can't `export * from 'x.js'` where x.js is an empty file (not a module)
2. expando assignments to `window` don't work
3. way way more did-you-mean corrections are offered (is it disabled in Strada JS by mistake?)
4. `typeof` is now required on values in type annotations
5. `Object` no longer means `any`
6. Stricter typing for index access typing?
7. Prototype property assignments (or any ctor function stuff) is not *yet* supported.
8. No error on some (?) undeclared type references
9. Errors on expando assignments to vars with non-`{}` initialisers
10. Initialiser of `{}` in non-expando declarations doesn't is now of type `{}` not `any`.
11. Auto types only work with noImplicitAny, even in JS.
12. Stricter arity checking.
13. Closure `function(number): void` syntax isn't parsed anymore.
14. Signature assignability is stricter -- loose arity is gone.
15. `Object.defineProperties(this, ...)` isn't supported anymore.
16. `Object.<string, string>` synonym for `Record<string, string>` isn't supported anymore.
17. New error for `@readonly` on accessor (it was already get-only, it's redundant)
18. Error for unsupported `Namespace~Value` syntax is slightly worse (bind error in Corsa, parse error in Strada).

- Pretty sure I found a bug in AnimationMixer.clipAction because of (6), plus looking at the narrowed types.
- (9) doesn't work in Strada, it just doesn't error.

## Experience
How much worse is the unchecked JS experience going to be for three.js?

- Missing `typeof` is going to turn into `any` now.
- Prototype property assignments are going to be `any`.
- Control flow narrowing doesn't apply without `--strict`, so more `any` there.
- Closure function types are going to be `any`.
- Missing `Object.defineProperties` turns that usage into `any`. (only in two places, to control enumerability)

# svelte

JS-in-TS

https://github.com/sveltejs/svelte/pull/16485

1. Inference to unknown instead of any--requires cast/annotations back to any.
2. new Set gives Set<unknown> not Set<any>--requires annotation, like TS
3. typeof isn't implicitly inserted--you have to explicitly write it now

(2) and (3) are pretty straightforward to fix. (1) is usually pretty easy.
 
4. Runner-up: stricter signature-to-signature checking, which results in hideous messages if your types are complex (Svelte's types are complex). Fortunately only showed up twice I think.

# unifiedjs
JS-in-TS

1. `@template` tags are no longer shared between `@overload` tags. You must provide them for each overload, right before the `@overload` tag.

https://github.com/unifiedjs/unified/pull/264

# vfile-message
JS-in-TS

1. Class properties need initialisers; you can't put `@type` on an ExpressionStatement anymore.

https://github.com/vfile/vfile-message/pull/21

# video.js

unchecked JS

Works fine out of the box.

# axios

unchecked JS

## Notes

1. Constructor functions aren't supported yet.
2. Stricter arity checking.
3. `Object` no longer means `any`.
4. `Boolean` no longer means `boolean`, also `Number`, `String`, `function` etc.
4. No expandos on vars with non-empty object initialisers.
16. `Object.<string, string>` synonym for `Record<string, string>` isn't supported anymore.
14. Signature assignability is stricter -- loose arity is gone.
8. Errors on calls to multiple overloads always report the error on just the last overload.

There's only one constructor function that I see but it's AxiosError so it's used all over everywhere.

## Experience

Axios uses lots of dynamic building of objects. Corsa is worse at understanding these than Strada, but not by much. 
It also uses the Capital names for built-in types a lot, which causes that code to be much less useful than in Strada.
