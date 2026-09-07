from http.server import BaseHTTPRequestHandler, HTTPServer
import json

class PartnerHandler(BaseHTTPRequestHandler):
    def do_post(self):
        length = int(self.headers.get('content-length', '0'))
        body = self.rfile.read(length)
        try:
            payload = json.loads(body)
        except Exception:
            payload = {'raw': body.decode('utf-8', errors='ignore')}

        print('RECEIVED_PAYLOAD=', json.dumps(payload, ensure_ascii=False))
        self.send_response(200)
        self.end_headers()
        self.wfile.write(json.dumps({'ok': True}).encode('utf-8'))

    def do_get(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'partner listener ok')

def run(port=8081):
    HTTPServer(('0.0.0.0', port), PartnerHandler).serve_forever()

if __name__ == '__main__':
    run()
