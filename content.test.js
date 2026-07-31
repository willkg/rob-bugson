const {
    addMergeLinks,
    BUG_BASE_URL,
    getAttachLinks,
    getBugIdsFromPRTitle,
    MERGE_CONTAINER_ID,
    PR_STATE_CLOSED,
    PR_STATE_MERGED,
    PR_STATE_OPEN,
    PR_STATE_UNKNOWN,
    TAB_CONVERSATION,
    TAB_OTHER,
    getPRNum,
    getPRTitle,
    getPRState,
    getSelectedTab,
} = require("./github-bugzilla-content");

// Minimal GitHub PR page header HTML matching the current (post-2024) structure,
// derived from mozilla-services/socorro pull requests.
const PR_HEADER_HTML = (title, num, status, selectedTab) => `
    <div>
        <h1 data-component="PH_Title">
            <span class="markdown-title">${title}</span><span><span>#${num}</span></span>
        </h1>
        <div data-component="PH_Actions"></div>
        <div>
            <span data-status="${status}">Merged</span>
        </div>
        <div data-component="PH_Navigation">
            <nav aria-label="Pull request navigation tabs">
                <div role="tablist">
                    <a role="tab" ${selectedTab == "Conversation" ? 'aria-current="page"' : ''} href="#">Conversation</a>
                    <a role="tab" ${selectedTab === "Commits" ? 'aria-current="page"' : ''} href="#">Commits</a>
                    <a role="tab" ${selectedTab === "Files changed" ? 'aria-current="page"' : ''} href="#">Files changed</a>
                </div>
            </nav>
        </div>
    </div>
`;

describe("Content script", () => {
    afterEach(() => {
        // restore spies created with spyOn
        jest.restoreAllMocks();
    });

    describe("getPRNum", () => {
        it("returns the PR number from the page", () => {
            document.body.innerHTML = PR_HEADER_HTML("bug-1746636: move PROCESS_TYPES to socorro directory", "7170", "pullMerged", "Conversation");
            expect(getPRNum()).toBe("7170");
        });

        it("returns undefined when PH_Title is not present", () => {
            document.body.innerHTML = "<div></div>";
            expect(getPRNum()).toBeUndefined();
        });
    });

    describe("getPRTitle", () => {
        it("returns the PR title from the page", () => {
            document.body.innerHTML = PR_HEADER_HTML("bug-1746636: move PROCESS_TYPES to socorro directory", "7170", "pullMerged", "Conversation");
            expect(getPRTitle()).toBe("bug-1746636: move PROCESS_TYPES to socorro directory");
        });

        it("returns undefined when PH_Title is not present", () => {
            document.body.innerHTML = "<div></div>";
            expect(getPRTitle()).toBeUndefined();
        });
    });

    describe("getPRState", () => {
        it("returns PR_STATE_MERGED when the PR is merged", () => {
            document.body.innerHTML = PR_HEADER_HTML("bug-1: fix things", "99", "pullMerged", "Conversation");
            expect(getPRState()).toBe(PR_STATE_MERGED);
        });

        it("returns PR_STATE_OPEN when the PR is open", () => {
            document.body.innerHTML = PR_HEADER_HTML("bug-1: fix things", "99", "pullOpened", "Conversation");
            expect(getPRState()).toBe(PR_STATE_OPEN);
        });

        it("returns PR_STATE_CLOSED when the PR is closed", () => {
            document.body.innerHTML = PR_HEADER_HTML("bug-1: fix things", "99", "pullClosed", "Conversation");
            expect(getPRState()).toBe(PR_STATE_CLOSED);
        });

        it("returns PR_STATE_UNKNOWN when the PR is closed", () => {
            document.body.innerHTML = PR_HEADER_HTML("bug-1: fix things", "99", "randomValue", "Conversation");
            expect(getPRState()).toBe(PR_STATE_UNKNOWN);
        });
    });

    describe("getSelectedTab", () => {
        it("returns TAB_CONVERSATION when the Conversation tab is selected", () => {
            document.body.innerHTML = PR_HEADER_HTML("bug-1: fix things", "99", "pullMerged", "Conversation");
            expect(getSelectedTab()).toBe(TAB_CONVERSATION);
        });

        it("returns TAB_OTHER when a non-Conversation tab is selected", () => {
            document.body.innerHTML = PR_HEADER_HTML("bug-1: fix things", "99", "pullMerged", "Commits");
            expect(getSelectedTab()).toBe(TAB_OTHER);
        });

        it("returns TAB_OTHER when no tab is selected", () => {
            document.body.innerHTML = "<div></div>";
            expect(getSelectedTab()).toBe(TAB_OTHER);
        });
    });

    describe("getAttachLinks", () => {
        const bugIds = [1];
        const repoInfo = '';
        const prUrl = '';
        const prNum = '';
        const prTitle = '';
        it("sends a message to the background script when a link is clicked", async () => {
            const sendMessage = jest.spyOn(browser.runtime, "sendMessage").mockResolvedValue({});
            const links = getAttachLinks(bugIds, repoInfo, prUrl, prNum, prTitle);
            const link = links[0];
            link.click();
            expect(sendMessage).toHaveBeenCalledTimes(bugIds.length);
        });
    });

    describe("getBugIdsFromPRTitle", () => {
        const prTitleSuffix = ": fix all the things";
        test.each([
            ["bug 111", ["111"]],
            ["bug: 111", ["111"]],
            ["bugs 111", ["111"]],
            ["bug-111", ["111"]],
        ])(
            'given PR title prefix %p, returns %p',
            (prTitlePrefix, expected) => {
              expect(getBugIdsFromPRTitle(prTitlePrefix + prTitleSuffix)).toStrictEqual(expected);
            },
        );
        test.each([
            ["bugs 111, 222, & 333", ["111", "222", "333"]],
            ["bugs 111, 222, and 333", ["111", "222", "333"]],
            ["bugs: 111, 222, 333", ["111", "222", "333"]],
            ["bug-111, bug-222, bug-333", ["111", "222", "333"]],
        ])(
            'given PR title prefix %p, returns %p',
            (prTitlePrefix, expected) => {
              expect(getBugIdsFromPRTitle(prTitlePrefix + prTitleSuffix)).toStrictEqual(expected);
            },
        );
    });

    describe("addMergeLinks", () => {
        const pageKind = "pr"
        const repoInfo = {
            repoName: "socorro",
            repoOrg: "mozilla-services"
        };
        const prNum = "99"
        const prTitle = "bug-1: wow impressive title";
        const prUrl = "https://github.com/mozilla-services/socorro/pull/99"
        const prState = PR_STATE_MERGED;
        const bugIds = [1]

        const author = "Scrooge McDuck"
        const fullCommitSha = "649428ff86e73ef7f6eefb730b8c55e717212d02"
        const commitSha = fullCommitSha.substring(0, 6);
        const commitUrl = `/mozilla-services/socorro/commit/${fullCommitSha}`

        const expectedMessage = {
            "eventName": "mergeComment",
            "bugUrl": BUG_BASE_URL + bugIds[0],
            "author": author,
            "repoOrg": repoInfo.repoOrg,
            "repoName": repoInfo.repoName,
            "prNum": prNum,
            "prUrl": prUrl,
            "prTitle": prTitle,
            "authorUrl": "https://github.com/" + author,
            "commitSha": commitSha,
            "commitUrl": "https://github.com" + commitUrl
        };

        it("sends a message to the background script when the merge link is clicked when a PR is merged manually by a user", () => {
            const sendMessage = jest.spyOn(browser.runtime, "sendMessage").mockResolvedValue({});

            // Mock the HTML structure
            document.body.innerHTML = `
                ${PR_HEADER_HTML(prTitle, prNum, "pullMerged", "Conversation")}
                <div class="TimelineItem">
                    <div class="TimelineItem-body">
                        <a class="author" href="/${author}">${author}</a> merged commit <a href="/mozilla-services/socorro/commit/${fullCommitSha}">${commitSha}</a>into main
                    </div>
                </div>
            `;
            addMergeLinks(pageKind, repoInfo, prNum, prTitle, prUrl, prState, bugIds);
            const linkContainer = document.getElementById(MERGE_CONTAINER_ID);
            const mergeLinkEle = linkContainer.querySelector("a.merge_link");
            mergeLinkEle.click();
            expect(sendMessage).toHaveBeenCalledWith(expectedMessage);
        })

        it("sends a message to the background script when the merge link is clicked when a PR is merged via a merge queue", () => {
            const sendMessage = jest.spyOn(browser.runtime, "sendMessage").mockResolvedValue({});

            // Mock the HTML structure
            document.body.innerHTML = `
                ${PR_HEADER_HTML(prTitle, prNum, "pullMerged", "Conversation")}
                <div class="TimelineItem">
                    <div class="TimelineItem-body">
                        <a class="author" href="/${author}">${author}</a>
                        added this pull request to the <a href="/mozilla-services/socorro/queue/main" class="Link">merge queue</a>
                    </div>
                    <div class="TimelineItem-body">
                        Merged via the queue into main with commit <a href=${commitUrl}>${commitSha}</a>
                    </div>
                </div>
            `;
            addMergeLinks(pageKind, repoInfo, prNum, prTitle, prUrl, prState, bugIds);
            const linkContainer = document.getElementById(MERGE_CONTAINER_ID);
            const mergeLinkEle = linkContainer.querySelector("a.merge_link");
            mergeLinkEle.click();
            expect(sendMessage).toHaveBeenCalledWith(expectedMessage);
        });
    })
  });
