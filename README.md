# rob-bugson: a GitHub/Bugzilla Mashup Extension

This is a GitHub/Bugzilla mashup extension that eases the great divide between
GitHub and Mozilla's Bugzilla instance.

[Install rob-bugson on Firefox Add-ons site.](https://addons.mozilla.org/en-US/firefox/addon/rob-bugson/)


## Features

* adds **View bugs** links for every bug mentioned in the pull request summary on
  a pull request page
* adds **View bugs** links for every bug mentioned in commit message summaries on
  the compare page to create a pull request
* adds **Attach this PR to bug** links for every bug mentioned in the pull
  request summary on a pull request page
* adds **Add merge comment to bug** links for every bug mentioned in the pull
  request summary on a pull request page
* since it opens webpages in Bugzilla, it uses whatever account you're logged
  in as and so it *works with security bugs and employee-confidential bugs*
* since it doesn't save anything, you can edit attach summaries and merge
  comment messages before saving
* since it doesn't do anything automatically, it's less likely you'll goof and
  close some other bug
* best name ever
* released under the MPLv2


## Primary use cases

### Attach pull request to relevant bug

Gilda finishes the changes required to fix bug 123456. She commits them to her
branch and creates a pull request on GitHub with the summary:

> bug 123456: implement cookie baker

  
rob-bugson notices "bug 123456" in the PR summary and creates a link to attach
the pull request to the relevant bug in Bugzilla. Gilda clicks on the link
which opens a new tab on the attach page for that bug and attaches the pull
request.

### View relevant bugs

Henrietta is reviewing a pull request. The pull request summary is:

> fix bug 123456, 456789: reticulate the splines
  
rob-bugson notices "fix bug 123456, 456789" and creates an **open all** link
which opens Bugzilla with a bug list of both bugs, a 123456 link which opens
Bugzilla with that specific bug, and a 456789 link which opens Bugzilla with
that specific bug. Henrietta clicks on "open all" and views all the bugs.

### Add merge commit

Gilda's pull request has been reviewed and approved. She clicks on the merge
button. rob-bugson creates an **Add merge commit to this bug** link for each bug
mentioned in the pull request summary. Gilda clicks on each link which opens
Bugzilla to that specific bug with pre-populated comment box summarizing the
merge. Gilda clicks on **Save Changes** and the merge comment is saved.


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

1. complete changes, update `manifest.json`, update `CHANGELOG.md`
2. `git tag -s vX.Y`
3. `make zip`
4. rename zip file to use version number
5. upload zip file to AMO


## Acknowledgements

This is inspired by Dietrich Ayala's
[Github-Bugzilla-Tweaks](https://github.com/autonome/Github-Bugzilla-Tweaks).
Thank you!

This uses code from Paul MacLanahan's Github List Bugzilla Bugs extension
thus merging the two.

Thank you to MDN contributors and webextension developers who wrote up the
documentation for webextensions, related APIs, and all the code samples!

[Install rob-bugson on Firefox Add-ons site.](https://addons.mozilla.org/en-US/firefox/addon/rob-bugson/)
