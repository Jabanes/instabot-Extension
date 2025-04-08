document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");
  const labelEl = document.getElementById("actionLabel");
  const sendBtn = document.getElementById("sendBtn");
  const loadingEl = document.getElementById("loading");

  console.log("📦 Popup loaded");

  chrome.storage.local.get(["firebase_token", "bot_is_running"], async (result) => {
    const token = result.firebase_token;

    if (result.bot_is_running) {
      // ✅ Immediately show animation based on local storage
      loadingEl.style.display = "block";
      console.log("⏳ Resuming loader from local storage...");
    }

    if (token) {
      try {
        const statusCheck = await fetchBotStatus(token);

        if (statusCheck.is_running) {
          chrome.storage.local.set({ bot_is_running: true });
          loadingEl.style.display = "block";
          console.log("✅ Bot still running (confirmed by Firestore)");
        } else {
          chrome.storage.local.remove("bot_is_running");
          loadingEl.style.display = "none";
          console.log("✅ Bot finished (confirmed by Firestore)");
          renderFinalBotStatus(statusCheck);
        }

      } catch (err) {
        console.error("❌ Failed to fetch bot status from Firestore:", err);
        // Leave the loading as-is if local storage still says it's running
      }
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
            chrome.storage.local.set({ bot_is_running: true });
            loadingEl.style.display = "block";

            const res = await fetch(backendURL, {
              method: "POST",
             
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify(payload)
             
            
            });

            const botResponse = await res.json();
            console.log("📦 Bot response:", botResponse);

            const finalStatus = await fetchBotStatus(token);

            if (!finalStatus.is_running) {
              chrome.storage.local.remove("bot_is_running");
              loadingEl.style.display = "none";
              renderFinalBotStatus(finalStatus);
            } else {
              console.log("⏳ Bot is still running... waiting on Firestore");
              // Loader stays. User can reopen popup later.
            }

          } catch (err) {
            console.error("❌ Fetch error:", err);
            statusEl.innerText = "❌ Error: " + err.message;
            loadingEl.style.display = "none";
            chrome.storage.local.remove("bot_is_running");
          }
        });
      });
    });
  });

  // 🔍 Check bot status (updated backend structure)
  async function fetchBotStatus(token) {
    const backendBase = window.ENV?.BACKEND_BASE_URL || "http://127.0.0.1:8000";
    // const url = `https://backendinstabot.onrender.com/check-bot-status`;
    const url = `https://igbot-prod.onrender.com/check-bot-status`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    return data;
  }

  // ✅ Display final results from Firestore
  function renderFinalBotStatus(data) {
    loadingEl.style.display = "none";
    chrome.storage.local.remove("bot_is_running");

    if (!data || !data.status) {
      statusEl.innerText = "❌ No status returned from Firestore.";
      return;
    }

    const { status, count_before, count_after, message, timestamp, type, non_followers_before, non_followers_after, following_before, following_after } = data;
    let output = "";

    if (status === "success") {
      statusEl.style.color = "#28a745"; // green
      output += `Latest Scan: \n ${type} scan Status: ✅ Success!\n`;
    } else if (status === "no_change") {
      statusEl.style.color = "#ffc107"; // yellow
      output += "⚠️ No change in data.\n";
    } else {
      statusEl.style.color = "#dc3545"; // red
      output += "❌ Bot failed.\n";
    }

    // Conditionally include additional fields if they exist
    if (typeof non_followers_before !== "undefined" && typeof non_followers_after !== "undefined") {
      output += `\nNon-Followers Before: ${non_followers_before}\nNon-Followers After: ${non_followers_after}`;
    }

    if (typeof following_before !== "undefined" && typeof following_after !== "undefined") {
      output += `\nFollowing Before: ${following_before}\nFollowing After: ${following_after}`;
    }

    else{

      output += `Before Scan: ${count_before ?? "?"}\nAfter Scan: ${count_after ?? "?"}`;

    }

    if (message) output += `\n\nDetails: ${message}`;
    if (timestamp) output += `\n🕒 Date: ${timestamp}`;

    statusEl.innerText = output;
  }
});
