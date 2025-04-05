document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");
  const labelEl = document.getElementById("actionLabel");
  const sendBtn = document.getElementById("sendBtn");
  const loadingEl = document.getElementById("loading");

  console.log("📦 Popup loaded");

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
            loadingEl.style.display = "block";

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
            } else {
              statusEl.style.color = "#dc3545";
              statusEl.innerText = "❌ Error:\n" + JSON.stringify(result, null, 2);
            }

          } catch (err) {
            console.error("❌ Fetch error:", err);
            statusEl.innerText = "❌ Error: " + err.message;

          } finally {
            // ✅ Re-check bot status from Firebase after any response
            checkBotStatusFromFirebase(token)
              .then((isRunning) => {
                if (!isRunning) {
                  loadingEl.style.display = "none";
                  console.log("🟢 Bot has stopped (confirmed by Firestore)");
                } else {
                  console.warn("⚠️ Bot still marked as running in Firestore");
                }
              })
              .catch((err) => {
                console.error("❌ Failed to fetch bot status from Firestore:", err);
                loadingEl.style.display = "none"; // Fail-safe
              });
          }
        });
      });
    });
  });

  // 🔍 Check isRunning flag from Firestore via backend
  async function checkBotStatusFromFirebase(token) {
    const checkURL = `${window.ENV.BACKEND_BASE_URL}/check-bot-status` || `http://127.0.0.1:8000/check-bot-status`;
    const res = await fetch(checkURL, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    return data.is_running === true;
  }
});
