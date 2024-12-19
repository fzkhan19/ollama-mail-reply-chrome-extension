// Encryption helper functions
async function encryptApiKey(apiKey) {
	const encoder = new TextEncoder();
	const data = encoder.encode(apiKey);
	const key = await crypto.subtle.generateKey(
		{
			name: "AES-GCM",
			length: 256,
		},
		true,
		["encrypt", "decrypt"],
	);

	const exportedKey = await crypto.subtle.exportKey("raw", key);
	await chrome.storage.local.set({
		encryptionKey: Array.from(new Uint8Array(exportedKey)).join(","),
	});

	const iv = crypto.getRandomValues(new Uint8Array(12));
	await chrome.storage.local.set({
		iv: Array.from(iv).join(","),
	});

	const encryptedData = await crypto.subtle.encrypt(
		{
			name: "AES-GCM",
			iv: iv,
		},
		key,
		data,
	);

	return Array.from(new Uint8Array(encryptedData)).join(",");
}

async function decryptApiKey(encryptedData) {
	const storage = await chrome.storage.local.get(["encryptionKey", "iv"]);
	const keyData = new Uint8Array(storage.encryptionKey.split(",").map(Number));
	const iv = new Uint8Array(storage.iv.split(",").map(Number));

	const key = await crypto.subtle.importKey(
		"raw",
		keyData,
		{
			name: "AES-GCM",
			length: 256,
		},
		true,
		["encrypt", "decrypt"],
	);

	const decryptedData = await crypto.subtle.decrypt(
		{
			name: "AES-GCM",
			iv: iv,
		},
		key,
		new Uint8Array(encryptedData.split(",").map(Number)),
	);

	return new TextDecoder().decode(decryptedData);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.type === "CHECK_API_KEY") {
		chrome.storage.local.get("geminiApiKey", (result) => {
			sendResponse({ hasKey: !!result.geminiApiKey });
		});
		return true;
	}

	if (request.type === "SAVE_API_KEY") {
		encryptApiKey(request.apiKey).then((encryptedKey) => {
			chrome.storage.local.set({ geminiApiKey: encryptedKey }, () => {
				sendResponse({ success: true });
			});
		});
		return true;
	}

	if (request.type === "TEST_OLLAMA") {
		chrome.storage.local.get("geminiApiKey", async (result) => {
			if (!result.geminiApiKey) {
				sendResponse({
					success: false,
					error: "Gemini API key not found. Please set your API key first.",
				});
				return;
			}

			try {
				const apiKey = await decryptApiKey(result.geminiApiKey);
				const headersList = {
					"Content-Type": "application/json",
				};

				const bodyContent = JSON.stringify({
					contents: [
						{
							parts: [
								{
									text: "why is the sky blue",
								},
							],
						},
					],
				});

				const response = await fetch(
					`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
					{
						method: "POST",
						body: bodyContent,
						headers: headersList,
					},
				);
				const data = await response.json();
				sendResponse({
					success: true,
					data: {
						message: {
							content: data.candidates[0].contents.parts[0].text,
						},
					},
				});
			} catch (error) {
				console.error(`Network error: ${error.message}`);
				sendResponse({
					success: false,
					error: `Network or parsing error: ${error.message}`,
				});
			}
		});
		return true;
	}

	if (request.type === "GENERATE_REPLY") {
		chrome.storage.local.get("geminiApiKey", async (result) => {
			if (!result.geminiApiKey) {
				sendResponse({
					success: false,
					error: "Gemini API key not found. Please set your API key first.",
				});
				return;
			}

			try {
				const apiKey = await decryptApiKey(result.geminiApiKey);
				const response = await fetch(
					`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							contents: [
								{
									parts: [
										{
											text: `Please provide a professional and detailed email reply, focusing solely on the response content without a subject line. Include "regards." Here is the email to respond to:\n${request.emailContent}`,
										},
									],
								},
							],
						}),
					},
				);
				const data = await response.json();
				sendResponse({
					success: true,
					data: {
						message: {
							content: data.candidates[0].content.parts[0].text,
						},
					},
				});
			} catch (error) {
				console.error(`Network error: ${error.message}`);
				sendResponse({
					success: false,
					error: `Network or parsing error: ${error.message}`,
				});
			}
		});
		return true;
	}

	if (request.type === "DECRYPT_API_KEY") {
		decryptApiKey(request.encryptedKey).then((decryptedKey) => {
			sendResponse({ success: true, decryptedKey });
		});
		return true;
	}
});
