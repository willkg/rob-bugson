"use strict";

/**
 * Content script that runs in the context of github pull request web pages and
 * adds "attach to bug" link.
 */

// Regexp to match against PR title
const BUG_RE = /\b(ticket|bug|tracker item|issue)s?:? *([\d ,\+&#and]+)\b/i;

// Base url for attaching a github pr to a bug
const BASE_URL = "https://bugzilla.mozilla.org/attachment.cgi?action=enter&bugid=";


/**
 * Retrieve the PR number from the pull request page.
 */
function getPRNum() {
    // Get the PR number which is like "#4099"
    var text = document.querySelector('span.gh-header-number').textContent;

    // Peel off the "#" and return
    return text.substring(1);
}


/**
 * Retrieve the PR title from the pull request page.
 */
function getPRTitle() {
    return document.querySelector('span.js-issue-title').textContent.trim();
}


/**
 * Get list of bug ids from PR title
 */
function getBugIds(text) {
    let match = BUG_RE.exec(text);
    let ret;
    if (match) {
        ret = new Set(match[2].split(/\D+/).filter((bugId) => !!bugId));
    } else {
        ret = new Set();
    }
    return Array.from(ret);
}

/**
 * Return "attach links" for each of the bugs specified.
 *
 * Attach links are set up with an event listener to sends the data to the
 * background script for opening and manipulating the new tab.
 */
function getAttachLinks(bugIds, prURL, prNum, prTitle) {
    return bugIds.map(function(bugId) {
        let link = document.createElement("a");
        link.href = "#";
        link.className = "bugzilla_link";
        link.addEventListener("click", (event) => {
            // Send a message to the background script. That handles creating a
            // tab, opening the attach page, and filling in the form.
            let url = BASE_URL + bugId;
            browser.runtime.sendMessage({
                "attachUrl": url,
                "prURL": prURL,
                "prNum": prNum,
                "prTitle": prTitle
            });
            event.preventDefault();
        });
        link.className = 'bugzilla_link';
        link.appendChild(document.createTextNode(bugId));
        return link;
    });
}


/**
 * Creates the "Attach to bug: " text and link nodes and returns them.
 */
function createAttachLinks() {
    var prURL = window.location.href;
    var prNum = getPRNum();
    var prTitle = getPRTitle();

    var bugIds = getBugIds(prTitle);

    var linkContainer = document.createElement('p');
    linkContainer.className = 'subtext';
    if (bugIds.length > 0) {
        linkContainer.appendChild(document.createTextNode('Attach to bug: '));

        var separator = document.createTextNode(', ');
        getAttachLinks(bugIds, prURL, prNum, prTitle).forEach(function(bugLink, i) {
            if (i > 0) {
                linkContainer.appendChild(separator.cloneNode(false));
            }
            linkContainer.appendChild(bugLink);
        });
    }
    return linkContainer;
}


let headerShow = document.querySelector('div.gh-header-show');
headerShow.appendChild(createAttachLinks());
