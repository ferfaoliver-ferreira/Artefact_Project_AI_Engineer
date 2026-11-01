# Empório da Música — AI customer service prototype

This take-home prototype contains a Portuguese customer-service assistant for a musical instrument store. The web demo is a self-contained, browser-only interface that can be opened directly from the project folder.

## Try the web demo (Windows)

1. Open `app/web` in File Explorer.
2. Double-click `index.html` (or double-click `run_web.bat` from the project folder).
3. Try a suggested question or type your own in Portuguese.

The page does not use `127.0.0.1`, a local server, Python, an API key, or an internet connection. Keep `index.html`, `app.js`, `data.js`, and `styles.css` together in `app/web`. The catalog, promotions, categories, and sample orders are included in `data.js` as a local snapshot. Chat behavior is implemented in the browser for this demonstration; it does not call the Python agent.

## Run the Python prototype

The separate command-line version uses Python 3.10+ and the standard library:

```bash
python -m app.main
```

Type `exit` to stop. The optional OpenAI wording layer requires installing `openai` and setting `OPENAI_API_KEY`; deterministic local responses work without credentials:

```bash
pip install -r requirements.txt
# PowerShell: $env:OPENAI_API_KEY="your_key"
python -m app.main
```

## Architecture and decisions

- **Python CLI, no agent framework:** intent routing invokes explicit functions for catalog, promotion, order, and policy questions.
- **Browser-only demo:** the small HTML/CSS/JavaScript chat page opens as a local file and uses a bundled CSV snapshot. It is intentionally self-contained to make the UI easy to try on Windows.
- **Structured data stays structured:** catalog price, availability, promotion, and order facts are read from the supplied CSV snapshot and are not guessed by a language model.
- **Policy retrieval:** the supplied policy PDF is represented by a reviewed Markdown knowledge base in `data/policies.md`. For this small fixed corpus, section lookup is simpler and more auditable than embedding-based RAG.
- **Optional LLM in the CLI:** OpenAI Responses API is a wording layer only. It receives the customer question and verified tool results; it cannot call tools or override those facts. The browser demo does not use an LLM.
- **Conversation state:** the CLI keeps context only in memory. The browser demo does not persist conversations or customer data.
- **Persona:** friendly, concise Brazilian Portuguese, with transparent limits and human handoff when a policy is ambiguous or the request needs an action the prototype cannot perform.

## Data and assumptions

- CSVs are the supplied snapshot, not live inventory. The demo must not claim real-time accuracy.
- Order lookup requires an order number and the email used for the purchase. The supplied order snapshot is historical; old delivery records are identified as historical, not live tracking.
- The policy manual contains inconsistent contact details (two WhatsApp numbers and two email spellings). The assistant avoids relying on disputed contact details and recommends confirmation with the store team.
- No API exists to change/cancel orders, reserve stock, issue refunds, or record complaints. The assistant explains the next step without pretending it completed an action.
- The sample product catalog contains instruments only; accessories are out of scope per the policy manual.

## Limitations and next steps

The browser demo uses simple rule-based Portuguese intent matching and local sample data. It is for demonstrating the flow, not production use. The Python CLI's intent detection is also rule-based. A production service would need authenticated access, live data integrations, audit logging, monitoring, evaluations for groundedness and privacy, a human handoff, and policy versioning.

## Coding assistant disclosure

OpenAI Codex was used as a coding assistant to inspect the supplied challenge materials, draft the prototype and documentation, and review example interactions. The candidate should review and understand every submitted file and adapt this disclosure to accurately describe their own workflow before submission.
