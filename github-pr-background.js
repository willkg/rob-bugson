"use strict";

/**
 * JS that runs in the background and has access to browser tabs.
 */

browser.runtime.onMessage.addListener(createAttachTab);

/**
 * Sanitize text for inserting into JavaScript template.
 */
function sanitizeForTemplate(text) {
    // Escape all \
    text = text.replace(/\\/g, "\\\\");

    // Escape all "
    text = text.replace(/"/g, "\\\"");

    return text;
}


/**
 * Retrieve the currently active tab.
 */
async function getActiveTab() {
    const allTabs = await browser.tabs.query({ currentWindow: true });
    for (let i in allTabs) {
        let tabInfo = allTabs[i];
        if (tabInfo.active) {
            return tabInfo;
        }
    }
    return null;
}


/**
 * Creates a new tab related to the currently active tab, open the
 * Bugzilla attach url, and populate the fields.
 */
async function createAttachTab(msg) {
    const tab = await getActiveTab();
    var tabId = tab.id;

    // Create a tab with the Bugzilla attach url
    const newTab = await browser.tabs.create({
        url: msg.attachUrl,
        active: true,
        openerTabId: tabId,
        index: tabId
    });
    var attValue = sanitizeForTemplate(msg.prURL);
    var descValue = sanitizeForTemplate("pr " + msg.prNum + ": " + msg.prTitle);

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

    await browser.tabs.executeScript(newTab.id, {
        code: attachScript
    });
    console.info('done!');
}
