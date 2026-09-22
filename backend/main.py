import json
import re
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"]
)

knowledge = json.loads(
    (Path(__file__).parent / "data" / "knowledge.json").read_text(encoding="utf-8")
)
stop_words = {
    "a", "an", "and", "are", "about", "can", "do", "for", "how", "i",
    "in", "is", "it", "me", "of", "on", "or", "the", "to", "what", "with"
}
category_aliases = {
    "Patent": {"patent", "patentable"},
    "Trademark": {"trademark", "trade", "mark"},
    "Copyright": {"copyright", "literary", "written", "work"},
    "GI": {"gi", "tag", "geographical", "geographic", "indication"}
}


class Query(BaseModel):
    question: str
    language: str = "English"


def classify(question):
    question = question.lower()

    if any(term in question for term in [
        "patent", "invention", "inventive", "formulation", "patentable"
    ]):
        return "Patent"
    if any(term in question for term in [
        "trademark", "trade mark", "brand", "brand name", "logo", "mark"
    ]):
        return "Trademark"
    if any(term in question for term in [
        "copyright", "book", "literary", "music", "software", "written work"
    ]):
        return "Copyright"
    if any(term in question for term in [
        "geographical indication", "geographical", "geographic", "gi tag"
    ]) or re.search(r"\bgi\b", question):
        return "GI"
    return "General"


def tokenize(text):
    return {
        word for word in re.findall(r"[a-z0-9]+", text.lower())
        if len(word) > 1 and word not in stop_words
    }


def translate(text, language):
    if language == "Hindi":
        return f"हिंदी में जानकारी: {text}"
    if language == "Hinglish":
        return f"Hinglish mein information: {text}"
    return text


@app.get("/")
def root():
    return {"status": "IP-SAKTI Sahayak running"}


@app.post("/ask")
def ask(query: Query):
    category = classify(query.question)
    words = tokenize(query.question)
    results = []

    for item in knowledge:
        if item["category"] != category:
            continue

        item_words = tokenize(f'{item["title"]} {item["content"]}')
        item_words.update(category_aliases.get(category, set()))
        matching_words = words & item_words
        if matching_words:
            score = len(matching_words) + 10
            results.append((score, item))

    results.sort(key=lambda result: result[0], reverse=True)
    matches = [item for _, item in results[:3]]
    route = {
        "Patent": "File a patent application with the Indian Patent Office",
        "Trademark": "Apply for trademark registration with the Trade Marks Registry",
        "Copyright": "Apply for copyright registration",
        "GI": "Explore Geographical Indication registration"
    }.get(category, "Identify the applicable IP protection route")
    next_steps = {
        "Patent": [
            "Check novelty and inventive step",
            "Review applicable exclusions under the Patents Act",
            "Prepare and file the appropriate patent application"
        ],
        "Trademark": [
            "Check trademark distinctiveness",
            "Search for conflicting marks",
            "Consider trademark registration"
        ],
        "Copyright": [
            "Confirm the work is original",
            "Identify the applicable copyright category",
            "Consider copyright registration"
        ],
        "GI": [
            "Confirm the geographical origin requirement",
            "Check whether the product characteristics are linked to the region",
            "Review the GI registration process"
        ],
        "General": [
            "Identify the relevant IP category",
            "Review the applicable Indian IP framework",
            "Consult the relevant official authority"
        ]
    }.get(category, [])

    return {
        "question": query.question,
        "language": query.language,
        "category": category,
        "intent": {
            "domain": "Intellectual Property",
            "category": category,
            "jurisdiction": "India"
        },
        "route": route,
        "next_steps": next_steps,
        "answer": translate(
            matches[0]["content"] if matches else "No relevant information found.",
            query.language
        ),
        "disclaimer": "This guidance is for informational purposes only and should not be treated as legal advice.",
        "confidence": "High" if matches else "Low",
        "evidence_count": len(matches),
        "sources": [
            {
                "title": item["title"],
                "source": item["source"],
                "url": item["url"],
                "verified": True
            }
            for item in matches
        ]
    }