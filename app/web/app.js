(() => {
  "use strict";

  const store = window.STORE_DATA;
  const form = document.querySelector("#chat-form");
  const input = document.querySelector("#message-input");
  const conversation = document.querySelector("#conversation");
  const sendButton = document.querySelector("#send-button");
  const quickQuestions = document.querySelector("#quick-questions");

  const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const money = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  // Guard before building indexes so a missing data.js shows a useful message
  // instead of stopping the whole script with an uncaught exception.
  if (!store || !Array.isArray(store.products) || !Array.isArray(store.categories) || !Array.isArray(store.promotions) || !Array.isArray(store.orders)) {
    addMessage("Não consegui carregar os dados de demonstração. Confira se data.js está na mesma pasta que index.html e app.js.", "assistant");
    sendButton.disabled = true;
    return;
  }

  const productById = new Map(store.products.map((product) => [product.product_id, product]));

  function addMessage(text, role) {
    const article = document.createElement("article");
    article.className = `message ${role === "assistant" ? "assistant-message" : "user-message"}`;

    if (role === "assistant") {
      const avatar = document.createElement("div");
      avatar.className = "message-avatar";
      avatar.textContent = "♫";
      article.append(avatar);
    }

    const content = document.createElement("div");
    content.className = "message-content";
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;
    const time = document.createElement("time");
    time.textContent = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    content.append(bubble, time);
    article.append(content);
    conversation.append(article);
    conversation.scrollTop = conversation.scrollHeight;
    return article;
  }

  function parseBudget(question) {
    const match = normalize(question).match(/\b(?:ate|menos de|no maximo ate)\s*r?\$?\s*([\d.]+(?:,\d{1,2})?)/);
    if (!match) return null;
    const amount = match[1].includes(",") ? match[1].replace(/\./g, "").replace(",", ".") : match[1].replace(/\./g, "");
    const parsed = Number(amount);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function categoryMatch(question) {
    const normalized = normalize(question);
    const aliases = [
      ["violao", "violoes", "violao folk", "violao classico"],
      ["guitarra", "guitarras"], ["baixo", "baixos"], ["bateria", "baterias", "percussao"],
      ["teclado", "teclados", "piano", "pianos"], ["ukulele", "ukuleles"],
      ["sopro", "saxofone", "flauta", "trompete"], ["cordas", "violino", "violoncelo"]
    ];
    for (const group of aliases) {
      if (!group.some((alias) => normalized.includes(alias))) continue;
      const category = store.categories.find((entry) => {
        const name = normalize(entry.name);
        return group.some((alias) => name.includes(alias) || alias.includes(name));
      });
      if (category) return category.category_id;
    }
    return null;
  }

  function findCatalogMatches(question) {
    const normalized = normalize(question);
    const categoryId = categoryMatch(question);
    const budget = parseBudget(question);
    const ignore = new Set(["quais", "quai", "qual", "que", "opcoes", "disponivel", "disponiveis", "tem", "tenho", "temos", "ha", "algum", "alguns", "alguma", "algumas", "estoque", "atualmente", "custando", "custa", "custam", "ate", "menos", "de", "r", "me", "mostre", "produto", "produtos", "instrumento", "instrumentos", "o", "a", "um", "uma", "por", "favor"]);
    const categoryTerms = new Set(["violao", "violoes", "guitarra", "guitarras", "baixo", "baixos", "teclado", "teclados", "piano", "bateria", "baterias", "ukulele", "ukuleles", "sopro", "cordas", "percussao", "saxofone", "flauta", "trompete", "violino", "violoncelo"]);
    const terms = normalized.match(/[\p{L}\d-]+/gu) || [];
    const meaningful = terms.filter((term) => term.length > 2 && !ignore.has(term) && !categoryTerms.has(term) && !/^\d+$/.test(term));

    return store.products.filter((product) => {
      if (product.status.toLowerCase() !== "active" || Number(product.stock_quantity) <= 0) return false;
      if (budget !== null && Number(product.price_brl) > budget) return false;
      if (categoryId && product.category_id !== categoryId) return false;
      if (meaningful.length) {
        const text = normalize(`${product.name} ${product.description}`);
        if (!meaningful.some((term) => text.includes(term))) return false;
      }
      return true;
    }).sort((a, b) => Number(a.price_brl) - Number(b.price_brl)).slice(0, 8);
  }

  function catalogReply(question) {
    const products = findCatalogMatches(question);
    if (!products.length) return "Não encontrei opções correspondentes no catálogo deste conjunto de dados. Se quiser, me diga outro modelo ou faixa de preço.";
    const listing = products.map((product) => `• ${product.name} — ${money(Number(product.price_brl))}.`).join("\n");
    return `Encontrei estas opções disponíveis no catálogo de demonstração:\n${listing}\n\nOs valores refletem os arquivos de demonstração e podem não corresponder ao estoque atual da loja.`;
  }

  function promotionReply(question) {
    const normalized = normalize(question);
    const activePromotions = store.promotions.filter((promotion) => /^(1|true|yes)$/i.test(String(promotion.is_active)));
    const productSpecific = activePromotions.filter((promotion) => {
      const product = productById.get(promotion.product_id);
      return product && normalize(product.name).split(/\s+/).some((word) => word.length > 3 && normalized.includes(word));
    });
    const mentionsKnownProduct = store.products.some((product) =>
      normalize(product.name).split(/\s+/).some((word) => word.length > 3 && normalized.includes(word))
    );
    if (mentionsKnownProduct && !productSpecific.length) return "Não encontrei uma promoção ativa para esse instrumento no catálogo de demonstração. Posso consultar o preço normal se você me disser o modelo completo.";
    const promotions = (productSpecific.length ? productSpecific : activePromotions).slice(0, 8);
    if (!promotions.length) return "Não encontrei promoções ativas no catálogo de demonstração no momento.";
    return "Estas são as promoções ativas no catálogo de demonstração:\n" + promotions.map((promotion) => {
      const product = productById.get(promotion.product_id);
      const price = Number(product.price_brl);
      const promoPrice = price * (1 - Number(promotion.discount_percent) / 100);
      return `• ${product.name}: ${promotion.description}, ${promotion.discount_percent}% de desconto. Preço promocional ${money(promoPrice)} (preço de tabela ${money(price)}).`;
    }).join("\n");
  }

  function orderReply(question) {
    if (!store.orders.length) return "Para proteger os dados dos clientes, a consulta de pedidos não está habilitada nesta demonstração. Entre em contato com a equipe da loja pelos canais oficiais.";
    const idMatch = normalize(question).match(/\bpedido\s*#?(\d{1,6})\b/);
    const emailMatch = question.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
    if (!idMatch || !emailMatch) return "Para proteger seus dados, informe o número do pedido e o e-mail usado na compra.";
    const order = store.orders.find((item) => item.order_id === idMatch[1] && normalize(item.email) === normalize(emailMatch[0]));
    if (!order) return "Não consegui localizar um pedido com essa combinação de dados. Confira o número e o e-mail ou peça ajuda à equipe.";
    const oldRecord = order.estimated_delivery && order.estimated_delivery < "2026-10-31";
    const historicalLabel = oldRecord ? "registro histórico: " : "";
    return `Encontrei o pedido #${order.order_id}.\nStatus: ${historicalLabel}${order.status}.\nPrevisão registrada: ${order.estimated_delivery || "não informada"}.\nRastreio: ${order.tracking_code || "não informado"}.\n\nEstes dados vêm de um arquivo histórico, não de uma consulta ao sistema atual.`;
  }

  function policyReply(question) {
    const q = normalize(question);
    if (["horario", "funcionamento", "abre", "fecha"].some((term) => q.includes(term))) return "A loja funciona de segunda a sexta, das 9h às 18h, e aos sábados, das 9h às 13h. Domingos e feriados, fechamos. Em datas especiais, o horário pode mudar.";
    if (["endereco", "onde fica", "localizacao"].some((term) => q.includes(term))) return "Estamos na Rua 14 de Maio, 3200 — Centro, Campo Grande - MS, CEP 79202-333.";
    if (["devolver", "devolucao", "arrepend", "reembolso"].some((term) => q.includes(term))) return "Em compras online, você pode pedir a devolução em até 7 dias corridos após receber o produto. Ele deve estar sem uso e na embalagem original, com manuais e acessórios. O frete de retorno é por conta da loja e o reembolso ocorre pela forma de pagamento original em até 10 dias úteis. Para iniciar o processo, a equipe precisa confirmar seu caso.";
    if (["troca", "defeito", "garantia"].some((term) => q.includes(term))) return "A política prevê troca por defeito de fabricação em até 30 dias corridos após a compra. O manual também informa garantia legal de 90 dias após o recebimento. A equipe pode confirmar como essas regras se aplicam ao seu caso.";
    if (["pix", "parcel", "pagamento", "cartao", "boleto", "debito"].some((term) => q.includes(term))) return "Aceitamos PIX (5% de desconto sobre o preço de tabela), débito, crédito em até 12x sem juros conforme o valor mínimo da parcela e boleto à vista. Promoções não acumulam com o desconto do PIX.";
    if (["frete", "entrega", "prazo"].some((term) => q.includes(term))) return "Na região metropolitana de Campo Grande, a entrega leva de 1 a 3 dias úteis; o frete é grátis acima de R$ 500 e custa R$ 35 abaixo disso. Para outras cidades, prazo e valor dependem do CEP e do produto.";
    return "Posso ajudar com instrumentos, pedidos, horários, pagamentos, entregas e políticas da loja. Para esse assunto, vou precisar confirmar com a equipe.";
  }

  function respond(question) {
    const q = normalize(question);
    if (["corda", "palheta", "cabo", "case", "pedal", "amplificador"].some((term) => q.includes(term))) {
      return "Trabalhamos exclusivamente com instrumentos musicais e não comercializamos cabos, cordas, palhetas, cases ou pedais. Para acessórios, uma loja de áudio ou instrumentos pode ajudar. Posso procurar um instrumento para você.";
    }
    if (q.includes("pedido") || q.includes("rastre") || q.includes("status do pedido")) return orderReply(question);
    if (["promocao", "promocoes", "desconto", "descontos", "oferta", "ofertas", "black friday"].some((term) => q.includes(term))) return promotionReply(question);
    if (categoryMatch(question) !== null || ["preco", "custa", "disponivel", "estoque", "instrumento"].some((term) => q.includes(term))) return catalogReply(question);
    return policyReply(question);
  }

  function submit(question) {
    const text = question.trim();
    if (!text || sendButton.disabled) return;
    addMessage(text, "user");
    input.value = "";
    input.style.height = "auto";
    quickQuestions.hidden = true;
    sendButton.disabled = true;
    const pending = addMessage("Consultando o catálogo e as informações da demonstração…", "assistant");
    pending.querySelector(".bubble").classList.add("typing");
    window.setTimeout(() => {
      pending.querySelector(".bubble").textContent = respond(text);
      pending.querySelector(".bubble").classList.remove("typing");
      sendButton.disabled = false;
      input.focus();
      conversation.scrollTop = conversation.scrollHeight;
    }, 220);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submit(input.value);
  });
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 90)}px`;
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  quickQuestions.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-prompt]");
    if (button) submit(button.dataset.prompt);
  });
  document.querySelector("#reset-chat").addEventListener("click", () => window.location.reload());

})();
