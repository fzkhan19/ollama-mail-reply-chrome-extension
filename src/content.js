async function generateReply(emailContent) {
	return new Promise((resolve, reject) => {
		if (!emailContent) {
			reject(new Error("No email content found"));
			return;
		}

		chrome.runtime.sendMessage(
			{
				type: "GENERATE_REPLY",
				emailContent,
			},
			(response) => {
				if (chrome.runtime.lastError) {
					reject(
						new Error(`Extension error: ${chrome.runtime.lastError.message}`),
					);
					return;
				}

				if (response.success && response.data?.message?.content) {
					resolve(response.data.message.content);
				} else {
					reject(new Error(response.error || "Invalid response format"));
				}
			},
		);
	});
}

async function testOllamaAPI() {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(
			{
				type: "TEST_OLLAMA",
			},
			(response) => {
				if (chrome.runtime.lastError) {
					console.error("Runtime error:", chrome.runtime.lastError);
					reject(new Error(chrome.runtime.lastError.message));
					return;
				}

				if (!response) {
					console.error("Empty response received");
					reject(new Error("Empty response from background script"));
					return;
				}

				if (response.success && response.data?.message?.content) {
					resolve(response.data);
				} else {
					reject(new Error(response.error || "Invalid response structure"));
				}
			},
		);
	});
}
function getEmailContent() {
	const emailBody = document.querySelector(".a3s.aiL");
	return emailBody ? emailBody.textContent.trim() : "";
}

function createFloatingButton() {
	const button = document.createElement("button");
	button.innerHTML = "🤖 Reply";
	button.style.cssText = `
		position: relative;
		z-index: 9999;
		padding: 4px 8px;
		margin: 0 12px;
		background-color: #1a73e8;
		color: white;
		border: none;
		border-radius: 24px;
		cursor: pointer;
		font-size: 12px;
		box-shadow: 0 2px 5px rgba(0,0,0,0.2);
		transition: all 0.3s ease;
	`;

	button.addEventListener("mouseover", () => {
		button.style.transform = "scale(1.05)";
		button.style.backgroundColor = "#1557b0";
	});

	button.addEventListener("mouseout", () => {
		button.style.transform = "scale(1)";
		button.style.backgroundColor = "#1a73e8";
	});

	button.addEventListener("click", () => {
		button.disabled = true;
		button.innerHTML = "⌛ Reading email...";

		const emailContent = getEmailContent();
		if (!emailContent) {
			button.style.backgroundColor = "#EA4335";
			button.innerHTML = "❌ No email";
			setTimeout(() => {
				button.disabled = false;
				button.style.backgroundColor = "#1a73e8";
				button.innerHTML = "🤖 Reply";
			}, 2000);
			return;
		}

		button.innerHTML = "⌛ Generating reply...";
		generateReply(emailContent)
			.then((reply) => {
				const editableElement = document.querySelector(
					".Am.aiL.aO9.Al.editable.LW-avf.tS-tW",
				);
				if (editableElement) {
					editableElement.innerHTML = reply.split("\n").join("<br>"); // Inject the generated response
				}
				button.style.backgroundColor = "#34A853";
				button.innerHTML = "✓ Generated";
			})
			.catch((error) => {
				console.error("Generation Error:", error);
				button.style.backgroundColor = "#EA4335";
				button.innerHTML = "❌ Failure";
			})
			.finally(() => {
				setTimeout(() => {
					button.disabled = false;
					button.style.backgroundColor = "#1a73e8";
					button.innerHTML = "🤖 Reply";
				}, 2000);
			});
	});

	return button;
}

function checkAndAddButton() {
	setTimeout(() => {
		const existingButton = document.getElementById("ai-mailer-button");
		const targetTd = document.querySelector("tr.btC");
		if (window.location.hash.includes("#inbox/") && existingButton) {
			existingButton.remove();
		}
		if (window.location.hash.includes("#inbox/")) {
			const button = createFloatingButton();
			button.id = "ai-mailer-button";
			targetTd.appendChild(button);
		}
	}, 500);
}

// Monitor URL changes
let lastUrl = location.href;
const initReplyButtonListener = () => {
	const replyButton = document.querySelector("span.ams.bkH");
	if (replyButton) {
		replyButton.addEventListener("click", () => {
			checkAndAddButton();
		});
	}
};

initReplyButtonListener(); // Run on page reloads

new MutationObserver(() => {
	const url = location.href;
	if (url !== lastUrl) {
		lastUrl = url;
		setTimeout(initReplyButtonListener, 1000);
	}
}).observe(document, { subtree: true, childList: true });

let replyButton;
setInterval(() => {
	replyButton = document.querySelector("span.ams.bkH");
	if (replyButton) {
		replyButton.addEventListener("click", () => {
			checkAndAddButton();
		});
	}
}, 700);
