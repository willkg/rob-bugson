const {
    getAttachLinks,
    getBugIdsFromPRTitle,
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
        let prTitlePrefix;
        const prTitleSuffix = "fix all the things";
        it("finds bug ID from a single bug number", () => {            
            const testBugIds = [
                "bug 111",
                "bug: 111",
                "bugs 111",
                "bug-111",
                "bug:-111",
                "bugs-111"
            ];
            const expected = ["111"];
            for (const testBugId of testBugIds) {
                prTitlePrefix = `${testBugId}: `;
                const prTitle = prTitlePrefix + prTitleSuffix;
                const actual = getBugIdsFromPRTitle(prTitle);
                expect(actual).toStrictEqual(expected);
            }
        });
        it("finds bug IDs from multiple bug numbers", () => {            
            const testBugIds = [
                "bugs 111, 222, & 333",
                "bugs 111, 222, and 333",
                "bugs: 111, 222, 333",
                // Adding these test cases is covered in Issue #58
                // "bug 111, bug 222, bug 333",
                // "bug: 111, bug: 222, bug: 333",
                // "bug-111, bug-222, bug-333",
            ];
            const expected = ["111", "222", "333"];
            for (const testBugId of testBugIds) {
                prTitlePrefix = `${testBugId}: `;
                const prTitle = prTitlePrefix + prTitleSuffix;
                const actual = getBugIdsFromPRTitle(prTitle);
                expect(actual).toStrictEqual(expected);
            }
        });
    });
  });
