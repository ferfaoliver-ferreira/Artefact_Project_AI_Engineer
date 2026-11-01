# Empório da Música — AI customer service prototype

An English-language README for the take-home. The assistant itself replies in Brazilian Portuguese, matching the store and supplied policy manual.

## Run

Requires Python 3.10+; no third-party dependencies are needed for the default local mode.

```bash
python -m app.main
```

The CLI accepts one message per line. Type `exit` to stop. For a model-backed response, install `openai` and set `OPENAI_API_KEY`; the model is used only to phrase a reply from verified tool results and policy excerpts. The default local mode is deterministic and works without credentials:

```bash
pip install -r requirements.txt
set OPENAI_API_KEY=your_key   # PowerShell: $env:OPENAI_API_KEY="..."
python -m app.main
```

## Web interface

Start the local test interface with the standard library HTTP server:

```bash
python -m app.web
```

Then open `http://127.0.0.1:8000`. The page sends messages to the same Python `respond` function used by the CLI. It runs locally and requires no additional package. The interface is a prototype for testing, not a production-ready public service.

## Architecture and decisions

- **Python CLI, no agent framework:** keeps the prototype easy to run and makes routing and tool behavior explicit. A small intent router invokes typed Python functions for catalog, promotion, order, or policy questions.
- **Simple local web interface:** a small HTML/CSS/JavaScript chat page uses Python's standard-library HTTP server, so it exercises the same agent without adding a web-framework dependency. The interface is styled with forest green, warm cream, and wood-inspired ochre accents.
- **Structured data stays structured:** the CSV tables are loaded with Python's `csv` module and queried directly. Price, availability, promotion validity, and order status are never guessed by the language model.
- **Policy retrieval:** the supplied policy PDF is represented by a compact, reviewed Markdown knowledge base in `data/policies.md`. For this small fixed corpus, section lookup is simpler and more auditable than embedding-based RAG. The prototype's response templates map common questions to relevant policy sections.
- **Optional LLM:** OpenAI Responses API is an optional wording layer. It receives the customer question and only the facts returned by tools; it cannot call tools itself or override those facts. With no API key, templates provide a complete local experience.
- **Conversation state:** only in-memory context for this CLI session; no customer data or conversation is persisted. This reduces privacy exposure and keeps the demonstration reproducible.
- **Persona:** friendly, knowledgeable, concise Brazilian Portuguese, with transparent limits and a human handoff when a policy is ambiguous or the request requires action the prototype cannot perform.

## Data and assumptions

- CSVs are the supplied snapshot, not live inventory. Never claim real-time accuracy; this prototype reports the latest values in that snapshot.
- Order lookup requires an order number and a customer identifier (email) to avoid exposing another customer's data. The supplied order snapshot is dated 2025; old delivery records are explicitly labeled historical and must not be presented as live tracking.
- The policy manual contains inconsistent contact details (two WhatsApp numbers and two email spellings). The assistant avoids relying on disputed contact details and recommends the store's human team for confirmation.
- No API exists to change/cancel orders, reserve stock, issue refunds, or record complaints. The assistant explains the next step without pretending it has completed an action.
- The sample CSV product catalog contains instruments only; accessories are out of scope per the policy manual.

## Known limitations / next steps

Intent detection is rule-based and Portuguese-focused; extend with tests and multilingual examples. Data refresh, authentication, audit logging, a real messaging channel, human handoff, and policy versioning are not implemented. For production, add access controls, observability, evals for groundedness and privacy, and explicit freshness indicators.

## Coding assistant disclosure

OpenAI Codex was used as a coding assistant to inspect the supplied challenge materials, draft the prototype and documentation, and review example interactions. The candidate should review and understand every submitted file and adapt this disclosure to accurately describe their own workflow before submission.

