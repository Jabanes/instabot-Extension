document.addEventListener("DOMContentLoaded", () => {
    const statusEl = document.getElementById("status");
    const labelEl = document.getElementById("actionLabel");
    const sendBtn = document.getElementById("sendBtn");
  
    // ✅ Load selected action label
    chrome.storage.local.get("selectedActionLabel", (result) => {
        const labelEl = document.getElementById("actionLabel");
      
        if (result.selectedActionLabel) {
          labelEl.textContent = result.selectedActionLabel;
          labelEl.style.color = "#333"; // normal text color
        } else {
          labelEl.textContent = "❌ No button was selected.";
          labelEl.style.color = "#d93025"; // red
        }
      });
  
    // ✅ Handle "Send to Bot" click
    sendBtn.addEventListener("click", async () => {
      chrome.storage.local.get(["firebase_token", "target_endpoint"], async (result) => {
        const token = result.firebase_token;
        const backendURL = result.target_endpoint;
  
        if (!token || !backendURL) {
          statusEl.innerText = "❌ Missing token or endpoint.";
          return;
        }
  
        // ✅ Get Instagram profile URL + cookies
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
              const res = await fetch(backendURL, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
              });
  
              const result = await res.json();
              statusEl.innerText = "✅ Success: " + JSON.stringify(result);
            } catch (err) {
              statusEl.innerText = "❌ Error: " + err.message;
            }
          });
        });
      });
    });
  });
  