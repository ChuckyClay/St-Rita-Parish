import sys
import json
from argostranslate import translate

def main():
    raw = sys.stdin.read()
    payload = json.loads(raw)

    title = payload.get("title", "") or ""
    content = payload.get("content", "") or ""
    day_title = payload.get("day_title", "") or ""

    installed_languages = translate.get_installed_languages()

    from_lang = next((lang for lang in installed_languages if lang.code == "en"), None)
    to_lang = next((lang for lang in installed_languages if lang.code == "sw"), None)

    if from_lang is None or to_lang is None:
        raise Exception("Required offline language packs are not installed: en -> sw")

    translation = from_lang.get_translation(to_lang)
    if translation is None:
        raise Exception("No offline translation path available from en to sw")

    result = {
        "title": translation.translate(title).strip() if title else "",
        "day_title": translation.translate(day_title).strip() if day_title else "",
        "content": translation.translate(content).strip() if content else "",
    }

    sys.stdout.write(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()