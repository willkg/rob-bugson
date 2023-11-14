const { getAttachLinks } = require("./github-bugzilla-content");

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
        })
    })
  });
