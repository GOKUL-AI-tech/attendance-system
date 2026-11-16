"""
Employee Attendance & Work Monitoring System
AI/ML Microservice (Python + Flask + scikit-learn)

Provides one simple AI feature:
  POST /api/ai/work-summary
    Input : an employee's recent work reports + attendance + task stats
    Output: a short natural-language summary of completed work
            (via TF-IDF keyword extraction over the report text)
            + a Productivity Indicator (0-100), an informational
            metric only -- NOT an automatic performance judgment.
"""

import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MinMaxScaler
import numpy as np

app = Flask(__name__)
CORS(app)

STOPWORDS_EXTRA = {
    "the", "and", "for", "with", "was", "were", "this", "that", "from",
    "have", "has", "had", "today", "work", "worked", "working", "day",
    "did", "done", "also", "into", "some", "more", "then", "than",
}


def extract_keywords(texts, top_n=6):
    """Use TF-IDF to find the most representative terms across a set of
    daily work-report descriptions."""
    cleaned = [re.sub(r"[^a-zA-Z\s]", " ", t.lower()) for t in texts if t and t.strip()]
    if not cleaned:
        return []

    try:
        vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=50,
            ngram_range=(1, 2),
            min_df=1,
        )
        matrix = vectorizer.fit_transform(cleaned)
        scores = np.asarray(matrix.sum(axis=0)).ravel()
        terms = vectorizer.get_feature_names_out()

        ranked = sorted(zip(terms, scores), key=lambda x: x[1], reverse=True)
        keywords = []
        for term, _score in ranked:
            if term in STOPWORDS_EXTRA:
                continue
            if any(term in kw or kw in term for kw in keywords):
                continue
            keywords.append(term)
            if len(keywords) >= top_n:
                break
        return keywords
    except ValueError:
        return []


def compute_productivity_indicator(attendance_rate, task_completion_rate, avg_hours_per_day, expected_hours=8.0):
    """
    Weighted, normalized productivity indicator (0-100).
    Components (each scaled 0-1 with MinMaxScaler against a realistic
    0-1 / 0-1 / 0-expected_hours range) combined with fixed weights:
      - Attendance rate      : 35%
      - Task completion rate : 40%
      - Hours-worked ratio   : 25%  (capped at 1.0 -- overwork isn't rewarded further)
    This is an informational signal only, not an automated judgment of
    an employee's performance.
    """
    hours_ratio = min(avg_hours_per_day / expected_hours, 1.0) if expected_hours > 0 else 0.0

    raw = np.array([
        [attendance_rate, task_completion_rate, hours_ratio],
        [0.0, 0.0, 0.0],
        [1.0, 1.0, 1.0],
    ])
    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(raw)[0]

    weights = np.array([0.35, 0.40, 0.25])
    score = float(np.dot(scaled, weights)) * 100
    return round(score, 1)


def band_for_score(score):
    if score >= 80:
        return "Strong"
    if score >= 60:
        return "Steady"
    if score >= 40:
        return "Developing"
    return "Needs attention"


@app.route("/api/ai/work-summary", methods=["POST"])
def work_summary():
    payload = request.get_json(force=True) or {}

    employee_name = payload.get("employeeName", "This employee")
    reports = payload.get("reports", [])  # [{date, work_completed, hours_worked, task_status}]
    attendance_rate = float(payload.get("attendanceRate", 0))       # 0-1
    task_completion_rate = float(payload.get("taskCompletionRate", 0))  # 0-1
    tasks_completed = int(payload.get("tasksCompleted", 0))
    tasks_total = int(payload.get("tasksTotal", 0))

    texts = [r.get("work_completed", "") for r in reports]
    hours_list = [float(r.get("hours_worked", 0) or 0) for r in reports]
    avg_hours_per_day = float(np.mean(hours_list)) if hours_list else 0.0

    keywords = extract_keywords(texts, top_n=6)
    num_reports = len(reports)

    if keywords:
        keyword_phrase = ", ".join(keywords)
        summary = (
            f"Over the last {num_reports} logged day(s), {employee_name} primarily worked on: "
            f"{keyword_phrase}. Average logged effort was {avg_hours_per_day:.1f} hrs/day, "
            f"with {tasks_completed} of {tasks_total} assigned task(s) marked complete."
        )
    else:
        summary = (
            f"No work reports are available yet for {employee_name} in this period, "
            f"so a content summary could not be generated."
        )

    productivity_score = compute_productivity_indicator(
        attendance_rate, task_completion_rate, avg_hours_per_day
    )

    return jsonify({
        "summary": summary,
        "keywords": keywords,
        "productivityIndicator": {
            "score": productivity_score,
            "band": band_for_score(productivity_score),
            "note": "Informational metric only -- not an automatic performance judgment.",
            "components": {
                "attendanceRate": round(attendance_rate * 100, 1),
                "taskCompletionRate": round(task_completion_rate * 100, 1),
                "avgHoursPerDay": round(avg_hours_per_day, 2),
            }
        }
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "ai-service"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6060)
