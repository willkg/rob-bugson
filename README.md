# rob-bugson: a GitHub/Bugzilla Mashup Extension

This is a GitHub/Bugzilla mashup extension that eases the great divide between
GitHub and Mozilla's Bugzilla instance.


## Features

* adds an "Attach to bug" link to pull request pages that reference a bug
  number in the summary
* great name
* released under the MPLv2


## Contributors

* Will Kahn-Greene
* Dietrich Ayala: wrote Github-Bugzilla-Tweaks and I based the methodology
  on that
* Paul Maclanahan
* Mike Cooper
* Mike Kelly
* you could be here!


## Issues, PRs, and maintenance

If you have a problem, write up an issue at:
https://github.com/willkg/rob-bugson/issues

If you can fix something, please submit a PR.

If you can help someone, please comment on their issue.

I'll merge PRs and do releases, but probably won't do anything else.


## Development

Use the
[browser extension docs on MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions).


## Release

1. complete changes, update `CHANGELOG.md`
2. `git tag -s vX.Y`
3. `make zip`
4. rename zip file to use version number
5. upload zip file to AMO


## Acknowledgements

This is inspired by Dietrich Ayala's
[Github-Bugzilla-Tweaks](https://github.com/autonome/Github-Bugzilla-Tweaks).
Thank you!

Thank you to MDN contributors and webextension developers who wrote up the
documentation for webextensions, related APIs, and all the code samples!

[Install it on AMO](https://addons.mozilla.org/en-US/firefox/addon/rob-bugson/)
