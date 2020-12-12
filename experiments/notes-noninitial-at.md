In the latest discussion with @mjbvz, we came up with two plausible fixes:

1. Do not let `@` start a tag after non-whitespace.
2. Do not let `@` start a tag *anywhere* after the beginning of a line. [1]

But we wanted to know how people have used non-initial `@` in the past. That's where I come in.

The basic problem here is to survey how JSDoc tags are used not at the end beginning of a line, and estimate how often each usage occurs.
To do this, I scanned a fully `npm install`ed Definitely Typed and Typescript user tests, looking both at Javascript and Typescript.
I used a simple regex looking for `@` after `*` after non-whitespace, which is actually not too far off Typescript's existing parsing.
I got 50,000 hits with no deduping -- this is significant since common dependencies show up multiple times.
As a result, I'm not only going to use rough numbers in the rest of this analysis. I don't have time to do more right now, and I don't think it will change my recommendations significantly.

Of those 50,000 hits, about 38,000 were for tags Typescript already handles correctly: `@link` and email addresses in the `@author` tag. That left 12,000 other hits.

### `@` after non-whitespace ###

For fix (1), I looked at the 7,000+ hits where non-initial `@` occurred after non-whitespace. I didn't see *any* JSDoc tags, although I was of course just reading through a text file and could have missed some.
I did see:

- Backquoted tags, (which our parser should handle correctly, except for when it's buggy)
- Backquoted scoped packages (same)
- Backquoted email addresses (same)
- Scoped packages used in code snippets
- Unquoted email addresses
- Usernames, quoted in various ways

So I think it's safe to say that the JSDoc parser should not treat `@` after non-whitespace as starting a tag.

### `@` after the beginning of a line ###

For the remaining almost-5,000 hits, there was at least one non-initial `@` preceded by whitespace on each line.
About 80% of these should **not** be treated tags:

- Over half were scoped packages.
- 10-20% (I didn't count, just eyeballed it) were usernames.
- Another 10%-ish were meta mentions of language constructs, from such popular languages as CSS, JSDoc, ESNext, ES internal slots, Active Directory, SQL, GraphQL, as well as some custom Google language.

The other 20% **should** be treated as tags. These usages fell into 3 categories:

- `@default` and `@since` were used postfix in Typescript files in a scattering of places
- `@see` was used inline as if it were `@link`, again only in Typescript files.
- Double tags were used quite a bit, but only in big projects used with (1) Closure (2) checkJS (3) TSDoc:
  - api-extractor: `/** @beta @override */`
  - selenium-webdriver/lib/input.js: `/** @private @const */`
  - webpack/lib/library/UmdLibraryPlugin.js: `/** @template T @typedef {import("./AbstractLibraryPlugin").LibraryContext<T>} LibraryContext<T> */`
  - also @types/react for some reason: `@see aria-pressed @see aria-selected`

### Recommendation ###

We should change the parser so that `@` does not begin a tag when preceded by any whitespace.

The other usages support strictness at about 80%/20%.
For a change with a big payoff, that's a reasonable ratio, especially considering how many of the projects in the 20% are customers that we have contact with.
The fix is also simple: you just need to run a regex search/replace on your source, like sed.
However, I don't see that big of a payoff for this change. The core of this bug is that unintended tags disrupt code examples. Unintended tags *also* interrupt text, but not as badly.

For now, we should not change the parser so that `@` only begins a tag at the beginning of a line.

[1] "the beginning of a line" has a complex definition in the actual TS parser. Basically, it means "skip whitespace, an asterisk, and more whitespace", except all 3 of those are optional.



50,838 hits, no deduping

37,050 @link
1,467 @author
250 hits for import x from '@y/z'

12,603 hits, no deduping

- 4,816 hits in 4,709 lines


## Things I Saw ##

(No counting)


## Things I Saw After Removing non-whitespace prefixes ##

4,710 lines

- scoped packages, scoped packages everywhere.gif (2517 of them)
- over 2,000 of them, based on the next number

## Things I Saw After Further Removing Scoped Packages ##

2,193 lines

Meta

- prettier source talking about jsdoc -- also typescript
- puppeteer source talking about CSS
- and lib.dom.d.ts, clean-css, electron-notify, svg-sprite, chrome-apps
- postcss talking about code talking about CSS
- ts-morph talking about jsdoc -- also jsdoc-to-markdown
- render3 talking about decorators -- also typeorm
- aws-sdk talking about graphql, also graphql-upload and -fields, 
- aws-sdk talking about Active Directory (remember when Active was the cool Microsoft prefix?)
- twitter-for-web talking about usernames, also microsoft-graph
- google-apps-script talking about SQL, also sql.js
- googleapis talking about .. some language
- adone talking about internal slots in ECMAScript?


Non-initial tags:
- jquery-toastmessage-plugin: /** in effect duration in miliseconds @default 600 */ -- also dashdash, jquery-jcrop, favicons
- cookieclicker (!): * Unused @deprecated

Double tags:
- @types/react: @see aria-pressed @see aria-selected.
- api-extractor: /** @beta @override */
- @rushstack: /** {@inheritDoc CommandLineParameter.appendToArgList} @override */
- browser-sync/index.d.ts: * @param timeout How long the message will remain in the browser. @since 1.3.0
- openui5/sap.ui.d.ts:         * @param sStyle @since 1.32.10, 1.34.4 the style of the pattern. The valid values are "wide", "short"
- coa/test/coa.js: /** @name describe @function */
- webpack/lib/library/UmdLibraryPlugin.js:/** @template T @typedef {import("./AbstractLibraryPlugin").LibraryContext<T>} LibraryContext<T> */
- selenium-webdriver/lib/input.js:    /** @private @const */
- sinon/pkg/sinon-no-sourcemaps.js:    /** @private @type {?Decoder} */

Other:
- zedit__upf/index.d.ts: @see used like it's @link -- also pdfjs-dist, coinbase, chromecast-caf-receiver (all TS), also naver-whale, ng-dialog, mimos, chroma-js, grecaptcha, chrome-apps
- @types/sinon/index.d.ts: @param used like it's @link (!!)
- pdfjs-dist: @ee used like it's @link (!!!)
- jexcel/index.d.ts appears to have removed newlines from their jsdocs entirely
- electron uses @ like it's the turn of the century. "HD @1920x1080"
- Plenty of github usernames.
