const nodeEl = document.getElementById('node');
const cookieEl = document.getElementById('cookie');
const statusEl = document.getElementById('status');
const refreshBtn = document.getElementById('refreshBtn');

async function readNodeInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      nodeEl.textContent = 'No active tab';
      statusEl.textContent = 'Unavailable';
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getNodeInfo' });

    if (!response) {
      nodeEl.textContent = 'No route information available';
      cookieEl.textContent = 'No cookie detected';
      statusEl.textContent = 'No data';
      return;
    }

    nodeEl.textContent = response.node || 'Unknown';
    cookieEl.textContent = response.cookie || 'No cookie detected';

    if (response.node && response.node !== 'Unknown') {
      statusEl.textContent = 'Pinned to target node';
    } else if (response.cookie && response.cookie !== 'No cookie detected') {
      statusEl.textContent = 'Cookie detected';
    } else {
      statusEl.textContent = 'No affinity data';
    }
  } catch (err) {
    nodeEl.textContent = 'No data';
    cookieEl.textContent = 'Not available';
    statusEl.textContent = 'Extension blocked';
    console.error('HAProxy Node Pin error:', err);
  }
}

refreshBtn.addEventListener('click', readNodeInfo);
readNodeInfo();
