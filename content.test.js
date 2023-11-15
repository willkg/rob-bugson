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
  });
