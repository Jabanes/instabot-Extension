chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
    console.log("📥 [Service Worker] Message received:", msg);
  
    if (msg.action === "saveFirebaseToken" && msg.token) {
      chrome.storage.local.set({ firebase_token: msg.token }, () => {
        console.log("✅ [Service Worker] Token saved:", msg.token);
        sendResponse({ status: "success", received: true });
      });
      return true; // Keeps sendResponse alive
    } else {
      console.warn("❌ [Service Worker] Invalid message or missing token.");
    }
  });