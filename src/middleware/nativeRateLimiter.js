// middleware/nativeRateLimiter.js
// In-memory rate limiting for native APIs
// Note: For production, consider using express-rate-limit or Redis-based solution

// Store for rate limit data: { key: { count: number, resetTime: number } }
const rateLimitStore = new Map();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Create a rate limiter middleware
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {Function} options.keyGenerator - Function to generate rate limit key
 * @param {string} options.errorCode - Error code for rate limit exceeded
 * @param {string} options.errorMessage - Error message for rate limit exceeded
 * @returns {Function} Express middleware
 */
const createRateLimiter = (options) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes default
    max = 100, // 100 requests default
    keyGenerator = (req) => req.ip || req.connection.remoteAddress || "unknown",
    errorCode = "RATE_LIMIT_EXCEEDED",
    errorMessage = "Too many requests, please try again later.",
  } = options;

  return (req, res, next) => {
    try {
      const key = keyGenerator(req);
      const now = Date.now();
      const record = rateLimitStore.get(key);

      if (!record || record.resetTime < now) {
        // Create new record or reset expired one
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + windowMs,
        });
        return next();
      }

      // Increment count
      record.count += 1;

      if (record.count > max) {
        // Rate limit exceeded
        const retryAfter = Math.ceil((record.resetTime - now) / 1000); // seconds

        // Set rate limit headers
        res.set({
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": max.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(record.resetTime).toISOString(),
        });

        return res.status(429).json({
          success: false,
          message: errorMessage,
          error: {
            code: errorCode,
            type: "rate_limit_error",
            retryAfter: `${Math.ceil(retryAfter / 60)} minutes`,
          },
        });
      }

      // Set rate limit headers for successful requests
      res.set({
        "X-RateLimit-Limit": max.toString(),
        "X-RateLimit-Remaining": (max - record.count).toString(),
        "X-RateLimit-Reset": new Date(record.resetTime).toISOString(),
      });

      next();
    } catch (error) {
      console.error("Rate limiter error:", error);
      // On error, allow request to proceed (fail open)
      next();
    }
  };
};

/**
 * General rate limiter for app APIs
 * Prevents abuse of API endpoints
 */
export const nativeRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  errorCode: "RATE_LIMIT_EXCEEDED",
  errorMessage: "Too many requests from this IP, please try again later.",
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute-force login attempts
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each identifier to 5 login attempts per window
  keyGenerator: (req) => {
    // Use email from body if available for more specific limiting
    const identifier = req.body?.email || req.ip || req.connection.remoteAddress || "unknown";
    return `auth:${identifier}`;
  },
  errorCode: "AUTH_RATE_LIMIT_EXCEEDED",
  errorMessage: "Too many login attempts. Please try again after 15 minutes.",
});

/**
 * Refresh token rate limiter
 * Prevents abuse of token refresh endpoint
 */
export const refreshTokenRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 refresh attempts per window
  errorCode: "REFRESH_RATE_LIMIT_EXCEEDED",
  errorMessage: "Too many token refresh attempts. Please try again after 15 minutes.",
});

