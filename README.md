# HAProxy Node Pin

A lightweight Chrome extension for test/staging environments where you want to confirm which backend node a browser session has landed on, and optionally force a session to a specific node.

## What this does

- reads the HAProxy sticky cookie (`SRVID` by default)
- checks for a page-provided debug object (`window.__HAPROXY_NODE_INFO__`)
- optionally fetches a same-origin debug endpoint such as `/whoami`
- shows the current node in a popup

This is useful when you want to validate behavior on a single backend node instead of round-robin routing during testing.

## Install in Chrome

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select this folder
5. Open the extension popup on a page behind HAProxy

## Recommended app-side debug endpoint

Expose a debug endpoint like this in your app or reverse-proxy layer:

```json
GET /whoami
{
  "node": "app-02",
  "server": "app-02.internal",
  "ip": "10.10.10.22"
}
```

If your app is behind HAProxy and you are using sticky sessions, the browser will typically carry a cookie like:

```text
SRVID=app-02
```

## Example HAProxy sticky session config

```haproxy
backend app_backend
    balance roundrobin
    option httpchk GET /health
    cookie SRVID insert indirect nocache

    server app1 app-01.internal:8080 check cookie app1
    server app2 app-02.internal:8080 check cookie app2
    server app3 app-03.internal:8080 check cookie app3
```

## Example test-only forced-node routing

```haproxy
backend app_backend
    balance roundrobin
    option httpchk GET /health
    cookie SRVID insert indirect nocache

    acl force_app2 hdr(X-Test-Node) -m str app2
    use-server app2 if force_app2

    server app1 app-01.internal:8080 check cookie app1
    server app2 app-02.internal:8080 check cookie app2
    server app3 app-03.internal:8080 check cookie app3
```

Then test with:

```bash
curl -H "X-Test-Node: app2" http://myapp.example.com/
```

## Optional app-side debug object

If you want the page itself to expose the node without an API call, set:

```html
<script>
  window.__HAPROXY_NODE_INFO__ = { node: 'app-02' };
</script>
```

This extension will read that automatically.

## Notes

- The extension is intentionally simple and easy to extend.
- For a real production deployment, add a site-specific endpoint or a secured debug route.
- This is for testing and debugging, not a production monitoring system.

## Future improvements

- add custom cookie name support
- add explicit "pin this session to node X" UI
- show backend IP, health state, and request counts
- add a “copy cookie value” button
