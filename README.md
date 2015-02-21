# Put Stuff Here
Put Stuff Here is a minimalist, human-first templating system. Instead of writing something like `{{article.title}}` or `<%= titles[i] %>`, you just write `Put title here`. For example, given this data:

```json
{
  "title": "Hello World!",
  "body": "This is an example.",
  "author": "Ben Syverson"
}
```

…and this template…

```html
<h2> Put title here </h2>
<p>
     Put body here
</p>
<p>
– <em>  put author here  </em>
</p>
```

…the result will be:

```html
<h2> Hello World! </h2>
<p>
     This is an example.
</p>
<p>
– <em>  Ben Syverson  </em>
</p>
```

To edit a live example, visit [the main Put Stuff Here page](http://put.stuffhere.org/).


## Background

Put Stuff Here is so easy to understand that almost anyone can create or edit a template. This reduces the burden on web developers, and empowers less technical folks to make changes.

The result is more fluid collaboration and faster iterations. For example, a visual designer can create a template in [WebFlow](http://webflow.com/) or another WYSIWYG editor, which can be dropped directly into your prototype.

## Features

- Very few features!
- Easy to understand (for everyone).
- Templates can be compiled to fast functions.
- Templates can be fetched and cached from .html files, via `fs()` in Node.js or AJAX in the browser.
All values are HTML-escaped by default. To insert HTML, use this parenthetical: `Put stuff (unescaped) here`.


## Parentheticals
Parentheticals will be applied as methods on the string; Given `stuff = "Example"`, the output from: `Put stuff (toLocaleUpperCase) here` will be: `EXAMPLE`. But don’t do that. Leave case transformations to CSS.

The parenthetical API is provided to allow you to manipulate variables in your own application-specific way. For example, if you need to show a summary of an article, rather than exporting body and a separate variable, summary, you could export body, and extend String with:

```javascript
String.prototype.summary = function() {
  return this.substr(0, 30) + "…";
}
```

Then, in your template, you could write: `Put body (summary) here`. Use this form sparingly, because it makes the template less readable and more complicated.

## FAQ
**Q: What about conditionals, loops, and transformations?**  
A: I strongly believe that these things belong in your application logic. When you mix logic into your template, you suddenly have many places to look for bugs. Logic-riddled templates are far less readable to non-technical people.

**Q: How would you handle a list, then?** 
A: That’s up to you. I might run Put Stuff Here templates against each list item, and concatenate the result into a `list` variable. Then you could write `Put list (unescaped) here` in the parent template.

**Q: So you only support one magic phrase?** 
A: Right now, the only supported format is `Put stuff here`, but support is coming for `Insert stuff` and `Stuff goes here`. I would love to get support for other languages—feel free to send a pull request.

**Q: I need to have the phrase "Put X here" in my template. How do I escape it?** 
A: Do you really need it in your template? If so, insert a newline (`\n`) or HTML tag somewhere in the phrase:

```
Put
something here.
```

Or: `Put <!-- --> something here`.

Put Stuff Here will only expand a phrase if it’s in one contiguous line. The linebreak or comment will of course be ignored by the browser.

## License

See LICENSE.md for the full MIT license.