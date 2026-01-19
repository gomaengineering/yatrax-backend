// middleware/appValidator.js

/**
 * App-specific request validation middleware
 * Validates body, params, and query parameters
 * Returns consistent app error format
 */

/**
 * Validate request body
 * @param {Object} schema - Validation schema with field rules
 * @returns {Function} Express middleware
 */
export const validateBody = (schema) => {
  return (req, res, next) => {
    const errors = {};

    // Check if schema is provided
    if (!schema || typeof schema !== "object") {
      return next();
    }

    // Validate each field in schema
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];
      const fieldErrors = [];

      // Required validation
      if (rules.required && (value === undefined || value === null || value === "")) {
        fieldErrors.push(`${field} is required`);
      }

      // Skip other validations if field is not required and not provided
      if (!rules.required && (value === undefined || value === null || value === "")) {
        continue;
      }

      // Type validation
      if (value !== undefined && value !== null && value !== "") {
        if (rules.type) {
          const expectedType = rules.type.toLowerCase();
          const actualType = Array.isArray(value) ? "array" : typeof value;

          if (expectedType === "number" && isNaN(value)) {
            fieldErrors.push(`${field} must be a number`);
          } else if (expectedType === "integer" && (!Number.isInteger(Number(value)) || isNaN(value))) {
            fieldErrors.push(`${field} must be an integer`);
          } else if (expectedType === "string" && typeof value !== "string") {
            fieldErrors.push(`${field} must be a string`);
          } else if (expectedType === "boolean" && typeof value !== "boolean") {
            fieldErrors.push(`${field} must be a boolean`);
          } else if (expectedType === "array" && !Array.isArray(value)) {
            fieldErrors.push(`${field} must be an array`);
          } else if (expectedType === "object" && (typeof value !== "object" || Array.isArray(value))) {
            fieldErrors.push(`${field} must be an object`);
          }
        }

        // String validations
        if (typeof value === "string" && rules.type === "string") {
          // Min length
          if (rules.minLength !== undefined && value.trim().length < rules.minLength) {
            fieldErrors.push(`${field} must be at least ${rules.minLength} characters`);
          }

          // Max length
          if (rules.maxLength !== undefined && value.trim().length > rules.maxLength) {
            fieldErrors.push(`${field} must be at most ${rules.maxLength} characters`);
          }

          // Pattern (regex)
          if (rules.pattern && !rules.pattern.test(value)) {
            fieldErrors.push(rules.patternMessage || `${field} format is invalid`);
          }

          // Enum
          if (rules.enum && !rules.enum.includes(value)) {
            fieldErrors.push(`${field} must be one of: ${rules.enum.join(", ")}`);
          }
        }

        // Number validations
        if ((rules.type === "number" || rules.type === "integer") && !isNaN(value)) {
          const numValue = Number(value);

          // Min value
          if (rules.min !== undefined && numValue < rules.min) {
            fieldErrors.push(`${field} must be at least ${rules.min}`);
          }

          // Max value
          if (rules.max !== undefined && numValue > rules.max) {
            fieldErrors.push(`${field} must be at most ${rules.max}`);
          }
        }

        // Array validations
        if (Array.isArray(value) && rules.type === "array") {
          // Min items
          if (rules.minItems !== undefined && value.length < rules.minItems) {
            fieldErrors.push(`${field} must have at least ${rules.minItems} items`);
          }

          // Max items
          if (rules.maxItems !== undefined && value.length > rules.maxItems) {
            fieldErrors.push(`${field} must have at most ${rules.maxItems} items`);
          }

          // Array item type
          if (rules.items && value.length > 0) {
            value.forEach((item, index) => {
              if (rules.items.type === "string" && typeof item !== "string") {
                fieldErrors.push(`${field}[${index}] must be a string`);
              } else if (rules.items.type === "number" && isNaN(item)) {
                fieldErrors.push(`${field}[${index}] must be a number`);
              }
            });
          }
        }
      }

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    }

    // Check for unknown fields (if whitelist is enabled)
    if (schema._whitelist) {
      const allowedFields = Object.keys(schema).filter((key) => key !== "_whitelist");
      const providedFields = Object.keys(req.body);
      const unknownFields = providedFields.filter((field) => !allowedFields.includes(field));

      if (unknownFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Unknown fields: ${unknownFields.join(", ")}`,
          error: {
            code: "VALIDATION_ERROR",
            type: "validation_error",
            errors: {
              _unknown: [`Unknown fields: ${unknownFields.join(", ")}`],
            },
          },
        });
      }
    }

    // Return validation errors if any
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: {
          code: "VALIDATION_ERROR",
          type: "validation_error",
          errors,
        },
      });
    }

    next();
  };
};

/**
 * Validate request query parameters
 * @param {Object} schema - Validation schema with field rules
 * @returns {Function} Express middleware
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const errors = {};

    if (!schema || typeof schema !== "object") {
      return next();
    }

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.query[field];
      const fieldErrors = [];

      // Required validation
      if (rules.required && (value === undefined || value === null || value === "")) {
        fieldErrors.push(`${field} is required`);
      }

      // Skip other validations if field is not required and not provided
      if (!rules.required && (value === undefined || value === null || value === "")) {
        continue;
      }

      // Type validation
      if (value !== undefined && value !== null && value !== "") {
        if (rules.type === "number" || rules.type === "integer") {
          const numValue = Number(value);
          if (isNaN(numValue)) {
            fieldErrors.push(`${field} must be a number`);
          } else {
            if (rules.type === "integer" && !Number.isInteger(numValue)) {
              fieldErrors.push(`${field} must be an integer`);
            }
            if (rules.min !== undefined && numValue < rules.min) {
              fieldErrors.push(`${field} must be at least ${rules.min}`);
            }
            if (rules.max !== undefined && numValue > rules.max) {
              fieldErrors.push(`${field} must be at most ${rules.max}`);
            }
          }
        }

        if (rules.type === "string") {
          if (rules.enum && !rules.enum.includes(value)) {
            fieldErrors.push(`${field} must be one of: ${rules.enum.join(", ")}`);
          }
        }

        if (rules.type === "boolean") {
          if (value !== "true" && value !== "false" && value !== true && value !== false) {
            fieldErrors.push(`${field} must be a boolean`);
          }
        }
      }

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Query parameter validation failed",
        error: {
          code: "VALIDATION_ERROR",
          type: "validation_error",
          errors,
        },
      });
    }

    next();
  };
};

/**
 * Validate request URL parameters
 * @param {Object} schema - Validation schema with field rules
 * @returns {Function} Express middleware
 */
export const validateParams = (schema) => {
  return (req, res, next) => {
    const errors = {};

    if (!schema || typeof schema !== "object") {
      return next();
    }

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.params[field];
      const fieldErrors = [];

      // Required validation
      if (rules.required && (value === undefined || value === null || value === "")) {
        fieldErrors.push(`${field} is required`);
      }

      // Skip other validations if field is not required and not provided
      if (!rules.required && (value === undefined || value === null || value === "")) {
        continue;
      }

      // Type validation
      if (value !== undefined && value !== null && value !== "") {
        if (rules.type === "string") {
          // MongoDB ObjectId validation
          if (rules.isObjectId) {
            const objectIdPattern = /^[0-9a-fA-F]{24}$/;
            if (!objectIdPattern.test(value)) {
              fieldErrors.push(`${field} must be a valid MongoDB ObjectId`);
            }
          }

          // Min/Max length
          if (rules.minLength !== undefined && value.length < rules.minLength) {
            fieldErrors.push(`${field} must be at least ${rules.minLength} characters`);
          }
          if (rules.maxLength !== undefined && value.length > rules.maxLength) {
            fieldErrors.push(`${field} must be at most ${rules.maxLength} characters`);
          }
        }
      }

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "URL parameter validation failed",
        error: {
          code: "VALIDATION_ERROR",
          type: "validation_error",
          errors,
        },
      });
    }

    next();
  };
};

/**
 * Combine multiple validators
 * @param {...Function} validators - Validation middleware functions
 * @returns {Function} Combined Express middleware
 */
export const validate = (...validators) => {
  return (req, res, next) => {
    let currentIndex = 0;

    const runNext = () => {
      if (currentIndex >= validators.length) {
        return next();
      }

      const validator = validators[currentIndex++];
      validator(req, res, (err) => {
        if (err) {
          return next(err);
        }
        if (res.headersSent) {
          return; // Validation failed and response was sent
        }
        runNext();
      });
    };

    runNext();
  };
};

