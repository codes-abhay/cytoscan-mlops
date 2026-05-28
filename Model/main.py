import os
import json
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import KFold, cross_validate, train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, recall_score, precision_score, f1_score, roc_auc_score

def get_clean_data():
    # Load dataset
    filepath = "Data/data.csv"
    if not os.path.exists(filepath):
        # Fallback for alternative paths if run from different cwd
        filepath = os.path.join(os.path.dirname(__file__), "..", "Data", "data.csv")
    
    data = pd.read_csv(filepath)
    
    # Drop unnecessary columns
    data = data.drop(['Unnamed: 32', 'id'], axis=1)
    
    # Map diagnosis to binary classes: Malignant = 1, Benign = 0
    data['diagnosis'] = data['diagnosis'].map({ 'M': 1, 'B': 0 })
    return data

def run_ml_pipeline(data):
    X = data.drop(['diagnosis'], axis=1)
    y = data['diagnosis']
    feature_names = X.columns.tolist()
    
    print("==================================================")
    # 1. Theoretical Proofpoint: 5-Fold Cross-Validation
    # This directly addresses university syllabus topics: K-Fold CV & Estimating Classifiers
    print("[Pipeline] Running 5-Fold Cross-Validation...")
    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    
    # Scale data for CV evaluation
    scaler_cv = StandardScaler()
    X_scaled_cv = scaler_cv.fit_transform(X)
    
    # Compare Logistic Regression and Random Forest
    lr_cv = LogisticRegression(random_state=42, max_iter=1000)
    rf_cv = RandomForestClassifier(n_estimators=100, random_state=42)
    
    cv_metrics = ['accuracy', 'precision', 'recall', 'f1', 'roc_auc']
    
    lr_results = cross_validate(lr_cv, X_scaled_cv, y, cv=kf, scoring=cv_metrics)
    rf_results = cross_validate(rf_cv, X_scaled_cv, y, cv=kf, scoring=cv_metrics)
    
    print("\n--- 5-Fold CV Performance Comparison ---")
    print(f"{'Metric':<15} | {'Logistic Regression':<20} | {'Random Forest':<20}")
    print("-" * 62)
    for metric in cv_metrics:
        lr_mean = np.mean(lr_results[f'test_{metric}'])
        rf_mean = np.mean(rf_results[f'test_{metric}'])
        print(f"{metric.upper():<15} | {lr_mean:.4f}               | {rf_mean:.4f}")
    
    print("==================================================")
    
    # 2. Train-Test Split for Detailed Diagnostic Report
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Scale inputs for training
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train Logistic Regression (Chosen for lightweight native serving SDE tradeoff)
    print("[Pipeline] Training Final Production Logistic Regression Model...")
    model = LogisticRegression(random_state=42, max_iter=1000)
    model.fit(X_train_scaled, y_train)
    
    # Test model
    y_pred = model.predict(X_test_scaled)
    y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
    
    accuracy = accuracy_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_pred_proba)
    
    print("\n--- Final Logistic Regression Production Metrics ---")
    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f} (Crucial for clinical cancer screening!)")
    print(f"F1-Score:  {f1:.4f}")
    print(f"ROC-AUC:   {auc:.4f}")
    print("\nClassification Report:\n", classification_report(y_test, y_pred))
    
    # 3. Export Model Coefficients, Scaling factors, and Feature order to JSON
    # This enables our high-performance native Javascript serving!
    print("[Pipeline] Exporting Model Coefficients to JSON...")
    model_params = {
        "features": feature_names,
        "intercept": float(model.intercept_[0]),
        "weights": model.coef_[0].tolist(),
        "mean": scaler.mean_.tolist(),
        "scale": scaler.scale_.tolist(),
        "metrics": {
            "accuracy": float(accuracy),
            "precision": float(precision),
            "recall": float(recall),
            "f1": float(f1),
            "auc": float(auc)
        }
    }
    
    export_dir = os.path.dirname(os.path.abspath(__file__))
    export_path = os.path.join(export_dir, "model_coefficients.json")
    
    with open(export_path, "w") as f:
        json.dump(model_params, f, indent=2)
        
    print(f"[Pipeline] Successfully generated parameters at: {export_path}")
    print("==================================================")
    
    return model, scaler

def main():
    data = get_clean_data()
    run_ml_pipeline(data)

if __name__ == '__main__':
    main()