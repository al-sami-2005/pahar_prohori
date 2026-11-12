"""
STEP 10 - Train the landslide prediction model.
Output: ml/landslide_model.joblib (loaded by the backend).
"""
import json
import sys
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split

sys.path.insert(0, str(Path(__file__).parent))
from features import FEATURES  # noqa: E402


def main():
    df = pd.read_csv("data/training_data.csv")
    X, y = df[FEATURES], df["landslide_next_24h"]
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

    model = RandomForestClassifier(
        n_estimators=300, max_depth=10, min_samples_leaf=5,
        class_weight="balanced", random_state=42, n_jobs=-1,
    )
    model.fit(X_tr, y_tr)

    proba = model.predict_proba(X_te)[:, 1]
    auc = roc_auc_score(y_te, proba)
    print(f"ROC-AUC: {auc:.3f}")
    print(classification_report(y_te, proba > 0.5, digits=3))

    importance = sorted(zip(FEATURES, model.feature_importances_), key=lambda t: -t[1])
    print("Feature importance:")
    for f, v in importance:
        print(f"  {f:24s} {v:.3f}")

    joblib.dump(model, "ml/landslide_model.joblib")
    Path("ml/model_report.json").write_text(json.dumps({
        "roc_auc": round(auc, 3),
        "feature_importance": {f: round(float(v), 3) for f, v in importance},
    }, indent=2))
    print("Saved ml/landslide_model.joblib")


if __name__ == "__main__":
    main()
