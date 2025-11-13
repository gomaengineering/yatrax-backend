// trailListComponent.js
// Component for displaying and managing trail list

class TrailListComponent {
  constructor(apiBaseUrl, mapInstance, displayGeoJSONCallback) {
    this.apiBaseUrl = apiBaseUrl;
    this.map = mapInstance;
    this.displayGeoJSON = displayGeoJSONCallback;
    this.trails = [];
    this.selectedTrailId = null;
  }

  // Fetch trails from API
  async fetchTrails() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/trails?limit=100`);
      const data = await response.json();

      if (data.success && data.trails) {
        this.trails = data.trails;
        return { success: true, trails: data.trails, error: null };
      } else {
        return { success: false, trails: [], error: data.message || 'Failed to fetch trails' };
      }
    } catch (error) {
      console.error('Error fetching trails:', error);
      return { success: false, trails: [], error: error.message };
    }
  }

  // Render trail list
  render(trails) {
    const container = document.getElementById('trailListContainer');
    if (!container) return;

    if (!trails || trails.length === 0) {
      container.innerHTML = `
        <div class="trail-list-empty">
          <p>No trails found in the database.</p>
          <p class="trail-list-hint">Create trails using the API to see them here.</p>
        </div>
      `;
      return;
    }

    const trailsHtml = trails.map(trail => {
      const difficulty = trail.difficulty || 'N/A';
      const length = trail.length ? `${trail.length} km` : 'N/A';
      const elevation = trail.elevation ? `${trail.elevation} m` : 'N/A';
      const guideName = trail.guideId 
        ? `${trail.guideId.firstName || ''} ${trail.guideId.lastName || ''}`.trim()
        : 'No guide';
      const isActive = trail.isActive !== false;
      const isSelected = this.selectedTrailId === trail._id;

      return `
        <div class="trail-item ${isSelected ? 'trail-item-selected' : ''}" 
             data-trail-id="${trail._id}"
             onclick="trailListComponent.selectTrail('${trail._id}')">
          <div class="trail-item-header">
            <h4 class="trail-item-name">${trail.name || 'Unnamed Trail'}</h4>
            <span class="trail-item-status ${isActive ? 'status-active' : 'status-inactive'}">
              ${isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          ${trail.description ? `<p class="trail-item-description">${trail.description}</p>` : ''}
          <div class="trail-item-details">
            <span class="trail-detail">
              <strong>Difficulty:</strong> ${difficulty}
            </span>
            <span class="trail-detail">
              <strong>Length:</strong> ${length}
            </span>
            <span class="trail-detail">
              <strong>Elevation:</strong> ${elevation}
            </span>
            ${guideName !== 'No guide' ? `
              <span class="trail-detail">
                <strong>Guide:</strong> ${guideName}
              </span>
            ` : ''}
          </div>
          <div class="trail-item-geometry">
            <small>Type: ${trail.geometry?.type || 'N/A'}</small>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="trail-list-header">
        <h3>🗺️ Trails from Database</h3>
        <button class="refresh-trails-btn" onclick="trailListComponent.loadTrails()" title="Refresh trails">
          🔄 Refresh
        </button>
      </div>
      <div class="trail-list-stats">
        <span>Total: ${trails.length} trail${trails.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="trail-list-items">
        ${trailsHtml}
      </div>
    `;
  }

  // Select and display a trail on the map
  selectTrail(trailId) {
    const trail = this.trails.find(t => t._id === trailId);
    if (!trail) return;

    this.selectedTrailId = trailId;

    // Update UI
    this.updateSelectedState();

    // Convert trail to GeoJSON Feature format
    const geoJsonFeature = {
      type: 'Feature',
      geometry: trail.geometry,
      properties: {
        name: trail.name,
        description: trail.description,
        difficulty: trail.difficulty,
        length: trail.length,
        elevation: trail.elevation,
        ...trail.properties
      }
    };

    // Display on map
    if (this.displayGeoJSON) {
      this.displayGeoJSON(geoJsonFeature);
    }

    // Scroll to top of trail list
    const container = document.getElementById('trailListContainer');
    if (container) {
      container.scrollTop = 0;
    }
  }

  // Update selected state in UI
  updateSelectedState() {
    const items = document.querySelectorAll('.trail-item');
    items.forEach(item => {
      const trailId = item.getAttribute('data-trail-id');
      if (trailId === this.selectedTrailId) {
        item.classList.add('trail-item-selected');
      } else {
        item.classList.remove('trail-item-selected');
      }
    });
  }

  // Load and display trails
  async loadTrails() {
    const container = document.getElementById('trailListContainer');
    if (!container) return;

    // Show loading state
    container.innerHTML = `
      <div class="trail-list-loading">
        <p>⏳ Loading trails...</p>
      </div>
    `;

    const result = await this.fetchTrails();

    if (result.success) {
      this.render(result.trails);
    } else {
      container.innerHTML = `
        <div class="trail-list-error">
          <p>❌ Error loading trails</p>
          <p class="trail-list-error-message">${result.error || 'Unknown error'}</p>
          <button class="retry-btn" onclick="trailListComponent.loadTrails()">Retry</button>
        </div>
      `;
    }
  }

  // Clear selection
  clearSelection() {
    this.selectedTrailId = null;
    this.updateSelectedState();
  }
}

// Export for use in index.html
window.TrailListComponent = TrailListComponent;

