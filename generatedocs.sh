#!/bin/sh

# This script uses autodoc and docco to generate documentation in two flavors

autodoc -t --javascripts lib/ajax.js,lib/queue.js lib/putstuffhere.js
autodoc --template autodoc.html.mustache --javascripts lib/ajax.js,lib/queue.js lib/putstuffhere.js
docco --output annotated/ lib/*.js