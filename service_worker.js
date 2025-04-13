chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {

    if (msg === "getExtensionId") {
      sendResponse({ id: chrome.runtime.id });
    }

    if (msg.action === "saveFirebaseToken" && msg.token) {
      chrome.storage.local.set({ firebase_token: msg.token }, () => {
        console.log("✅ Token saved");
        sendResponse({ status: "token_saved" });
      });
      return true;
    }
  
    if (msg.action === "setTargetEndpoint" && msg.endpoint) {
      chrome.storage.local.set({ target_endpoint: msg.endpoint }, () => {
        console.log("✅ Target endpoint set:", msg.endpoint);
        sendResponse({ status: "endpoint_saved" });
      });
      return true;
    }
  
    if (msg.action === "setSelectedAction" && msg.label) {
      chrome.storage.local.set({ selectedActionLabel: msg.label }, () => {
        console.log("✅ Selected action label set:", msg.label);
        sendResponse({ status: "label_saved" });
      });
      return true;
    }
  });
  