document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("sendBtn").addEventListener("click", async () => {
      const env = document.getElementById("env").value;
  
      const backendURL = env === "local"
        ? "http://127.0.0.1:8000/get-following"
        : "https://backendinstabot-production.up.railway.app/get-following";
  
      // ✅ Step 1: Get Firebase token from extension storage
      chrome.storage.local.get("firebase_token", async (result) => {
        const token = result.firebase_token;
        if (!token) {
          document.getElementById("status").innerText = "❌ No Firebase token found.";
          return;
        }
  
        // ✅ Step 2: Get current Instagram tab + cookies
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
              document.getElementById("status").innerText = "✅ Success: " + JSON.stringify(result);
            } catch (err) {
              document.getElementById("status").innerText = "❌ Error: " + err.message;
            }
          });
        });
      });
    });
  });
  