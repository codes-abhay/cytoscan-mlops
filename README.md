# CytoScan 🔬
### Clinical Pathology Decision Support Platform

CytoScan is a high-performance clinical decision support platform designed to assist pathologists in analyzing biopsy cytology measurements. It leverages a machine learning model trained offline on cell nuclei features to predict tissue mass classification (Malignant vs. Benign) in real-time.

Instead of deploying a heavy, monolithic machine learning microservice, CytoScan executes a **strategic architectural tradeoff**: it extracts the trained mathematical parameters from Scikit-Learn and serves predictions using a **custom mathematical inference engine built natively in Node.js (V8 Engine)**.

---

## 🌟 Core Engineering Features

### 1. Native V8 Mathematical Inference Engine
*   **The Systems Tradeoff:** Rather than launching a heavy Python microservice (like FastAPI or Flask), which introduces network latency (HTTP hops), serialization overhead (JSON parse costs), and concurrency bottlenecks (Python's Global Interpreter Lock), CytoScan runs the math directly inside Node's V8 engine.
*   **The Math:** It reads the StandardScaler parameters ($\mu, \sigma$), weights ($w_i$), and intercept ($b$) from a JSON config and computes the Sigmoid probability natively in **sub-milliseconds**:
    $$scaled\_x_i = \frac{x_i - \mu_i}{\sigma_i}$$
    $$z = b + \sum_{i=1}^{30} (w_i \times scaled\_x_i)$$
    $$P(Malignant) = \frac{1}{1 + e^{-z}}$$

### 2. High-Resiliency Database Architecture
*   **Graceful Degradation:** During database outages or local disconnected runs, the Express.js server automatically disables command buffering and degrades gracefully to an **In-Memory Session Cache (RAM array)**. 
*   **Clinical Continuity:** This ensures the diagnostic pipeline never times out or crashes for the pathologist. When the MongoDB Atlas cluster reconnects, persistent audit logging resumes automatically.

### 3. Rigid Input Sanitization & Validation
*   **Schema Defense:** Implements strict validation middleware via `express-validator`. It intercepts all requests to ensure exactly 30 cytology float metrics are present and physically sound before they reach the math engine, defending against input corruptions.

### 4. Interactive Pathology Visualizer
*   **Dynamic UX:** Features a dark-mode glassmorphic client interface. 
*   **Radar Metrics:** Uses **Chart.js** to map Min-Max scaled cytology parameters dynamically onto a radar chart, allowing pathologists to visually cross-reference biopsy metrics against standard boundaries.

---

## 🔬 Offline ML Pipeline & Evaluation

The predictive model was trained offline using a structured Python pipeline (`Model/main.py`) on the Wisconsin Breast Cancer Dataset.

*   **5-Fold Cross-Validation:** Utilized to get an unbiased generalization performance:
    *   **Logistic Regression (Production Champion):** **97.71% Accuracy | 96.34% Recall | 99.48% ROC-AUC**
    *   **Random Forest Classifier:** **95.96% Accuracy | 93.89% Recall | 98.73% ROC-AUC**
*   **Detailed Performance (Unseen Test Set):**
    *   **Accuracy:** **97.37%**
    *   **Recall (Sensitivity):** **95.35%** 
    *   **ROC-AUC:** **99.74%**
*   **Recall Optimization:** Because clinical diagnostics treat a False Negative (missing cancer) as catastrophic, the classification decision boundaries were specifically optimized to prioritize **Recall (Sensitivity)** while keeping Precision highly acceptable.

---

## 📂 Codebase Structure

```
├── Data/
│   └── data.csv                  # Cytology dataset
├── Model/
│   ├── main.py                   # Offline ML training & JSON coefficient exporter
│   └── model_coefficients.json   # Exported weights, bias, mean, and scale parameters
├── middleware/
│   └── validator.js              # Strict express-validator schema checking
├── models/
│   └── PredictionLog.js          # Mongoose schema for persistent audits (compound indexed)
├── public/                       # Responsive Client SPA (HTML, CSS, JS, Chart.js)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── server.js                     # High-performance Express server & Native Math Engine
├── package.json                  # Node.js dependencies
└── README.md
```

---

## 🚀 Local Deployment & Setup

### Prerequisites
*   Node.js (v18+)
*   Python 3 (for offline retraining pipeline only)

### Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/cytoscan-mlops.git
    cd cytoscan-mlops
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up your Environment Variables by creating a `.env` file in the root directory:
    ```env
    MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/cytoscan?retryWrites=true&w=majority
    PORT=3000
    ```
4.  Run the application in development mode:
    ```bash
    npm run dev
    ```
5.  Open your browser and navigate to: **`http://localhost:3000`**
