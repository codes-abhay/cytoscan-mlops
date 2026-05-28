const { body, validationResult } = require('express-validator');

// List of the exact 30 cell nuclei parameters expected by the model
const EXPECTED_FEATURES = [
  "radius_mean", "texture_mean", "perimeter_mean", "area_mean", "smoothness_mean",
  "compactness_mean", "concavity_mean", "concave points_mean", "symmetry_mean",
  "fractal_dimension_mean", "radius_se", "texture_se", "perimeter_se", "area_se",
  "smoothness_se", "compactness_se", "concavity_se", "concave points_se",
  "symmetry_se", "fractal_dimension_se", "radius_worst", "texture_worst",
  "perimeter_worst", "area_worst", "smoothness_worst", "compactness_worst",
  "concavity_worst", "concave points_worst", "symmetry_worst", "fractal_dimension_worst"
];

// Validation rules generator
const validatePatientMetrics = [
  // Validate that cellMetrics object is provided
  body('cellMetrics')
    .exists().withMessage('cellMetrics object is required')
    .isObject().withMessage('cellMetrics must be a valid JSON object'),
  
  // Dynamically attach validations for all 30 parameters inside cellMetrics
  ...EXPECTED_FEATURES.map(feature => {
    return body(`cellMetrics.${feature}`)
      .exists().withMessage(`Parameter '${feature}' is required`)
      .isFloat({ min: 0 }).withMessage(`Parameter '${feature}' must be a positive decimal float number`);
  }),

  // Optional Patient Name validation
  body('patientName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Patient name must be between 1 and 100 characters')
    .escape(),

  // Custom validation result middleware reporter
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient cytology data provided.",
        errors: errors.array().map(err => ({ field: err.path, error: err.msg }))
      });
    }
    next();
  }
];

module.exports = {
  validatePatientMetrics,
  EXPECTED_FEATURES
};
