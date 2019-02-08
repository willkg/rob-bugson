"use strict";

/**
 * Content script that runs in the context of github web pages and:
 *
 * 1. susses out PR page and adds "attach to bug" links
 * 2. linkifies bugzilla bug numbers
 */

// Regexp to match against PR title
const BUG_RE = /\b(ticket|bug|tracker item|issue)s?:? *([\d ,\+&#and]+)\b/i;

// Base url for attaching a github pr to a bug
const ATTACH_BASE_URL = 'https://bugzilla.mozilla.org/attachment.cgi?action=enter&bugid=';

// Url for bug lists
const LIST_BASE_URL = 'https://bugzilla.mozilla.org/buglist.cgi?bug_id=';
const BUG_BASE_URL = 'https://bugzilla.mozilla.org/show_bug.cgi?id=';

const ATTACH_CONTAINER_ID = 'robBugsonAttachLinks';
const MERGE_CONTAINER_ID = 'robBugsonMergeLinks';
const LIST_CONTAINER_ID = 'robBugsonListLinks';

/**
 * Retrieve the PR number from the pull request page.
 */
function getPRNum() {
    // Get the PR number which is like "#4099"
    let text = document.querySelector('span.gh-header-number').textContent;

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
  * Retrieve the PR url
  */
function getPRUrl() {
    return document.URL;
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
 * Return array of "bugzilla links"--one for each bug.
 */
function getBugLinks(bugIds) {
    return bugIds.map((k) => {
        let bugLink = document.createElement('a');
        bugLink.href = BUG_BASE_URL + k;
        bugLink.target = '_blank';
        bugLink.className = 'bugzilla_link';
        bugLink.appendChild(document.createTextNode(k));
        return bugLink;
    });
}


/**
 * Return array of "attach links"--one for each bug.
 *
 * Attach links are set up with an event listener to sends the data to the
 * background script for opening and manipulating the new tab.
 */
function getAttachLinks(bugIds, prURL, prNum, prTitle) {
    return bugIds.map((bugId) => {
        let link = document.createElement("a");
        link.href = "#";
        link.className = "bugzilla_link";
        link.addEventListener("click", (event) => {
            // Send a message to the background script. That handles creating a
            // tab, opening the attach page, and filling in the form.
            let url = ATTACH_BASE_URL + bugId;
            browser.runtime.sendMessage({
                "eventName": "attachLink",
                "attachUrl": url,
                "prURL": prURL,
                "prNum": prNum,
                "prTitle": prTitle
            });
            event.preventDefault();
        });
        link.appendChild(document.createTextNode(bugId));
        return link;
    });
}


/**
 * Returns true if the URL is a github pull request page.
 *
 * @param {URL} url
 * @returns {bool}
 */
function isPullRequest(url) {
    return (
        url.origin == "https://github.com"
            && url.pathname.split("/")[3] == "pull"
    );
}


/**
 * Returns true if the URL is a github compare page.
 *
 * @param {URL} url
 * @returns {bool}
 */
function isComparePage(url) {
    return (
        url.origin == "https://github.com"
            && url.pathname.split("/")[3] == "compare"
    );
}


/**
 * Checks if there's already a container and if not, creates one with attach
 * links in it.
 */
function addAttachLinksToPage() {
    // If this is not a pull request page, then return.
    if (!isPullRequest(new URL(window.location.href))) {
        return;
    }

    // If there's already a link container, then return.
    let linkContainer = document.getElementById(ATTACH_CONTAINER_ID);
    if (linkContainer == null) {
        // If there's no link container, then we create a new one
        linkContainer = document.createElement('p');
        linkContainer.id = ATTACH_CONTAINER_ID;
        linkContainer.className = 'subtext';
    }

    // Remove everything from the link container so we don't end up with
    // duplicates
    while (linkContainer.firstChild) {
        linkContainer.removeChild(linkContainer.firstChild);
    }

    let headerShow = document.querySelector('div.gh-header-show');

    let prURL = window.location.href;
    let prNum = getPRNum();
    let prTitle = getPRTitle();

    let bugIds = getBugIds(prTitle);

    // If there are no bug ids, just return
    if (bugIds.length == 0) {
        return;
    }
    linkContainer.appendChild(document.createTextNode('Attach this PR to bug: '));

    let separator = document.createTextNode(', ');
    getAttachLinks(bugIds, prURL, prNum, prTitle).forEach((bugLink, i) => {
        if (i > 0) {
            linkContainer.appendChild(separator.cloneNode(false));
        }
        linkContainer.appendChild(bugLink);
    });

    headerShow.appendChild(linkContainer);
}


function createBugsList(bugIds){
    let bugsListContainer = document.getElementById(LIST_CONTAINER_ID);
    if (bugsListContainer == null) {
        bugsListContainer = document.createElement('p');
        bugsListContainer.id = LIST_CONTAINER_ID;
        bugsListContainer.className = 'subtext';
    }

    // Remove everything from container so we don't have duplicates
    while (bugsListContainer.firstChild) {
        bugsListContainer.removeChild(bugsListContainer.firstChild);
    }
    if (bugIds.length == 0) {
        return bugsListContainer;
    }

    bugsListContainer.appendChild(document.createTextNode('View bugs in commits ('));

    let openAll = document.createElement('a');
    openAll.href = LIST_BASE_URL + bugIds.join(',');
    openAll.id = 'open_all_bugzilla_links';
    openAll.target = '_blank';
    openAll.appendChild(document.createTextNode('open all'));
    bugsListContainer.appendChild(openAll);
    bugsListContainer.appendChild(document.createTextNode('): '));

    let separator = document.createTextNode(', ');
    getBugLinks(bugIds).forEach((bugLink, i) => {
        if (i > 0) {
            bugsListContainer.appendChild(separator.cloneNode(false));
        }
        bugsListContainer.appendChild(bugLink);
    });

    return bugsListContainer;
}


function addBugListToPage() {
    let url = new URL(window.location.href);
    let parentElement;
    let bugIds;

    // If this is a compare page
    if (isComparePage(url)) {
        bugIds = [];
        let elements = document.querySelectorAll('a.message, div.commit-desc pre');
        Array.prototype.forEach.call(elements, (el) => {
            bugIds = bugIds.concat(getBugIds(el.textContent));
        });
        let insertBeforeEl = document.getElementById('commits_bucket');
        parentElement = insertBeforeEl.parentElement;
        parentElement.insertBefore(createBugsList(bugIds), insertBeforeEl);
        return;
    }

    if (isPullRequest(url)) {
        bugIds = getBugIds(getPRTitle());
        parentElement = document.querySelector('div.gh-header-show');
        parentElement.appendChild(createBugsList(bugIds));
    }
}


/**
 * Checks if this PR has been merged and if so and there are no merge
 * links, yet, creates them.
 */
function addMergeLinks() {
    // If this is not a pull request page, then return.
    if (!isPullRequest(new URL(window.location.href))) {
        return;
    }

    let linkContainer = document.getElementById(MERGE_CONTAINER_ID);
    if (linkContainer == null) {
        // If there's no link container, then we create a new one
        linkContainer = document.createElement('p');
        linkContainer.id = MERGE_CONTAINER_ID;
        linkContainer.className = 'subtext';
    }

    // Removes everything from the link container so we don't end up
    // with duplciates
    while (linkContainer.firstChild) {
        linkContainer.removeChild(linkContainer.firstChild);
    }

    let prNum = getPRNum();
    let prTitle = getPRTitle();
    let prUrl = getPRUrl();
    let bugIds = getBugIds(prTitle);

    // If there are no bug ids, just return
    if (bugIds.length == 0) {
        return;
    }

    // See if there's been a merge
    let state = document.querySelector('div.State.State--purple');
    if (state === null) {
        return;
    }
    state = state.textContent.trim();
    if (state !== 'Merged') {
        return;
    }

    linkContainer.appendChild(document.createTextNode('Add merge comment to bug: '));

    // Find the merge commit event and the bits we want
    let elements = document.querySelectorAll('h3.discussion-item-header');
    let author = '';
    let commitSha = '';
    let commitUrl = '';

    // This goes through all the events to figure out the merge commit
    Array.prototype.forEach.call(elements, (el) => {
        if (el.textContent.match(/merged commit/)) {
            author = el.querySelector('a.author').textContent.trim();

            // NOTE(willkg): the a tag we want is the one that has no id or class--that's
            // really irritating
            let commitElem = el.querySelector('a:not([class])');
            commitUrl = 'https://github.com' + commitElem.getAttribute('href');
            commitSha = commitElem.textContent.trim();
        }
    });

    let headerShow = document.querySelector('div.gh-header-show');
    let separator = document.createTextNode(', ');

    if (author && prNum && commitSha && commitUrl) {
        let bugLinks = bugIds.map((bugId) => {
            let link = document.createElement("a");
            link.href = "#";
            link.className = "merge_link";
            link.addEventListener("click", (event) => {
                // Send a message to the background script. That handles creating a
                // tab, opening the bug page, and adding a comment.
                let url = BUG_BASE_URL + bugId;
                browser.runtime.sendMessage({
                    "eventName": "mergeComment",
                    "bugUrl": url,
                    "author": author,
                    "prNum": prNum,
                    "prUrl": prUrl,
                    "prTitle": prTitle,
                    "authorUrl": "https://github.com/" + author,
                    "commitSha": commitSha,
                    "commitUrl": commitUrl
                });
                event.preventDefault();
            });
            link.appendChild(document.createTextNode(bugId));
            return link;
        });

        bugLinks.forEach((bugLink, i) => {
            if (i > 0) {
                linkContainer.appendChild(separator.cloneNode(false));
            }
            linkContainer.appendChild(bugLink);
        });
    }

    headerShow.appendChild(linkContainer);
}


function runEverything() {
    addBugListToPage();
    addAttachLinksToPage();
    addMergeLinks();
}

runEverything();


function debounce(func, wait) {
    let timeout;
    return function() {
        var context = this;
        var later = function() {
            timeout = null;
            func.apply(context);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
	  };
};

let debounceRunEverything = debounce(runEverything, 200);


// Set up an observer to handle page changes
let config = {
    childList: true,
    attributes: false,
    characterData: false,
    subtree: true,
};

let pjaxContainer = document.getElementById('js-repo-pjax-container');
if (pjaxContainer) {
    const pjaxContainerObserver = new window.MutationObserver((mutations) => {
        debounceRunEverything();
    });
    pjaxContainerObserver.observe(pjaxContainer, config);
}
