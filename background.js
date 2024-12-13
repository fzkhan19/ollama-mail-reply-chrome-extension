chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.type === "TEST_OLLAMA") {
		const headersList = {
			Accept: "*/*",
			"Content-Type": "application/json",
		};

		const bodyContent = JSON.stringify({
			model: "llama3.2",
			messages: [
				{
					role: "user",
					content: "why is the sky blue",
				},
			],
			stream: false,
		});

		fetch("http://localhost:11434/api/chat", {
			method: "POST",
			body: bodyContent,
			headers: headersList,
		})
			.then((response) => response.json())
			.then((data) => {
				// Ensure we're sending a properly structured response
				sendResponse({
					success: true,
					data: {
						message: {
							content: data.message.content,
						},
					},
				});
			})
			.catch((error) => {
				console.error(`Network error: ${error.message}`);
				sendResponse({
					success: false,
					error: `Network or parsing error: ${error.message}`,
				});
			});

		return true;
	}
	if (request.type === "GENERATE_REPLY") {
		fetch("http://localhost:11434/api/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: "llama3.2",
				messages: [
					{
						role: "system",
						content:
							"You are a professional email assistant. Generate concise, clear, and appropriate email replies.",
					},
					{
						role: "user",
						content: `Write a reply to this email:\n${request.emailContent}`,
					},
				],
				stream: false,
			}),
		})
			.then((response) => response.json())
			.then((data) => {
				sendResponse({
					success: true,
					data: {
						message: {
							content: data.message.content,
						},
					},
				});
			})
			.catch((error) => {
				console.error(`Network error: ${error.message}`);
				sendResponse({
					success: false,
					error: `Network or parsing error: ${error.message}`,
				});
			});

		return true;
	}
});
