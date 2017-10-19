"use strict";

/**
 * JS that runs in the background and has access to browser tabs.
 */

browser.runtime.onMessage.addListener(createAttachTab);

/**
 * Retrieve the currently active tab.
 */
function getActiveTab(callback) {
    var allTabsPromise = browser.tabs.query({
        currentWindow: true
    });
    // FIXME(willkg): browser.tabs.query returns an array of *strings* for the
    // tab ids. This makes no sense--seems like it should return an array of
    // Tabs.
    allTabsPromise.then((tabs) => {
        for (let tabId in tabs) {
            var isDone = false;
            // Convert the string tabId to an int and get that tab
            var getTabPromise = browser.tabs.get(parseInt(tabId));
            getTabPromise.then((tab) => {
                // If that tab is active, then call our callback.
                if (tab.active) {
                    callback(tab);
                    isDone = true;
                }
            });

            if (isDone) {
                break;
            }
        }
    });
}


/**
 * Creates a new tab related to the currently active tab, open the
 * Bugzilla attach url, and populate the fields.
 */
function createAttachTab(msg) {
    getActiveTab((tab) => {
        var tabId = tab.id;

        // Create a tab with the Bugzilla attach url
        var creatingPromise = browser.tabs.create({
            url: msg.attachUrl,
            active: true,
            openerTabId: tabId,
            index: tabId
        });

        creatingPromise.then(
            (tab) => {
                var attValue = msg.prURL;
                var descValue = "pr " + msg.prNum + ": " + msg.prTitle;

                // We need to add values for this specific attachment, so we
                // build the template with local values and then execute the
                // code in the tab.
                var attachScript = `
// switch from upload-file to paste-text attachment
if (document.querySelector(".attachment_text_field.bz_tui_hidden")) {
    document.TUI_toggle_class("attachment_text_field");
    document.TUI_toggle_class("attachment_data");
}

let att = document.getElementById("attach_text");
let desc = document.getElementById("description");
att.value = "${attValue}";
desc.value = "${descValue}";
att.focus();
`;

                var executePromise = browser.tabs.executeScript(tab.id, {
                    code: attachScript
                });
                executePromise.then(
                    (result) => {
                        console.debug('Attach successful.');
                    },
                    (error) => {
                        console.error(error);
                    }
                );
            },
            (error) => {
                console.error(error);
            }
        );
    });
}
