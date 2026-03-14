const featuredVehiclesContainer = document.getElementById('featuredVehicles');

function getAuctionStatus(vehicle) {
  const now = Date.now();
  const start = new Date(vehicle.auctionStart).getTime();
  const end = new Date(vehicle.auctionEnd).getTime();

  if (!vehicle.isVisible) return 'hidden';
  if (now < start) return 'scheduled';
  if (now > end) return 'ended';
  return 'live';
}

function renderFeaturedCard(vehicle) {
  const image = vehicle.images && vehicle.images.length ? `/images/${vehicle.images[0]}` : '';
  const status = getAuctionStatus(vehicle);

  return `
    <article class="vehicle-card">
      <a class="vehicle-card-link" href="./vehicle.html?id=${encodeURIComponent(vehicle.id)}">
        <div class="vehicle-image-wrap">
          ${
            image
              ? `<img class="vehicle-image" src="${image}" alt="${vehicle.title}" />`
              : `<div class="vehicle-image placeholder">No Image</div>`
          }
          <span class="status-badge status-${status}">${status}</span>
        </div>

        <div class="vehicle-card-body">
          <h3>${vehicle.title}</h3>
          <p class="vehicle-meta">${vehicle.year} • ${vehicle.make} • ${vehicle.model}</p>
          <p class="vehicle-meta">Current Bid: $${Number(vehicle.currentBid || vehicle.startingBid || 0).toLocaleString()}</p>
        </div>
      </a>
    </article>
  `;
}

async function loadHomepageFeatured() {
  try {
    const res = await fetch('/api/content');
    const data = await res.json();
    const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
    const featured = vehicles.filter(v => v.isVisible && v.isFeatured).slice(0, 3);

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
