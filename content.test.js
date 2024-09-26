const {
    addMergeLinks,
    BUG_BASE_URL,
    getAttachLinks,
    getBugIdsFromPRTitle,
    MERGE_CONTAINER_ID,
    PR_STATE_MERGED,
} = require("./github-bugzilla-content");

describe("Content script", () => {
    afterEach(() => {
        // restore spies created with spyOn
        jest.restoreAllMocks();
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
                <div class="gh-header-show">
                    <div id="${MERGE_CONTAINER_ID}">
                    </div>
                </div>
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
                <div class="gh-header-show">
                    <div id="${MERGE_CONTAINER_ID}">
                    </div>
                </div>
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
