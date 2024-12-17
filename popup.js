document.addEventListener("DOMContentLoaded", () => {
	const apiKeyForm = document.getElementById("api-key-form");
	const apiKeyStored = document.getElementById("api-key-stored");

	function showApiKeyForm() {
		apiKeyForm.classList.remove("hidden");
		apiKeyStored.classList.add("hidden");
	}

	function showStoredApiKey() {
		apiKeyForm.classList.add("hidden");
		apiKeyStored.classList.remove("hidden");
	}

	// Check initial state
	chrome.storage.local.get(["geminiApiKey"], (result) => {
		if (result.geminiApiKey) {
			showStoredApiKey();
		} else {
			showApiKeyForm();
		}
	});

	// Save new API key
	document.getElementById("save-api-key").addEventListener("click", () => {
		const apiKey = document.getElementById("gemini-api-key").value;
		if (apiKey) {
			chrome.runtime.sendMessage(
				{
					type: "SAVE_API_KEY",
					apiKey: apiKey,
				},
				() => {
					showStoredApiKey();
				},
			);
		}
	});

	// Update API key
	document.getElementById("update-api-key").addEventListener("click", () => {
		showApiKeyForm();
	});

	// Remove API key
	document.getElementById("remove-api-key").addEventListener("click", () => {
		chrome.storage.local.remove(["geminiApiKey", "encryptionKey", "iv"], () => {
			showApiKeyForm();
		});
	});
});

// Add this after your existing event listeners
document.getElementById("copy-api-key").addEventListener("click", () => {
    chrome.storage.local.get(["geminiApiKey"], async (result) => {
        if (result.geminiApiKey) {
            // Send message to background script to decrypt the key
            chrome.runtime.sendMessage(
                { type: "DECRYPT_API_KEY", encryptedKey: result.geminiApiKey },
                (response) => {
                    if (response.success) {
                        navigator.clipboard.writeText(response.decryptedKey).then(() => {
                            const copyButton = document.getElementById("copy-api-key");
                            const icon = copyButton.querySelector(".material-icons");
                            icon.textContent = "check";
                            setTimeout(() => {
                                icon.textContent = "content_copy";
                            }, 2000);
                        });
                    }
                }
            );
        }
    });
});
