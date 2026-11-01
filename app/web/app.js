const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const messages = document.querySelector("#messages");
const sendButton = form.querySelector("button[type='submit']");
const suggestions = document.querySelector("#suggestions");

function addMessage(text, who) {
  const row = document.createElement("div");
  row.className = `message-row ${who === "agent" ? "agent-row" : "user-row"}`;
  if (who === "agent") {
    const avatar = document.createElement("div");
    avatar.className = "mini-avatar";
    avatar.textContent = "♫";
    row.append(avatar);
  }
  const wrap = document.createElement("div");
  wrap.className = "bubble-wrap";
  const bubble = document.createElement("div");
  bubble.className = `bubble ${who === "agent" ? "agent-bubble" : "user-bubble"}`;
  bubble.textContent = text;
  const time = document.createElement("time");
  time.textContent = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
  wrap.append(bubble, time);
  row.append(wrap);
  messages.append(row);
  messages.scrollTop = messages.scrollHeight;
  return row;
}

async function sendMessage(text) {
  const message = text.trim();
  if (!message || sendButton.disabled) return;
  addMessage(message, "user");
  input.value = "";
  input.style.height = "auto";
  suggestions.hidden = true;
  sendButton.disabled = true;
  const pending = addMessage("Preparando uma resposta…", "agent");
  pending.querySelector(".bubble").classList.add("typing");
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Não foi possível enviar sua mensagem.");
    pending.querySelector(".bubble").textContent = payload.reply;
    pending.querySelector(".bubble").classList.remove("typing");
  } catch (error) {
    pending.querySelector(".bubble").textContent = error.message || "Não consegui falar com o atendimento. Tente novamente.";
    pending.querySelector(".bubble").classList.remove("typing");
  } finally {
    sendButton.disabled = false;
    input.focus();
    messages.scrollTop = messages.scrollHeight;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(input.value);
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 100)}px`;
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

suggestions.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-prompt]");
  if (button) sendMessage(button.dataset.prompt);
});
