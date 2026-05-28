require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const { validatePatientMetrics } = require('./middleware/validator');
const PredictionLog = require('./models/PredictionLog');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cytoscan';

// Disable Mongoose global command buffering to prevent hanging queries
mongoose.set('bufferCommands', false);

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Static Client Files Serving
app.use(express.static(path.join(__dirname, 'public')));

// 1. Native Machine Learning Inference Engine Configuration
let modelParams = null;
const modelPath = path.join(__dirname, 'Model', 'model_coefficients.json');

try {
  if (fs.existsSync(modelPath)) {
    const rawData = fs.readFileSync(modelPath, 'utf8');
    modelParams = JSON.parse(rawData);
    console.log('[ML Engine] Native Model Parameters successfully loaded into RAM.');
    console.log(`[ML Engine] Champion Model: Logistic Regression | Cross-Val AUC: ${modelParams.metrics.auc.toFixed(4)}`);
  } else {
    console.warn('[ML Engine] WARNING: model_coefficients.json not found. Math engine running in mock mode.');
  }
} catch (error) {
  console.error('[ML Engine] ERROR loading model coefficients:', error.message);
}

function checkAndLoadModel() {
  if (!modelParams && fs.existsSync(modelPath)) {
    try {
      modelParams = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
      console.log('[ML Engine] Native Model Parameters loaded dynamically.');
    } catch (e) {
      console.error('[ML Engine] Dynamic load failed:', e.message);
    }
  }
}

// 2. Mathematical Inference Engine Core (Pure JS)
function computeNativeInference(metrics) {
  checkAndLoadModel();
  
  if (!modelParams) {
    throw new Error('Model coefficients are not loaded. Please run the training pipeline first.');
  }

  const { features, weights, intercept, mean, scale } = modelParams;

  let z = intercept; // Start with bias intercept

  // Perform standard scaling mapping and dot product accumulation
  // Formula: z = intercept + Sum(w_i * ((x_i - mean_i) / scale_i))
  for (let i = 0; i < features.length; i++) {
    const featureName = features[i];
    const rawValue = metrics[featureName];

    if (rawValue === undefined) {
      throw new Error(`Missing expected feature value for: ${featureName}`);
    }

    // Standard Scaling Math
    const scaledValue = (rawValue - mean[i]) / scale[i];

    // Dot Product Accumulation
    z += weights[i] * scaledValue;
  }

  // Logistic Sigmoid Function Math
  const probabilityMalignant = 1 / (1 + Math.exp(-z));
  const probabilityBenign = 1 - probabilityMalignant;

  const prediction = probabilityMalignant >= 0.5 ? 'Malignant' : 'Benign';

  return {
    prediction,
    probabilityMalignant,
    probabilityBenign,
    coefficientsCount: features.length,
    decisionBoundaryZ: z
  };
}

// State tracker for MongoDB connection
let isDbConnected = false;
// In-Memory Session Cache (Resilient fallback for local runs without MongoDB)
const inMemoryHistoryLogs = [];

// 3. API Endpoints

// GET /api/model-meta -> Returns validation features and model metrics
app.get('/api/model-meta', (req, res) => {
  checkAndLoadModel();
  if (!modelParams) {
    return res.status(503).json({ success: false, message: 'Model is not trained yet.' });
  }
  return res.json({
    success: true,
    features: modelParams.features,
    metrics: modelParams.metrics
  });
});

// POST /api/predict -> Runs validation, does native math, saves history
app.post('/api/predict', validatePatientMetrics, async (req, res) => {
  try {
    const { cellMetrics, patientName } = req.body;

    // Run native mathematical inference on the main thread (sub-millisecond run)
    const inferenceResult = computeNativeInference(cellMetrics);
    const activePatientName = patientName && patientName.trim() !== "" ? patientName.trim() : "Anonymous Patient";
    const targetProbability = inferenceResult.prediction === 'Malignant' ? 
      inferenceResult.probabilityMalignant : inferenceResult.probabilityBenign;

    let logId = new mongoose.Types.ObjectId();
    let timestamp = new Date();

    if (isDbConnected) {
      // 3A. DB is Connected: Persist diagnosis transaction in MongoDB (Audit trail)
      try {
        const log = new PredictionLog({
          patientName: activePatientName,
          cellMetrics: cellMetrics,
          prediction: inferenceResult.prediction,
          probability: targetProbability
        });
        await log.save();
        logId = log._id;
        timestamp = log.createdAt;
        console.log(`[Database] Logged prediction successfully for: ${activePatientName}`);
      } catch (dbErr) {
        console.error('[Database Logging Error] Falling back to in-memory caching:', dbErr.message);
        isDbConnected = false; // Degrade gracefully
      }
    }

    if (!isDbConnected) {
      // 3B. DB is Disconnected: Degrade gracefully to In-Memory Session Cache
      const mockLog = {
        _id: logId,
        patientName: activePatientName,
        cellMetrics: cellMetrics,
        prediction: inferenceResult.prediction,
        probability: targetProbability,
        createdAt: timestamp
      };
      // Keep session logs capped at 100 entries to prevent memory bloating
      if (inMemoryHistoryLogs.length >= 100) inMemoryHistoryLogs.pop();
      inMemoryHistoryLogs.unshift(mockLog);
      console.log(`[In-Memory Cache] Cached prediction successfully for: ${activePatientName}`);
    }

    return res.json({
      success: true,
      patientName: activePatientName,
      prediction: inferenceResult.prediction,
      probabilityMalignant: inferenceResult.probabilityMalignant,
      probabilityBenign: inferenceResult.probabilityBenign,
      logId: logId,
      timestamp: timestamp,
      modelMetrics: modelParams ? modelParams.metrics : null,
      runtimeMode: isDbConnected ? "MongoDB Persistent" : "In-Memory Session Cache"
    });

  } catch (error) {
    console.error('[API Error] Predict endpoint failure:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to process clinical prediction.',
      error: error.message
    });
  }
});

// GET /api/history -> Fetch recent diagnosis logs (MongoDB or In-Memory fallbacks)
app.get('/api/history', async (req, res) => {
  try {
    if (isDbConnected) {
      // Query MongoDB (capped at 10 items)
      try {
        const logs = await PredictionLog.find()
          .sort({ createdAt: -1 })
          .limit(10);
        return res.json({
          success: true,
          count: logs.length,
          history: logs,
          runtimeMode: "MongoDB Persistent"
        });
      } catch (dbErr) {
        console.error('[Database History Error] Falling back to in-memory:', dbErr.message);
        isDbConnected = false; // Degrade
      }
    }

    // Return In-Memory Cache (already pre-sorted on unshift)
    return res.json({
      success: true,
      count: Math.min(inMemoryHistoryLogs.length, 10),
      history: inMemoryHistoryLogs.slice(0, 10),
      runtimeMode: "In-Memory Session Cache"
    });

  } catch (error) {
    console.error('[API Error] History endpoint failure:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch diagnostic logs history.',
      error: error.message
    });
  }
});

// Root Route fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// MongoDB Connection attempt with strict timeouts
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 2000, // Timeout after 2s of database search
})
  .then(() => {
    isDbConnected = true;
    console.log('[Database] Connected securely to MongoDB.');
    app.listen(PORT, () => {
      console.log(`[Server] CytoScan running dynamically on: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    isDbConnected = false;
    console.error('[Database] Connection failure:', err.message);
    console.warn('[Server] Launching Express server in high-resiliency mode (graceful in-memory fallback enabled)...');
    app.listen(PORT, () => {
      console.log(`[Server] CytoScan running in isolated local mode at: http://localhost:${PORT}`);
    });
  });
