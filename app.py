import os
import re
import time
import logging
import joblib
from threading import Lock
from flask import Flask, render_template, request, jsonify
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

app = Flask(__name__)
MODEL_FILE = "spam_model.pkl"
_MODEL_LOCK = Lock()

# Integrated Training Set
TRAIN_TEXTS = [
    # Clean / Non-Spam
    "Hey, let's meet for lunch today at 1 PM.",
    "Your appointment is confirmed for tomorrow at 10 AM.",
    "In a report from local health officials, city leaders announced a new emergency response plan.",
    "Please find attached the invoice for last month's project expenses.",
    "Can you review the pull request on GitHub when you have a moment?",
    "The library will remain closed on Sunday due to scheduled maintenance.",
    "Thanks for sending the document, I will review it shortly.",
    "Meeting rescheduled to 3 PM in conference room B.",
    "Don't forget to buy groceries on your way back home.",
    "The project proposal has been approved by the board.",
    
    # Spam / Fraud / Phishing
    "Congratulations! You have won $10,000,000 in our lucky draw. Click here to claim your prize now!",
    "Urgent: Your account is suspended. Verify your banking credentials immediately at this link.",
    "Get rich quick! Earn $5,000 a day working from home with zero effort. Sign up today!",
    "You have been selected for a free iPhone! Click to claim before offer expires.",
    "Claim your free gift card worth $500 now by completing this quick survey!",
    "Dear customer, your card has been blocked. Call this number immediately to unblock.",
    "Exclusive deal! Limited time offer to get 90% discount on luxury watches.",
    "You owe unpaid taxes. Immediate payment required to avoid legal action.",
    "Work from home opportunity! Instant approval with high daily income guaranteed."
]

TRAIN_LABELS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1]


class LinguisticFeatureExtractor(BaseEstimator, TransformerMixin):
    """Custom Transformer extracting domain-specific heuristic features."""
    def fit(self, X, y=None):
        return self

    def transform(self, X):
        features = []
        for text in X:
            has_urgent = bool(re.search(r'\b(urgent|immediately|action required|verify|suspended|blocked|warning|attention)\b', text, re.IGNORECASE))
            has_financial = bool(re.search(r'\b(win|won|prize|free|money|cash|lucky|bonus|claim|discount|currency|\$|₹|€)\b', text, re.IGNORECASE))
            has_links = bool(re.search(r'(https?://|www\.|bit\.ly|click\s*here|link)', text, re.IGNORECASE))
            
            alpha_chars = [c for c in text if c.isalpha()]
            high_caps = (sum(1 for c in alpha_chars if c.isupper()) / max(len(alpha_chars), 1)) > 0.4 if alpha_chars else False

            features.append([
                float(has_urgent),
                float(has_financial),
                float(has_links),
                float(high_caps)
            ])
        return features


def build_and_train_model():
    """Builds and trains the classification pipeline."""
    pipeline = Pipeline([
        ('features', FeatureUnion([
            ('tfidf', TfidfVectorizer(ngram_range=(1, 2), stop_words='english')),
            ('heuristics', LinguisticFeatureExtractor())
        ])),
        ('classifier', MultinomialNB())
    ])
    pipeline.fit(TRAIN_TEXTS, TRAIN_LABELS)
    return pipeline


def load_or_train_model():
    """Thread-safe model retrieval with file persistence."""
    with _MODEL_LOCK:
        if os.path.exists(MODEL_FILE):
            try:
                logging.info("Loading cached model from disk...")
                return joblib.load(MODEL_FILE)
            except Exception as e:
                logging.warning(f"Failed to load cached model: {e}. Retraining...")
        
        logging.info("Training new spam classification model...")
        model = build_and_train_model()
        joblib.dump(model, MODEL_FILE)
        return model


# Global model initialization
model = load_or_train_model()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/analyze', methods=['POST'])
def analyze():
    start_time = time.perf_counter()
    data = request.get_json() or {}
    text = data.get('text', '').strip()

    if not text:
        return jsonify({'error': 'No input text provided'}), 400

    # Probabilistic prediction
    probs = model.predict_proba([text])[0]
    non_spam_prob = round(float(probs[0]) * 100, 1)
    spam_prob = round(float(probs[1]) * 100, 1)
    is_spam = bool(probs[1] > 0.5)

    # Extract signal metadata for UI diagnostics
    has_urgency = bool(re.search(r'\b(urgent|immediately|action required|verify|suspended|blocked|warning|attention)\b', text, re.IGNORECASE))
    has_financial = bool(re.search(r'\b(win|won|prize|free|money|cash|lucky|bonus|claim|discount|currency|\$|₹|€)\b', text, re.IGNORECASE))
    has_links = bool(re.search(r'(https?://|www\.|bit\.ly|click\s*here|link)', text, re.IGNORECASE))

    execution_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

    return jsonify({
        'is_spam': is_spam,
        'spam_probability': spam_prob,
        'non_spam_probability': non_spam_prob,
        'execution_time_ms': execution_time_ms,
        'signals': {
            'has_urgency': has_urgency,
            'has_financial_triggers': has_financial,
            'has_suspicious_links': has_links
        }
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)