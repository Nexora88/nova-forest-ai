# Contributing to NexoraWildfire AI

Thank you for your interest in improving environmental decision support.

## Before opening a pull request

1. Describe the problem and the expected behavior.
2. Keep live observations, heuristics, simulations, and trained ML outputs clearly separated.
3. Do not add synthetic labels or fabricated performance metrics to the wildfire model.
4. Do not commit API keys, tokens, private user data, model credentials, or environment files.
5. Preserve offline behavior where practical and provide a clear offline/unavailable state.
6. Include tests or a reproducible manual test plan for behavior changes.
7. Prefer small, focused pull requests and explain any external data-source requirements.

## Local backend checks

From the backend directory, install the base requirements and run:

```bash
python -m compileall -q app scripts
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The optional model training environment is defined in requirements-ml.txt. Training requires documented real labelled data and the NEXORA_LABEL_SOURCE environment variable. Do not create synthetic labels to make a model appear ready.

## Data and safety

External providers can be unavailable or rate-limited. Show the source and status where possible; do not interpret missing observations as zero risk. NexoraWildfire AI is experimental decision support, not an official alert service.
