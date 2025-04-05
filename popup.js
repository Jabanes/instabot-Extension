document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");
  const labelEl = document.getElementById("actionLabel");
  const sendBtn = document.getElementById("sendBtn");
  const loadingEl = document.getElementById("loading");

  console.log("📦 Popup loaded");


  // ✅ Persisted: Check if bot is running (even if popup reopened)
  chrome.storage.local.get("botStatus", (result) => {
    console.log("📥 Loaded botStatus from storage:", result.botStatus);
    if (result.botStatus === "running") {
      loadingEl.style.display = "block";
    } else {
      loadingEl.style.display = "none";
    }
  });

  // ✅ Load selected action label
  chrome.storage.local.get("selectedActionLabel", (result) => {
    if (result.selectedActionLabel) {
      labelEl.textContent = result.selectedActionLabel;
      labelEl.style.color = "#333";
    } else {
      labelEl.textContent = "❌ No button was selected.";
      labelEl.style.color = "#d93025";
    }
  });


  // ✅ Handle "Send to Bot" click
  sendBtn.addEventListener("click", async () => {
    console.log("🖱️ Send button clicked");

    chrome.storage.local.get(["firebase_token", "target_endpoint"], async (result) => {
      const token = result.firebase_token;
      const backendURL = result.target_endpoint;

      if (!token || !backendURL) {
        console.warn("❌ Missing token or endpoint");
        statusEl.innerText = "❌ Missing token or endpoint.";
        loadingEl.style.display = "none";
        chrome.storage.local.set({ botStatus: "finished" });
        return;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tab = tabs[0];
        const profileURL = tab.url;

        chrome.cookies.getAll({ domain: ".instagram.com" }, async (cookies) => {
          const payload = {
            cookies: cookies.map(c => ({
              name: c.name,
              value: c.value,
              domain: c.domain,
              path: c.path,
              secure: c.secure,
              httpOnly: c.httpOnly,
              sameSite: c.sameSite || "Strict"
            })),
            profile_url: profileURL
          };

          try {
            console.log("🚀 Bot is starting... sending to backend");

            chrome.storage.local.set({ botStatus: "running" }, () => {
              console.log("🟢 Storage set to 'running'");
            });
            chrome.runtime.sendMessage({ action: "botStatus", status: "running" });
            loadingEl.style.display = "block";

            // ✅ Fetch with timeout to prevent hang
            const res = await fetch(backendURL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify(payload)
            });

            const result = await res.json();
            console.log("📦 Bot response:", result);

            if (result.status === "success") {
              statusEl.style.color = "#28a745"; // green
              statusEl.innerText = "✅ Success:\n" + JSON.stringify(result, null, 2);
            } else if (result.status === "no_change") {
              statusEl.style.color = "#ffc107"; // yellow
              statusEl.innerText = "⚠️ No Change:\n" + JSON.stringify(result, null, 2);
            
            } else if (result.status === "error" && result.message?.includes("Broken pipe")) {
              statusEl.style.color = "#dc3545";
              statusEl.innerText = "❌ Bot crashed due to Broken Pipe.";

              loadingEl.style.display = "none"; //force stop the bot in case of broken pipe
              chrome.storage.local.set({ botStatus: "finished" });
              chrome.runtime.sendMessage({ action: "botStatus", status: "finished" });
              
            } else {
              statusEl.style.color = "#dc3545"; // red
              statusEl.innerText = "❌ Error:\n" + JSON.stringify(result, null, 2);
            }
          } catch (err) {
            console.error("❌ Fetch error or timeout:", err);
            statusEl.innerText = "❌ Error: " + err.message;
          } finally {
            console.log("🔚 Bot finished — updating state");

            chrome.storage.local.set({ botStatus: "finished" }, () => {
              console.log("🔴 Storage set to 'finished'");
              chrome.storage.local.get("botStatus", (result) => {
                console.log("📥 Storage read-back check:", result.botStatus);
              });
            });

            chrome.runtime.sendMessage({ action: "botStatus", status: "finished" });
            loadingEl.style.display = "none";
          }
        });
      });
    });
  });
});
