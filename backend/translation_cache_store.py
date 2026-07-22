"""Persistence for LLM-translated citizen advisories (data/translation_cache.json).

Keyed by (content fingerprint, language) rather than (station, language) —
agents/translation_agent.py::advisory_content_fingerprint() hashes the
actual English advisory content, so a cache hit only happens while that
content hasn't changed. A fresh AQI reading that shifts a risk_level
produces a new fingerprint and a fresh translation automatically; nothing
here ever needs to be manually invalidated. Same "no database, plain JSON
file" approach as incident_store.py/notification_store.py."""
import json
import os

_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "translation_cache.json")


def load():
    if not os.path.exists(_PATH):
        return {}
    # Explicit utf-8 — this file holds real Hindi/Marathi/Tamil/Bengali
    # text, unlike this project's other JSON stores which only ever held
    # ASCII-safe content. Relying on Python's platform-default encoding
    # (cp1252 on Windows) crashes the moment non-ASCII content is written;
    # explicit utf-8 is correct on every OS, not just where it happens to
    # already match the default.
    with open(_PATH, encoding="utf-8") as f:
        return json.load(f)


def save(cache):
    with open(_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)


def cache_key(fingerprint, language):
    return f"{fingerprint}:{language}"


def get(fingerprint, language):
    return load().get(cache_key(fingerprint, language))


def put(fingerprint, language, advisories):
    cache = load()
    cache[cache_key(fingerprint, language)] = advisories
    save(cache)
