# Artefact_Project_AI_Engineer

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
