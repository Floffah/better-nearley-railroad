# better-nearley-railroad
An alternative to the built in nearley-railroad that is recursive and allows for templates.

1. [How to use](#how-to-use)
2. [Features](#features)

## How to use
Although this library generates a single page, it does organise it (kind of)

The order of rules generated are in order from when it found them starting from the entry rule.

To get this working all you need to do is run `npm install better-nearley-railroad && npx nearley-rr path-to-grammar.js out-file.html`

> **See an example of the output [here](https://floffah.github.io/better-nearley-railroad/)**

However if you wish to use your own template you can pass the --config option along with a relative path to a file that may look like

```json
{
  "template": "node_modules/better-nearley-railroad/template"
}
```

It is as easy as that!

## Features
All of the built in nearley-railroad features plus:
 - Templates (which allow you to write your own javascript)
 - Recursive rules (Doesn't just use rules from a single file, gets them from all files)
 - The github repository is equipped with CodeQL scanning for better security.
 - And more to come! Suggest them by creating a suggestion issue.
