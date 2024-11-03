


// popup.js


// content.js
// This will be useful for future features like automatically capturing prompts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "getSelectedText") {
        sendResponse({text: window.getSelection().toString()});
    }
});