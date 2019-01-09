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
 * Creates a new tab related to the currently active tab, open the Bugzilla
 * attach url, and populate the fields.
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

    // We need to add values for this specific attachment, so we build the
    // template with local values and then execute the code in the tab.
    var attachScript = `
        // Add PR link
        let att = document.getElementById("att-textarea");
        att.value = "${attValue}";
        // Trigger an input event so the textarea input handling kicks off.
        var input_event = new Event('input', {
            bubbles: true,
            cancelable: true
        });
        att.dispatchEvent(input_event);
        // Stomp on description with the PR title
        let att_desc = document.getElementById("att-description");
        att_desc.value = "${descValue}";
        att.focus();
    `;

    await browser.tabs.executeScript(newTab.id, {
        code: attachScript
    });
    console.info('done!');
}
