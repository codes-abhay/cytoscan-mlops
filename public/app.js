// Cell nuclei parameters statistics mapping (from Wisconsin Breast Cancer Dataset)
const FEATURE_STATS = {
  "radius_mean": { "label": "Radius", "mean": 14.127, "max": 28.11, "min": 6.981 },
  "texture_mean": { "label": "Texture", "mean": 19.290, "max": 39.28, "min": 9.71 },
  "perimeter_mean": { "label": "Perimeter", "mean": 91.969, "max": 188.5, "min": 43.79 },
  "area_mean": { "label": "Area", "mean": 654.889, "max": 2501.0, "min": 143.5 },
  "smoothness_mean": { "label": "Smoothness", "mean": 0.096, "max": 0.1634, "min": 0.0526 },
  "compactness_mean": { "label": "Compactness", "mean": 0.104, "max": 0.3454, "min": 0.0194 },
  "concavity_mean": { "label": "Concavity", "mean": 0.089, "max": 0.4268, "min": 0.0 },
  "concave points_mean": { "label": "Concave Points", "mean": 0.049, "max": 0.2012, "min": 0.0 },
  "symmetry_mean": { "label": "Symmetry", "mean": 0.181, "max": 0.304, "min": 0.106 },
  "fractal_dimension_mean": { "label": "Fractal Dim.", "mean": 0.063, "max": 0.0974, "min": 0.0500 },
  
  "radius_se": { "label": "Radius", "mean": 0.405, "max": 2.873, "min": 0.1115 },
  "texture_se": { "label": "Texture", "mean": 1.217, "max": 4.885, "min": 0.3602 },
  "perimeter_se": { "label": "Perimeter", "mean": 2.866, "max": 21.98, "min": 0.757 },
  "area_se": { "label": "Area", "mean": 40.337, "max": 542.2, "min": 6.802 },
  "smoothness_se": { "label": "Smoothness", "mean": 0.007, "max": 0.0311, "min": 0.0017 },
  "compactness_se": { "label": "Compactness", "mean": 0.025, "max": 0.1354, "min": 0.0023 },
  "concavity_se": { "label": "Concavity", "mean": 0.032, "max": 0.396, "min": 0.0 },
  "concave points_se": { "label": "Concave Points", "mean": 0.012, "max": 0.0528, "min": 0.0 },
  "symmetry_se": { "label": "Symmetry", "mean": 0.021, "max": 0.0790, "min": 0.0079 },
  "fractal_dimension_se": { "label": "Fractal Dim.", "mean": 0.0038, "max": 0.0298, "min": 0.0009 },
  
  "radius_worst": { "label": "Radius", "mean": 16.269, "max": 36.04, "min": 7.93 },
  "texture_worst": { "label": "Texture", "mean": 25.677, "max": 49.54, "min": 12.02 },
  "perimeter_worst": { "label": "Perimeter", "mean": 107.261, "max": 251.2, "min": 50.41 },
  "area_worst": { "label": "Area", "mean": 880.583, "max": 4254.0, "min": 185.2 },
  "smoothness_worst": { "label": "Smoothness", "mean": 0.132, "max": 0.2226, "min": 0.0712 },
  "compactness_worst": { "label": "Compactness", "mean": 0.254, "max": 1.058, "min": 0.0273 },
  "concavity_worst": { "label": "Concavity", "mean": 0.272, "max": 1.252, "min": 0.0 },
  "concave points_worst": { "label": "Concave Points", "mean": 0.115, "max": 0.291, "min": 0.0 },
  "symmetry_worst": { "label": "Symmetry", "mean": 0.290, "max": 0.6638, "min": 0.1565 },
  "fractal_dimension_worst": { "label": "Fractal Dim.", "mean": 0.084, "max": 0.2075, "min": 0.0550 }
};

let radarChart = null;

// Page initialization
document.addEventListener("DOMContentLoaded", () => {
  renderSliders();
  initRadarChart();
  fetchHistory();
});

// Dynamic render of sliders categorized by tabs
function renderSliders() {
  const tabs = {
    mean: document.getElementById('tab-mean'),
    se: document.getElementById('tab-se'),
    worst: document.getElementById('tab-worst')
  };

  Object.keys(FEATURE_STATS).forEach(key => {
    let tabType = 'mean';
    if (key.endsWith('_se')) tabType = 'se';
    else if (key.endsWith('_worst')) tabType = 'worst';

    const stat = FEATURE_STATS[key];
    const groupDiv = document.createElement('div');
    groupDiv.className = 'slider-control-group';

    // Step calculation: make sliders smooth
    let step = 0.1;
    if (stat.max < 1.0) step = 0.0001;
    else if (stat.max < 10) step = 0.01;

    groupDiv.innerHTML = `
      <div class="slider-label-info">
        <span class="slider-name">${stat.label} (${tabType})</span>
        <span class="slider-current-val" id="val-${key}">${stat.mean.toFixed(tabType === 'se' && stat.mean < 0.01 ? 4 : 2)}</span>
      </div>
      <div class="slider-wrapper">
        <span class="slider-limit-label">${stat.min}</span>
        <input type="range" id="slider-${key}" 
          min="${stat.min}" 
          max="${stat.max}" 
          step="${step}" 
          value="${stat.mean}" 
          oninput="onSliderChange('${key}', this.value)">
        <span class="slider-limit-label">${stat.max}</span>
      </div>
    `;

    tabs[tabType].appendChild(groupDiv);
  });
}

// Tab Switching Mechanism
function switchTab(tabName) {
  // Toggle Active Buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  // Toggle Active Tabs Contents
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// Slider Input Listener
function onSliderChange(key, value) {
  const numValue = parseFloat(value);
  const formattedVal = key.includes('_se') && numValue < 0.01 ? numValue.toFixed(4) : numValue.toFixed(2);
  document.getElementById(`val-${key}`).innerText = formattedVal;
  
  // Throttle or trigger radar chart update
  updateRadarChart();
}

// Reset Sliders to Mean values
function resetSliders() {
  Object.keys(FEATURE_STATS).forEach(key => {
    const defaultVal = FEATURE_STATS[key].mean;
    const input = document.getElementById(`slider-${key}`);
    if (input) {
      input.value = defaultVal;
      const tabType = key.endsWith('_se') ? 'se' : key.endsWith('_worst') ? 'worst' : 'mean';
      const formattedVal = tabType === 'se' && defaultVal < 0.01 ? defaultVal.toFixed(4) : defaultVal.toFixed(2);
      document.getElementById(`val-${key}`).innerText = formattedVal;
    }
  });
  updateRadarChart();
}

// Gather all sliders values
function getSliderValues() {
  const values = {};
  Object.keys(FEATURE_STATS).forEach(key => {
    const input = document.getElementById(`slider-${key}`);
    values[key] = parseFloat(input ? input.value : FEATURE_STATS[key].mean);
  });
  return values;
}

// Min-Max Scale a value strictly between 0 and 1 for radar display
function getRadarScaledValue(key, val) {
  const bounds = FEATURE_STATS[key];
  return (val - bounds.min) / (bounds.max - bounds.min);
}

// Initialize the ChartJS Radar element
function initRadarChart() {
  const ctx = document.getElementById('radarChart').getContext('2d');
  
  const labels = ['Radius', 'Texture', 'Perimeter', 'Area', 'Smoothness', 'Compactness', 'Concavity', 'Concave Points', 'Symmetry', 'Fractal Dim.'];
  
  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Mean Measurements',
          data: new Array(10).fill(0.5),
          backgroundColor: 'rgba(14, 165, 233, 0.15)',
          borderColor: 'rgba(14, 165, 233, 0.8)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(14, 165, 233, 1)',
          pointRadius: 3
        },
        {
          label: 'Standard Error (se)',
          data: new Array(10).fill(0.2),
          backgroundColor: 'rgba(20, 184, 166, 0.1)',
          borderColor: 'rgba(20, 184, 166, 0.7)',
          borderWidth: 1.5,
          pointBackgroundColor: 'rgba(20, 184, 166, 1)',
          pointRadius: 2.5
        },
        {
          label: 'Worst Measurements',
          data: new Array(10).fill(0.6),
          backgroundColor: 'rgba(168, 85, 247, 0.12)',
          borderColor: 'rgba(168, 85, 247, 0.75)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(168, 85, 247, 1)',
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          angleLines: {
            color: 'rgba(255, 255, 255, 0.08)'
          },
          pointLabels: {
            color: '#9ca3af',
            font: {
              family: 'Plus Jakarta Sans',
              size: 9,
              weight: '600'
            }
          },
          ticks: {
            display: false,
            maxTicksLimit: 5
          },
          suggestedMin: 0,
          suggestedMax: 1
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#d1d5db',
            font: {
              family: 'Plus Jakarta Sans',
              size: 10,
              weight: '500'
            },
            boxWidth: 12
          }
        }
      }
    }
  });

  updateRadarChart();
}

// Update radar dataset based on active slider inputs
function updateRadarChart() {
  if (!radarChart) return;

  const currentValues = getSliderValues();

  // Categories in exact order matching chart labels
  const baseKeys = ['radius', 'texture', 'perimeter', 'area', 'smoothness', 'compactness', 'concavity', 'concave points', 'symmetry', 'fractal_dimension'];

  // Map and scale values for each dataset
  const meanData = baseKeys.map(key => getRadarScaledValue(`${key}_mean`, currentValues[`${key}_mean`]));
  const seData = baseKeys.map(key => getRadarScaledValue(`${key}_se`, currentValues[`${key}_se`]));
  const worstData = baseKeys.map(key => getRadarScaledValue(`${key}_worst`, currentValues[`${key}_worst`]));

  radarChart.data.datasets[0].data = meanData;
  radarChart.data.datasets[1].data = seData;
  radarChart.data.datasets[2].data = worstData;
  radarChart.update('none'); // silent update (no performance-heavy animations on slide)
}

// Trigger REST server prediction
async function runDiagnosis() {
  const diagnoseBtn = document.getElementById('diagnose-btn');
  diagnoseBtn.disabled = true;
  diagnoseBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...`;

  const patientName = document.getElementById('patient-name').value;
  const metrics = getSliderValues();

  try {
    const response = await fetch('/api/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        patientName: patientName,
        cellMetrics: metrics
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'API request failed');
    }

    // Success response! Update UI cards
    updateInferenceUI(result);
    fetchHistory(); // Refresh diagnostic logs

  } catch (error) {
    console.error('[API Error] Run Diagnosis failed:', error);
    alert('Error running model inference: ' + error.message);
  } finally {
    diagnoseBtn.disabled = false;
    diagnoseBtn.innerHTML = `<i class="fa-solid fa-shield-heart"></i> Run Model Inference`;
  }
}

// Render dynamic results onto Prediction and Recommendation elements
function updateInferenceUI(data) {
  const pBox = document.getElementById('prediction-box');
  const pText = document.getElementById('prediction-text');
  const pBadge = document.getElementById('diagnostic-badge');
  
  const mText = document.getElementById('prob-malignant-text');
  const mFill = document.getElementById('prob-malignant-fill');
  const bText = document.getElementById('prob-benign-text');
  const bFill = document.getElementById('prob-benign-fill');
  
  const rBox = document.getElementById('recommendation-box');
  const rText = document.getElementById('recommendation-text');

  // Reset classes
  pText.className = "";
  pBadge.className = "diagnostic-badge";
  rBox.className = "clinical-recommendation-box";

  const pMalignant = data.probabilityMalignant * 100;
  const pBenign = data.probabilityBenign * 100;

  // Set probability display bars
  mText.innerText = `${pMalignant.toFixed(2)}%`;
  mFill.style.width = `${pMalignant}%`;
  bText.innerText = `${pBenign.toFixed(2)}%`;
  bFill.style.width = `${pBenign}%`;

  if (data.prediction === 'Malignant') {
    // Malignant setup
    pText.innerText = "MALIGNANT";
    pText.className = "prediction-text-malignant";
    pBadge.innerText = "CRITICAL PATHOLOGY";
    pBadge.classList.add('malignant');
    
    rBox.classList.add('malignant');
    rText.innerHTML = `<strong>Clinical Warning:</strong> The Logistic Regression model predicts with <strong>${pMalignant.toFixed(1)}% certainty</strong> that the biopsy exhibits malignant properties. Feature importances suggest immediate oncological review and histopathological confirmation are required.`;
    
    // Animate prediction box boundary glow
    pBox.style.boxShadow = "0 0 20px rgba(239, 68, 68, 0.15)";
    pBox.style.borderColor = "rgba(239, 68, 68, 0.3)";
  } else {
    // Benign setup
    pText.innerText = "BENIGN";
    pText.className = "prediction-text-benign";
    pBadge.innerText = "NORMAL TISSUE";
    pBadge.classList.add('benign');
    
    rBox.classList.add('benign');
    rText.innerHTML = `<strong>Clinical Report:</strong> The model classifies this tissue sample as benign with <strong>${pBenign.toFixed(1)}% certainty</strong>. Measurements fall inside standard biological ranges. Standard patient monitoring recommended.`;
    
    // Animate prediction box boundary glow
    pBox.style.boxShadow = "0 0 20px rgba(16, 185, 129, 0.15)";
    pBox.style.borderColor = "rgba(16, 185, 129, 0.3)";
  }
}

// Pull historical logged diagnoses from MongoDB
async function fetchHistory() {
  try {
    const response = await fetch('/api/history');
    const result = await response.json();

    if (!response.ok) throw new Error(result.message);

    const rowsContainer = document.getElementById('history-rows');
    rowsContainer.innerHTML = "";

    if (result.history.length === 0) {
      rowsContainer.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">No diagnostic sessions logged in active database.</td>
        </tr>
      `;
      return;
    }

    result.history.forEach(log => {
      const dateStr = new Date(log.createdAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const badgeClass = log.prediction === 'Malignant' ? 'badge-malignant' : 'badge-benign';
      const percentageStr = `${(log.probability * 100).toFixed(1)}%`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600;">${escapeHTML(log.patientName)}</td>
        <td>${dateStr}</td>
        <td><span class="${badgeClass}">${log.prediction}</span></td>
        <td style="font-weight:700;">${percentageStr}</td>
      `;
      rowsContainer.appendChild(tr);
    });

  } catch (error) {
    console.error('[API Error] Fetch History failed:', error);
  }
}

// XSS Escaper Helper
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
