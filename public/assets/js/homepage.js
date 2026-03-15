const featuredVehiclesContainer = document.getElementById('featuredVehicles');

function renderFeaturedCard(vehicle) {
  const image = vehicle.images && vehicle.images.length ? `/images/${vehicle.images[0]}` : '';

  let badge = 'Featured';
  if (!vehicle.isFeatured) badge = 'Live';

  return `
    <article class="vehicle-card premium-card">
      <a class="vehicle-card-link" href="./vehicle.html?id=${encodeURIComponent(vehicle.id)}">
        <div class="vehicle-image-wrap premium-image-wrap">
          ${
            image
              ? `<img class="vehicle-image" src="${image}" alt="${vehicle.title}" />`
              : `<div class="vehicle-image placeholder"><div class="car-illustration"></div></div>`
          }
          <span class="top-tag">${badge}</span>
        </div>

        <div class="vehicle-card-body">
          <h3>${vehicle.title}</h3>
          <p class="vehicle-meta">${Number(vehicle.mileage || 0).toLocaleString()} km &nbsp;&nbsp; ${vehicle.transmission || ''} &nbsp;&nbsp; ${vehicle.fuelType || ''}</p>

          <div class="price-panels">
            <div class="mini-price-card">
              <span class="label">Current Bid</span>
              <strong>$${Number(vehicle.currentBid || vehicle.startingBid || 0).toLocaleString()}</strong>
            </div>
            <div class="mini-price-card">
              <span class="label">Min Increment</span>
              <strong>$${Number(vehicle.minimumIncrement || 0).toLocaleString()}</strong>
            </div>
          </div>

          <div class="progress-block">
            <span class="progress-label">Auction progress</span>
            <div class="progress-bar"><span></span></div>
          </div>

          <div class="card-actions">
            <span class="btn btn-secondary fake-btn">View Details</span>
            <span class="btn btn-primary fake-btn">Pre-Qualify</span>
          </div>
        </div>
      </a>
    </article>
  `;
}

async function loadHomepageFeatured() {
  try {
    const res = await fetch('/api/content');
    const data = await res.json();

    if (!res.ok) {
      featuredVehiclesContainer.innerHTML = `<div class="error-state">${data.error || 'Failed to load featured vehicles.'}</div>`;
      return;
    }

    const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
    const featured = vehicles.filter(v => v.isVisible).slice(0, 3);

    if (!featured.length) {
      featuredVehiclesContainer.innerHTML = `<div class="empty-state">No featured vehicles available yet.</div>`;
      return;
    }

    featuredVehiclesContainer.innerHTML = featured.map(renderFeaturedCard).join('');
  } catch (error) {
    featuredVehiclesContainer.innerHTML = `<div class="error-state">Failed to load featured vehicles.</div>`;
  }
}

loadHomepageFeatured();
