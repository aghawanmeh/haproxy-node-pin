function extractCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}

async function fetchNodeInfo() {
  const cookieName = 'SRVID';
  const cookieValue = extractCookie(cookieName);

  const appValue = window.__HAPROXY_NODE_INFO__ || null;

  if (appValue && appValue.node) {
    return {
      node: String(appValue.node),
      cookie: cookieValue || 'No SRVID cookie found'
    };
  }

  try {
    const response = await fetch('/whoami', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store'
    });

    if (response.ok) {
      const data = await response.json();
      return {
        node: data.node || data.backend || data.server || 'Unknown',
        cookie: cookieValue || 'No SRVID cookie found'
      };
    }
  } catch (error) {
    // ignore
  }

  return {
    node: cookieValue ? `Pinned via cookie: ${cookieValue}` : 'Unknown',
    cookie: cookieValue || 'No SRVID cookie found'
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getNodeInfo') {
    fetchNodeInfo().then(sendResponse).catch((err) => {
      sendResponse({ node: 'Unknown', cookie: 'No cookie found' });
      console.error('NodeInfo fetch failed:', err);
    });
    return true;
  }

  return false;
});
