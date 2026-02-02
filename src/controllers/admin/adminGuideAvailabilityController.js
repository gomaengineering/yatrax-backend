// controllers/admin/adminGuideAvailabilityController.js
import mongoose from "mongoose";
import Guide from "../../models/guideModel.js";
import GuideAvailability from "../../models/guideAvailabilityModel.js";

const VALID_STATUSES = ["available", "not available"];
const DEFAULT_STATUS = "available";

/** Normalize date to start of day UTC */
function toStartOfDayUTC(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Format date as YYYY-MM-DD */
function formatDateKey(date) {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

/** Get all calendar days between from and to (inclusive) */
function getDaysInRange(fromDate, toDate) {
  const days = [];
  const from = toStartOfDayUTC(fromDate);
  const to = toStartOfDayUTC(toDate);
  const current = new Date(from);
  while (current <= to) {
    days.push(formatDateKey(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
}

/**
 * GET guide availability (calendar) for a date range.
 * Admin can view any guide's availability.
 * Query: from (YYYY-MM-DD), to (YYYY-MM-DD).
 */
export const getGuideAvailability = async (req, res) => {
  try {
    const { id: guideId } = req.params;
    const { from, to } = req.query;

    if (!mongoose.Types.ObjectId.isValid(guideId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid guide ID",
      });
    }

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "Query params 'from' and 'to' (YYYY-MM-DD) are required",
      });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const start = toStartOfDayUTC(fromDate);
    const end = toStartOfDayUTC(toDate);
    if (start > end) {
      return res.status(400).json({
        success: false,
        message: "'from' must be before or equal to 'to'",
      });
    }

    const guide = await Guide.findById(guideId);
    if (!guide) {
      return res.status(404).json({
        success: false,
        message: "Guide not found",
      });
    }

    const records = await GuideAvailability.find({
      guide: guideId,
      date: { $gte: start, $lte: end },
    }).lean();

    const statusByDate = {};
    records.forEach((r) => {
      statusByDate[formatDateKey(r.date)] = r.status;
    });

    const calendar = getDaysInRange(start, end).map((dateKey) => ({
      date: dateKey,
      status: statusByDate[dateKey] ?? DEFAULT_STATUS,
    }));

    res.status(200).json({
      success: true,
      guideId,
      from: formatDateKey(start),
      to: formatDateKey(end),
      calendar,
    });
  } catch (error) {
    console.error("Get guide availability error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * SET guide availability.
 * Admin can set any guide's availability.
 * Body: single date  -> { date: "YYYY-MM-DD", status, note? }
 *       range       -> { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD", status, note? }
 *       multiple    -> { dates: ["YYYY-MM-DD", ...], status, note? }
 */
export const setGuideAvailability = async (req, res) => {
  try {
    const { id: guideId } = req.params;
    const { date, startDate, endDate, dates, status, note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(guideId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid guide ID",
      });
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status is required and must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const guide = await Guide.findById(guideId);
    if (!guide) {
      return res.status(404).json({
        success: false,
        message: "Guide not found",
      });
    }

    let dateKeys = [];

    if (date) {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD",
        });
      }
      dateKeys.push(formatDateKey(d));
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid startDate or endDate. Use YYYY-MM-DD",
        });
      }
      const from = toStartOfDayUTC(start);
      const to = toStartOfDayUTC(end);
      if (from > to) {
        return res.status(400).json({
          success: false,
          message: "startDate must be before or equal to endDate",
        });
      }
      dateKeys = getDaysInRange(from, to);
    } else if (Array.isArray(dates) && dates.length > 0) {
      for (const dStr of dates) {
        const d = new Date(dStr);
        if (isNaN(d.getTime())) {
          return res.status(400).json({
            success: false,
            message: `Invalid date in array: ${dStr}. Use YYYY-MM-DD`,
          });
        }
        dateKeys.push(formatDateKey(d));
      }
    } else {
      return res.status(400).json({
        success: false,
        message:
          "Provide one of: date (single), startDate + endDate (range), or dates (array)",
      });
    }

    const bulkOps = dateKeys.map((dateKey) => {
      const [y, m, d] = dateKey.split("-").map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d));
      return {
        updateOne: {
          filter: { guide: new mongoose.Types.ObjectId(guideId), date: dateObj },
          update: { $set: { status, ...(note != null && { note }) } },
          upsert: true,
        },
      };
    });

    await GuideAvailability.bulkWrite(bulkOps);

    res.status(200).json({
      success: true,
      message: "Availability updated",
      guideId,
      updated: dateKeys.length,
      dates: dateKeys,
    });
  } catch (error) {
    console.error("Set guide availability error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
