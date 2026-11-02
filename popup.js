const nodeEl = document.getElementById('node');
const cookieEl = document.getElementById('cookie');
const statusEl = document.getElementById('status');
const nodeSelectEl = document.getElementById('nodeSelect');
const applyBtn = document.getElementById('applyBtn');
const refreshBtn = document.getElementById('refreshBtn');

const FALLBACK_NODE_LIST = ['app1', 'app2', 'app3'];

function setStatus(text, ok = true) {
  statusEl.textContent = text;
  statusEl.classList.toggle('status', ok);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function getCookieForTab(tabUrl) {
  if (!tabUrl) return null;

  try {
    const url = new URL(tabUrl);
    const cookieUrl = `${url.protocol}//${url.host}`;
    const cookie = await chrome.cookies.get({ url: cookieUrl, name: 'SRVID' });
    return cookie ? cookie.value : null;
  } catch (error) {
    return null;
  }
}

async function populateNodeOptions() {
  const tab = await getActiveTab();
  if (!tab || !tab.url) {
    nodeSelectEl.innerHTML = '<option value="__round_robin__">Round Robin (default)</option>';
    return;
  }

  const options = ['__round_robin__'];
  const cookieValue = await getCookieForTab(tab.url);

  try {
    const response = await fetch('/debug/nodes', {
      credentials: 'same-origin',
      cache: 'no-store'
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.nodes)) {
        for (const node of data.nodes) {
          if (node && node !== '__round_robin__') {
            options.push(String(node));
          }
        }
      }
    }
  } catch (error) {
    // ignore and fallback below
  }

  for (const node of FALLBACK_NODE_LIST) {
    if (!options.includes(node)) {
      options.push(node);
    }
  }

  const uniqueOptions = [...new Set(options)];
  nodeSelectEl.innerHTML = uniqueOptions
    .map((value) => {
      const label = value === '__round_robin__' ? 'Round Robin (default)' : value;
      return `<option value="${value}">${label}</option>`;
    })
    .join('');

  if (cookieValue) {
    nodeSelectEl.value = cookieValue;
  } else {
    nodeSelectEl.value = '__round_robin__';
  }
}

async function applySelection() {
  const tab = await getActiveTab();
  if (!tab || !tab.url) {
    setStatus('Cannot apply without an active tab', false);
    return;
  }

  const value = nodeSelectEl.value;
  const url = new URL(tab.url);
  const cookieUrl = `${url.protocol}//${url.host}`;

  try {
    if (value === '__round_robin__') {
      await chrome.cookies.remove({ url: cookieUrl, name: 'SRVID' });
      setStatus('Round robin restored');
    } else {
      await chrome.cookies.set({
        url: cookieUrl,
        name: 'SRVID',
        value,
        path: '/'
      });
      setStatus(`Pinned to ${value}`);
    }

    chrome.tabs.reload(tab.id);
  } catch (error) {
    console.error('Failed to set node pin:', error);
    setStatus('Failed to apply selection', false);
  }
}

async function readNodeInfo() {
  try {
    const tab = await getActiveTab();
    if (!tab || !tab.id) {
      nodeEl.textContent = 'No active tab';
      cookieEl.textContent = 'Not available';
      setStatus('Unavailable', false);
      return;
    }

    await populateNodeOptions();

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getNodeInfo' });

    if (!response) {
      nodeEl.textContent = 'No route information available';
      cookieEl.textContent = 'No cookie detected';
      setStatus('No data', false);
      return;
    }

    const cookieValue = await getCookieForTab(tab.url);
    nodeEl.textContent = response.node || 'Unknown';
    cookieEl.textContent = cookieValue || response.cookie || 'No cookie detected';

    if (response.node && response.node !== 'Unknown') {
      setStatus('Pinned to target node');
    } else if (cookieValue) {
      setStatus('Cookie detected');
    } else {
      setStatus('No affinity data', false);
    }
  } catch (error) {
    nodeEl.textContent = 'No data';
    cookieEl.textContent = 'Not available';
    setStatus('Extension blocked', false);
    console.error('HAProxy Node Pin error:', error);
  }
}

applyBtn.addEventListener('click', applySelection);
refreshBtn.addEventListener('click', readNodeInfo);
readNodeInfo();
