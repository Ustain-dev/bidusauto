const adminLoginView = document.getElementById('adminLoginView');
const adminAppView = document.getElementById('adminAppView');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminLoginMessage = document.getElementById('adminLoginMessage');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');

const vehicleForm = document.getElementById('vehicleForm');
const saveMessage = document.getElementById('saveMessage');
const refreshVehiclesBtn = document.getElementById('refreshVehiclesBtn');
const adminVehiclesList = document.getElementById('adminVehiclesList');
const vehicleImagesInput = document.getElementById('vehicleImages');
const uploadedImagesContainer = document.getElementById('uploadedImages');

let uploadedImageKeys = [];

function getAdminKey() {
  return localStorage.getItem('bidusauto_admin_key') || '';
}

function setAdminKey(value) {
  localStorage.setItem('bidusauto_admin_key', value);
}

function clearAdminKey() {
  localStorage.removeItem('bidusauto_admin_key');
}

function showLoginMessage(type, message) {
  adminLoginMessage.innerHTML = `<div class="notice notice-${type}">${message}</div>`;
}

function showSaveMessage(type, message) {
  saveMessage.innerHTML = `<div class="notice notice-${type}">${message}</div>`;
}

function formatDatetimeLocalToIso(value) {
  if (!value) return '';
  const date = new Date(value);
  return date.toISOString();
}

function renderUploadedImages() {
  uploadedImagesContainer.innerHTML = uploadedImageKeys.map((key) => {
    return `<div class="item">${key}</div>`;
  }).join('');
}

function showAdminApp() {
  adminLoginView.style.display = 'none';
  adminAppView.style.display = 'grid';
  loadVehicles();
}

function showAdminLogin() {
  adminLoginView.style.display = 'grid';
  adminAppView.style.display = 'none';
}

async function verifyExistingLogin() {
  const adminKey = getAdminKey();

  if (!adminKey) {
    showAdminLogin();
    return;
  }

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey })
    });

    if (!res.ok) {
      clearAdminKey();
      showAdminLogin();
      return;
    }

    showAdminApp();
  } catch (error) {
    clearAdminKey();
    showAdminLogin();
  }
}

adminLoginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const adminKey = document.getElementById('adminSecretKey').value.trim();

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey })
    });

    const data = await res.json();

    if (!res.ok) {
      showLoginMessage('error', data.error || 'Login failed.');
      return;
    }

    setAdminKey(adminKey);
    showLoginMessage('success', 'Login successful.');
    showAdminApp();
  } catch (error) {
    showLoginMessage('error', 'Login request failed.');
  }
});

adminLogoutBtn.addEventListener('click', () => {
  clearAdminKey();
  window.location.reload();
});

async function uploadSelectedImages() {
  const files = Array.from(vehicleImagesInput.files || []);

  if (!files.length) {
    return [];
  }

  if (files.length > 20) {
    showSaveMessage('error', 'You can upload a maximum of 20 images.');
    return [];
  }

  const results = [];

  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: {
        'x-admin-key': getAdminKey()
      },
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Image upload failed.');
    }

    results.push(data.key);
  }

  return results;
}

vehicleImagesInput.addEventListener('change', async () => {
  try {
    showSaveMessage('success', 'Uploading images...');
    const keys = await uploadSelectedImages();
    uploadedImageKeys = [...uploadedImageKeys, ...keys].slice(0, 20);
    renderUploadedImages();
    showSaveMessage('success', 'Images uploaded successfully.');
    vehicleImagesInput.value = '';
  } catch (error) {
    showSaveMessage('error', error.message || 'Upload failed.');
  }
});

vehicleForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const payload = {
      id: document.getElementById('id').value.trim(),
      title: document.getElementById('title').value.trim(),
      make: document.getElementById('make').value.trim(),
      model: document.getElementById('model').value.trim(),
      year: Number(document.getElementById('year').value),
      mileage: Number(document.getElementById('mileage').value || 0),
      transmission: document.getElementById('transmission').value.trim(),
      fuelType: document.getElementById('fuelType').value.trim(),
      condition: document.getElementById('condition').value.trim(),
      description: document.getElementById('description').value.trim(),
      images: uploadedImageKeys,
      videoUrl: document.getElementById('videoUrl').value.trim(),
      startingBid: Number(document.getElementById('startingBid').value),
      minimumIncrement: Number(document.getElementById('minimumIncrement').value),
      auctionStart: formatDatetimeLocalToIso(document.getElementById('auctionStart').value),
      auctionEnd: formatDatetimeLocalToIso(document.getElementById('auctionEnd').value),
      isVisible: document.getElementById('isVisible').value === 'true',
      isFeatured: document.getElementById('isFeatured').value === 'true',
      depositRequired: Number(document.getElementById('depositRequired').value || 44.44)
    };

    const res = await fetch('/api/admin/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': getAdminKey()
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      showSaveMessage('error', data.error || 'Failed to save vehicle.');
      return;
    }

    showSaveMessage('success', data.message || 'Vehicle saved successfully.');
    loadVehicles();
  } catch (error) {
    showSaveMessage('error', error.message || 'Failed to save vehicle.');
  }
});

function vehicleItem(vehicle) {
  return `
    <div class="admin-vehicle-item">
      <h3>${vehicle.title}</h3>
      <p>${vehicle.year} • ${vehicle.make} • ${vehicle.model}</p>
      <p>Current Bid: $${Number(vehicle.currentBid || vehicle.startingBid || 0).toLocaleString()}</p>
      <p>Visible: ${vehicle.isVisible ? 'true' : 'false'} | Featured: ${vehicle.isFeatured ? 'true' : 'false'}</p>
      <p>ID: ${vehicle.id}</p>
      <div style="margin-top: 12px;">
        <button class="btn btn-secondary edit-vehicle-btn" type="button" data-id="${vehicle.id}">Edit Vehicle</button>
      </div>
    </div>
  `;
}

function populateVehicleForm(vehicle) {
  document.getElementById('id').value = vehicle.id || '';
  document.getElementById('title').value = vehicle.title || '';
  document.getElementById('make').value = vehicle.make || '';
  document.getElementById('model').value = vehicle.model || '';
  document.getElementById('year').value = vehicle.year || '';
  document.getElementById('mileage').value = vehicle.mileage || '';
  document.getElementById('transmission').value = vehicle.transmission || '';
  document.getElementById('fuelType').value = vehicle.fuelType || '';
  document.getElementById('condition').value = vehicle.condition || '';
  document.getElementById('description').value = vehicle.description || '';
  document.getElementById('videoUrl').value = vehicle.videoUrl || '';
  document.getElementById('startingBid').value = vehicle.startingBid || '';
  document.getElementById('minimumIncrement').value = vehicle.minimumIncrement || '';
  document.getElementById('auctionStart').value = vehicle.auctionStart ? new Date(vehicle.auctionStart).toISOString().slice(0, 16) : '';
  document.getElementById('auctionEnd').value = vehicle.auctionEnd ? new Date(vehicle.auctionEnd).toISOString().slice(0, 16) : '';
  document.getElementById('isVisible').value = String(vehicle.isVisible);
  document.getElementById('isFeatured').value = String(vehicle.isFeatured);
  document.getElementById('depositRequired').value = vehicle.depositRequired || 44.44;

  uploadedImageKeys = Array.isArray(vehicle.images) ? [...vehicle.images] : [];
  renderUploadedImages();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadVehicles() {
  try {
    const res = await fetch('/api/content?admin=1', {
      headers: {
        'x-admin-key': getAdminKey()
      }
    });

    const data = await res.json();

    if (!res.ok) {
      adminVehiclesList.innerHTML = `<div class="notice notice-error">${data.error || 'Failed to load vehicles.'}</div>`;
      return;
    }

    const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];

    if (!vehicles.length) {
      adminVehiclesList.innerHTML = `<div class="notice notice-success">No vehicles saved yet.</div>`;
      return;
    }

adminVehiclesList.innerHTML = vehicles.map(vehicleItem).join('');

const editButtons = document.querySelectorAll('.edit-vehicle-btn');
editButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const vehicleId = button.dataset.id;
    const vehicle = vehicles.find(item => item.id === vehicleId);
    if (vehicle) {
      populateVehicleForm(vehicle);
    }
  });
});
  
  } catch (error) {
    adminVehiclesList.innerHTML = `<div class="notice notice-error">Failed to load vehicles.</div>`;
  }
}

refreshVehiclesBtn.addEventListener('click', loadVehicles);

verifyExistingLogin();
