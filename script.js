const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion");
const toggleThemeButton = document.querySelector("#theme-toggle-button");
const deleteChatButton = document.querySelector("#delete-chat-button");

const API_URL = "http://127.0.0.1:8000/chat";

let userMessage = null;
let isResponseGenerating = false;

const emotionEmojis = {
  "happy": "😊",
  "sad": "😔",
  "neutral": "😐",
  "angry": "😠",
  "fear": "😨",
  "surprise": "😲",
  "disgust": "🤢"
};

const loadDataFromLocalstorage = () => {
  const savedChats = localStorage.getItem("saved-chats");
  const isLightMode = (localStorage.getItem("themeColor") === "light_mode");
  document.body.classList.toggle("light_mode", isLightMode);
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
  chatContainer.innerHTML = savedChats || '';
  document.body.classList.toggle("hide-header", savedChats);
  chatContainer.scrollTo(0, chatContainer.scrollHeight);
};

const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// --- FIX: High Contrast White Badge ---
const showTypingEffect = (text, textElement, incomingMessageDiv, emotion) => {
  const words = text.split(" ");
  let index = 0;
  const typingInterval = setInterval(() => {
    textElement.innerText += (index === 0 ? "" : " ") + words[index++];
    incomingMessageDiv.querySelector(".icon").classList.add("hide");
    
    if (index === words.length) {
      clearInterval(typingInterval);
      isResponseGenerating = false;
      incomingMessageDiv.querySelector(".icon").classList.remove("hide");
      
      // --- THE BADGE UI ---
      if (emotion) {
        const emoji = emotionEmojis[emotion] || "🤖";
        const badge = document.createElement("div");
        
        // This style forces White Text and a nice separator line
        badge.style.cssText = `
            display: block;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.2); /* Thin line separator */
            color: #ffffff !important; /* BRIGHT WHITE TEXT */
            font-size: 0.85rem;
            opacity: 0.9;
            font-family: sans-serif;
        `;
        
        badge.innerHTML = `🧠 <strong>AI Perception:</strong> Detected ${emotion} ${emoji}`;
        textElement.appendChild(badge);
      }

      localStorage.setItem("saved-chats", chatContainer.innerHTML);
    }
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
  }, 50);
};

const generateAPIResponse = async (incomingMessageDiv) => {
  const textElement = incomingMessageDiv.querySelector(".text");
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage })
    });

    const data = await response.json();
    if (!data.reply) throw new Error("Invalid response");
    
    showTypingEffect(data.reply, textElement, incomingMessageDiv, data.emotion);

  } catch (error) {
    isResponseGenerating = false;
    textElement.innerText = "Error: " + error.message;
    incomingMessageDiv.classList.add("error");
  } finally {
    incomingMessageDiv.classList.remove("loading");
  }
};

const showLoadingAnimation = () => {
  const html = `<div class="message-content">
      <img class="avatar" src="https://i.postimg.cc/hP2WrQTQ/Gemini-August-Release-SS-width-1300.jpg" alt="Bot">
      <p class="text"></p>
      <div class="loading-indicator">
        <div class="loading-bar"></div>
        <div class="loading-bar"></div>
        <div class="loading-bar"></div>
      </div>
    </div>
    <span onClick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>`;
  const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
  chatContainer.appendChild(incomingMessageDiv);
  chatContainer.scrollTo(0, chatContainer.scrollHeight);
  generateAPIResponse(incomingMessageDiv);
};

const handleOutgoingChat = () => {
  userMessage = typingForm.querySelector(".typing-input").value.trim() || userMessage;
  if (!userMessage || isResponseGenerating) return;
  isResponseGenerating = true;
  const html = `<div class="message-content">
      <img class="avatar" src="https://i.postimg.cc/L8hd043C/images.png" alt="User">
      <p class="text">${userMessage}</p>
    </div>`;
  const outgoingMessageDiv = createMessageElement(html, "outgoing");
  chatContainer.appendChild(outgoingMessageDiv);
  typingForm.reset();
  document.body.classList.add("hide-header");
  chatContainer.scrollTo(0, chatContainer.scrollHeight);
  setTimeout(showLoadingAnimation, 400);
};

toggleThemeButton.addEventListener("click", () => {
  const isLightMode = document.body.classList.toggle("light_mode");
  localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode");
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
});

deleteChatButton.addEventListener("click", () => {
  if (confirm("Delete all chats?")) {
    localStorage.removeItem("saved-chats");
    loadDataFromLocalstorage();
  }
});

suggestions.forEach(suggestion => {
  suggestion.addEventListener("click", () => {
    userMessage = suggestion.querySelector(".text").innerText;
    handleOutgoingChat();
  });
});

typingForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleOutgoingChat();
});

loadDataFromLocalstorage();