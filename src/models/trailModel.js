// models/trailModel.js
import mongoose from "mongoose";

const trailSchema = new mongoose.Schema(
  {
    // GeoJSON Feature structure - matches exact GeoJSON Feature format
    type: {
      type: String,
      enum: ["Feature"],
      default: "Feature",
      required: true,
    },
    // GeoJSON properties - contains: fid, id, name, difficulty (numeric), potato
    properties: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      required: true,
    },
    // GeoJSON geometry
    geometry: {
      type: {
        type: String,
        enum: ["Point", "LineString", "Polygon", "MultiPoint", "MultiLineString", "MultiPolygon"],
        required: [true, "Geometry type is required"],
      },
      coordinates: {
        type: mongoose.Schema.Types.Mixed,
        required: [true, "Coordinates are required"],
      },
    },
  },
  { timestamps: true }
);

// Create 2dsphere index on geometry field for geospatial queries
trailSchema.index({ geometry: "2dsphere" });

// Index for common queries on properties
trailSchema.index({ "properties.fid": 1 });
trailSchema.index({ "properties.id": 1 });
trailSchema.index({ "properties.name": 1 });

// Validation method to ensure valid GeoJSON structure
trailSchema.methods.validateGeoJSON = function () {
  if (this.type !== "Feature") {
    throw new Error("Type must be 'Feature'");
  }

  if (!this.geometry || !this.geometry.type || !this.geometry.coordinates) {
    throw new Error("Invalid geometry structure");
  }

  const validTypes = ["Point", "LineString", "Polygon", "MultiPoint", "MultiLineString", "MultiPolygon"];
  if (!validTypes.includes(this.geometry.type)) {
    throw new Error(`Invalid geometry type: ${this.geometry.type}`);
  }

  // Validate coordinates based on geometry type
  this.validateCoordinates(this.geometry.type, this.geometry.coordinates);
};

// Helper method to validate coordinates
trailSchema.methods.validateCoordinates = function (type, coordinates) {
  if (!Array.isArray(coordinates)) {
    throw new Error("Coordinates must be an array");
  }

  switch (type) {
    case "Point":
      if (coordinates.length !== 2 || typeof coordinates[0] !== "number" || typeof coordinates[1] !== "number") {
        throw new Error("Point coordinates must be [longitude, latitude]");
      }
      if (coordinates[0] < -180 || coordinates[0] > 180) {
        throw new Error("Longitude must be between -180 and 180");
      }
      if (coordinates[1] < -90 || coordinates[1] > 90) {
        throw new Error("Latitude must be between -90 and 90");
      }
      break;

    case "LineString":
      if (coordinates.length < 2) {
        throw new Error("LineString must have at least 2 points");
      }
      coordinates.forEach((coord) => {
        if (!Array.isArray(coord) || coord.length !== 2) {
          throw new Error("LineString coordinates must be array of [longitude, latitude]");
        }
      });
      break;

    case "Polygon":
      if (coordinates.length === 0) {
        throw new Error("Polygon must have at least one ring");
      }
      coordinates.forEach((ring) => {
        if (!Array.isArray(ring) || ring.length < 4) {
          throw new Error("Polygon ring must be an array with at least 4 points");
        }
        // First and last points must be the same
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          throw new Error("Polygon ring must be closed (first and last points must be the same)");
        }
      });
      break;

    case "MultiPoint":
      coordinates.forEach((coord) => {
        if (!Array.isArray(coord) || coord.length !== 2) {
          throw new Error("MultiPoint coordinates must be array of [longitude, latitude]");
        }
      });
      break;

    case "MultiLineString":
      coordinates.forEach((lineString) => {
        if (!Array.isArray(lineString) || lineString.length < 2) {
          throw new Error("MultiLineString must contain LineStrings with at least 2 points");
        }
      });
      break;

    case "MultiPolygon":
      coordinates.forEach((polygon) => {
        if (!Array.isArray(polygon) || polygon.length === 0) {
          throw new Error("MultiPolygon must contain valid polygons");
        }
      });
      break;
  }
};

// Pre-save hook to validate GeoJSON structure
trailSchema.pre("save", function (next) {
  try {
    // Validate GeoJSON structure
    this.validateGeoJSON();

    // Ensure properties object exists
    if (!this.properties || typeof this.properties !== "object") {
      this.properties = {};
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Static method to create Trail from GeoJSON Feature
trailSchema.statics.fromGeoJSONFeature = function(feature) {
  if (!feature || feature.type !== 'Feature') {
    throw new Error('Invalid GeoJSON Feature: must have type "Feature"');
  }

  return new this({
    type: 'Feature',
    geometry: feature.geometry,
    properties: feature.properties || {},
  });
};

// Static method to create multiple Trails from GeoJSON FeatureCollection
trailSchema.statics.fromGeoJSONFeatureCollection = function(featureCollection) {
  if (!featureCollection || featureCollection.type !== 'FeatureCollection') {
    throw new Error('Invalid GeoJSON FeatureCollection: must have type "FeatureCollection"');
  }

  if (!Array.isArray(featureCollection.features)) {
    throw new Error('Invalid GeoJSON FeatureCollection: features must be an array');
  }

  return featureCollection.features.map((feature) => {
    return this.fromGeoJSONFeature(feature);
  });
};

// Instance method to convert Trail to GeoJSON Feature format
trailSchema.methods.toGeoJSONFeature = function() {
  return {
    type: 'Feature',
    geometry: this.geometry,
    properties: this.properties || {},
  };
};

const Trail = mongoose.model("Trail", trailSchema);
export default Trail;

