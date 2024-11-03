chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "performAction") {
        // Perform actions on the webpage
        console.log("Action performed");
    }
    if (request.action === "getSelectedText") {
        sendResponse({ text: window.getSelection().toString() });
    }
});

