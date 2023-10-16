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
const ATTACH_BASE_URL = "https://bugzilla.mozilla.org/attachment.cgi?action=enter&bugid=";

// Url for bug lists
const LIST_BASE_URL = "https://bugzilla.mozilla.org/buglist.cgi?bug_id=";
const BUG_BASE_URL = "https://bugzilla.mozilla.org/show_bug.cgi?id=";

const ATTACH_CONTAINER_ID = "robBugsonAttachLinks";
const MERGE_CONTAINER_ID = "robBugsonMergeLinks";
const LIST_CONTAINER_ID = "robBugsonListLinks";

const PR_STATE_MERGED = "Merged";
const PR_STATE_UNKNOWN = "Unknown";

const TAB_UNKNOWN = "Unknown";
const TAB_CONVERSATION = "Conversation";


/**
 * Retrieve the PR number from the pull request page.
 */
function getPRNum() {
    // Get the PR number which is like "#4099"
    let elem = document.querySelector("h1.gh-header-title span");
    if (!elem) {
        return;
    }

    // Peel off the "#" and return
    return elem.textContent.substring(1);
}


/**
 * Retrieve the PR title from the pull request page.
 */
function getPRTitle() {
    let elem = document.querySelector("bdi.js-issue-title");
    if (!elem) {
        return;
    }
    return elem.textContent.trim();
}


/**
 * Retrieve the PR url.
 *
 * Make sure to drop # and anything after it because it makes Bugzilla sad.
 */
function getPRUrl() {
    let url = document.URL;
    return url.replace(/#.*/, "");
}


/**
 * Retrieve the repo organization and repo name.
 */
function getRepoInfo() {
    // Grab the first two parts of the url path
    let url = new URL(document.URL);
    let pathname = url.pathname;
    let pathParts = pathname.split("/");
    return {
        repoOrg: pathParts[1],
        repoName: pathParts[2]
    };
}


/**
 * Retrieve PR state.
 */
function getPRState() {
    // See if there"s been a merge
    let state = document.querySelector(".State.State--merged");
    if (state === null) {
        return PR_STATE_UNKNOWN;
    }
    state = state.textContent.trim();
    if (state == "Merged") {
        return PR_STATE_MERGED;
    }
    return PR_STATE_UNKNOWN;
}


/**
 * For PRs, get the selected tab.
 */
function getSelectedTab() {
    let tab = document.querySelector("a.tabnav-tab.selected");
    if (!tab) {
        return TAB_UNKNOWN;
    }
    let tabText = tab.textContent.trim();
    if (tabText.startsWith("Conversation")) {
        return TAB_CONVERSATION;
    }
    return TAB_UNKNOWN;
}


/**
 * Get list of bug ids from PR title.
 */
function getBugIdsFromPRTitle(text) {
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
 * Get list of bug ids from commits.
 */
function getBugIdsFromCommits() {
    let bugIds = [];
    let elements = document.querySelectorAll("a.message, div.commit-desc pre");
    Array.prototype.forEach.call(elements, (el) => {
        bugIds = bugIds.concat(getBugIds(el.textContent));
    });
    return bugIds;
}

/**
 * Return array of "bugzilla links"--one for each bug.
 */
function getBugLinks(bugIds) {
    return bugIds.map((k) => {
        let bugLink = document.createElement("a");
        bugLink.href = BUG_BASE_URL + k;
        bugLink.target = "_blank";
        bugLink.className = "bugzilla_link";
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
function getAttachLinks(bugIds, repoInfo, prUrl, prNum, prTitle) {
    return bugIds.map((bugId) => {
        let link = document.createElement("a");
        link.href = "#";
        link.className = "bugzilla_link";
        link.addEventListener("click", (event) => {
            // Send a message to the background script. That handles creating a
            // tab, opening the attach page, and filling in the form.
            let url = ATTACH_BASE_URL + bugId;
            var sending = browser.runtime.sendMessage({
                eventName: "attachLink",
                attachUrl: url,
                repoOrg: repoInfo.repoOrg,
                repoName: repoInfo.repoName,
                prUrl: prUrl,
                prNum: prNum,
                prTitle: prTitle
            });
            sending.then(
                (message) => console.info("rob-bugson: attachlink success: " + message),
                (error) => console.info("rob-bugson: attachlink error: " + error)
            );
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
function addAttachLinksToPage(pageKind, repoInfo, prNum, prTitle, prUrl, bugIds) {
    // If this is not a pull request page, then return.
    if (pageKind != "pr") {
        return;
    }

    // If there's already a link container, then return.
    let linkContainer = document.getElementById(ATTACH_CONTAINER_ID);
    if (linkContainer == null) {
        // If there"s no link container, then we create a new one
        linkContainer = document.createElement("p");
        linkContainer.id = ATTACH_CONTAINER_ID;
        linkContainer.className = "subtext";
    }

    // Remove everything from the link container so we don't end up with
    // duplicates
    while (linkContainer.firstChild) {
        linkContainer.removeChild(linkContainer.firstChild);
    }

    let headerShow = document.querySelector("div.gh-header-show");

    // If there are no bug ids, just return
    if (bugIds.length == 0) {
        return;
    }
    linkContainer.appendChild(document.createTextNode("Attach this PR to bug: "));

    let separator = document.createTextNode(", ");
    getAttachLinks(bugIds, repoInfo, prUrl, prNum, prTitle).forEach((bugLink, i) => {
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
        bugsListContainer = document.createElement("p");
        bugsListContainer.id = LIST_CONTAINER_ID;
        bugsListContainer.className = "subtext";
    }

    // Remove everything from container so we don't have duplicates
    while (bugsListContainer.firstChild) {
        bugsListContainer.removeChild(bugsListContainer.firstChild);
    }
    if (bugIds.length == 0) {
        return bugsListContainer;
    }

    bugsListContainer.appendChild(document.createTextNode("View bugs in commits ("));

    let openAll = document.createElement("a");
    openAll.href = LIST_BASE_URL + bugIds.join(",");
    openAll.id = "open_all_bugzilla_links";
    openAll.target = "_blank";
    openAll.appendChild(document.createTextNode("open all"));
    bugsListContainer.appendChild(openAll);
    bugsListContainer.appendChild(document.createTextNode("): "));

    let separator = document.createTextNode(", ");
    getBugLinks(bugIds).forEach((bugLink, i) => {
        if (i > 0) {
            bugsListContainer.appendChild(separator.cloneNode(false));
        }
        bugsListContainer.appendChild(bugLink);
    });

    return bugsListContainer;
}


function addBugListToPage(pageKind, bugIds) {
    let parentElement;

    // If this is a compare page
    if (pageKind == "compare") {
        let insertBeforeEl = document.getElementById('commits_bucket');
        parentElement = insertBeforeEl.parentElement;
        parentElement.insertBefore(createBugsList(bugIds), insertBeforeEl);

    } else if (pageKind == "pr") {
        parentElement = document.querySelector('div.gh-header-show');
        parentElement.appendChild(createBugsList(bugIds));
    }
}


/**
 * Checks if this PR has been merged and if so and there are no merge
 * links, yet, creates them.
 */
function addMergeLinks(pageKind, repoInfo, prNum, prTitle, prUrl, prState, bugIds) {
    // If this is not a pull request page, then return.
    if (pageKind != "pr") {
        return;
    }

    let linkContainer = document.getElementById(MERGE_CONTAINER_ID);
    if (linkContainer == null) {
        // If there"s no link container, then we create a new one
        linkContainer = document.createElement("p");
        linkContainer.id = MERGE_CONTAINER_ID;
        linkContainer.className = "subtext";
    }

    // Removes everything from the link container so we don't end up
    // with duplicates
    while (linkContainer.firstChild) {
        linkContainer.removeChild(linkContainer.firstChild);
    }

    // If there are no bugs or this isn't merged, return
    if (bugIds.length == 0 || prState != PR_STATE_MERGED) {
        return;
    }

    linkContainer.appendChild(document.createTextNode("Add merge comment to bug: "));

    // Find the merge commit event and the bits we want
    let elements = document.querySelectorAll("div.TimelineItem-body");
    let author = "";
    let commitSha = "";
    let commitUrl = "";

    // This goes through all the events to figure out the merge commit
    Array.prototype.forEach.call(elements, (el) => {
        if (el.textContent.match(/merged commit/)) {
            author = el.querySelector("a.author").textContent.trim();

            // NOTE(willkg): the a tag we want is the one that has no id or class--that"s
            // really irritating
            let linkElems = el.querySelectorAll("a");
            Array.prototype.forEach.call(linkElems, (elem) => {
                let href = elem.getAttribute("href")
                if (href && href.match(/\/commit\//)) {
                    commitUrl = "https://github.com" + href;
                    commitSha = elem.textContent.trim();
                }
            });
        }
    });

    let headerShow = document.querySelector("div.gh-header-show");
    let separator = document.createTextNode(", ");

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
                    "repoOrg": repoInfo.repoOrg,
                    "repoName": repoInfo.repoName,
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
    let prNum = getPRNum();

    if (!prNum) {
        return;
    }

    let prTitle = getPRTitle();
    let prUrl = getPRUrl();
    let prState = getPRState();
    let repoInfo = getRepoInfo();
    let selectedTab = getSelectedTab();

    let bugIds;
    let pageKind;

    let url = new URL(window.location.href);
    if (isComparePage(url)) {
        pageKind = "compare";
        bugIds = getBugIdsFromCommits();
    } else if (isPullRequest(url)) {
        pageKind = "pr";
        bugIds = getBugIdsFromPRTitle(prTitle);
    } else {
        pageKind = "";
        bugIds = [];
    }

    // Show the links if we're on a Compare page or a PR page and the
    // conversation tab
    if (pageKind == "compare" || (pageKind == "pr" && selectedTab == TAB_CONVERSATION)) {
        addBugListToPage(pageKind, bugIds);
        addAttachLinksToPage(pageKind, repoInfo, prNum, prTitle, prUrl, bugIds);
        addMergeLinks(pageKind, repoInfo, prNum, prTitle, prUrl, prState, bugIds);
    }
}


function debounce(func, func_name, wait) {
    var debouncing = false;
    function debouncedFunc() {
        console.info("rob-bugson: debouncing state: " + debouncing);
        if (debouncing) {
            return;
        }

        debouncing = true;

        var later = function() {
            console.info("rob-bugson: running function: " + func_name + ": start");
            func();
            console.info("rob-bugson: running function: " + func_name + ": end");
        }

        setTimeout(() => later(), wait);
        setTimeout(() => debouncing = false, wait);
    };
    return debouncedFunc;
};


let debounceRunEverything = debounce(runEverything, "runEverything", 200);

console.info("rob-bugson: init");
debounceRunEverything();

// Set up an observer to handle page changes
let config = {
    childList: true,
    attributes: false,
    characterData: false,
    subtree: true,
};

let pjaxContainer = document.getElementById("js-repo-pjax-container");
if (pjaxContainer) {
    const pjaxContainerObserver = new window.MutationObserver((mutations, observer) => {
        debounceRunEverything();
    });
    pjaxContainerObserver.observe(pjaxContainer, config);
    console.info("rob-bugson: set up observer");
}
