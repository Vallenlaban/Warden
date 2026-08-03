import json
import urllib.request
import urllib.error

# Read API key from .env
key = None
with open('.env', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key = line.split('=', 1)[1].strip()
if not key:
    raise SystemExit('Missing GEMINI_API_KEY')

model = 'gemini-2.0-flash'
methods = ['generateText', 'generateMessage', 'generateContent']
payloads = [
    ('prompt_text', {'prompt': {'text': 'Hello world'}}),
    ('prompt_messages', {'prompt': {'messages': [{'author': 'user', 'content': [{'type': 'text', 'text': 'Hello world'}]}]}}),
    ('text_prompt', {'text': 'Hello world'}),
    ('input_text', {'input': 'Hello world'}),
    ('input_obj', {'input': {'text': 'Hello world'}}),
    ('content_text', {'content': 'Hello world'}),
    ('content_parts', {'content': [{'type': 'text', 'text': 'Hello world'}]}),
]

for method in methods:
    print('=== METHOD', method)
    for name, payload in payloads:
        url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:{method}?key={key}'
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
        print('---', name)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                text = resp.read().decode('utf-8', 'replace')
                print('OK', resp.status)
                print(text[:1200])
        except urllib.error.HTTPError as e:
            print('ERR', e.code)
            try:
                print(e.read().decode('utf-8', 'replace'))
            except Exception as e2:
                print('Failed to read error body', e2)
        except Exception as e:
            print('EXC', type(e).__name__, e)
