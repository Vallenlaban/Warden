import json, urllib.request, urllib.error
from urllib.error import HTTPError, URLError

key = None
with open('.env', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key = line.split('=', 1)[1].strip()
if not key:
    raise SystemExit('Missing GEMINI_API_KEY')

endpoints = [
    'generateText',
    'generateMessage',
    'generateContent',
    'generate',
]

payloads = [
    ('prompt_text', {'prompt': {'text': 'Hello world'}, 'temperature': 0.0, 'maxOutputTokens': 50}),
    ('prompt_simple', {'prompt': 'Hello world', 'temperature': 0.0, 'maxOutputTokens': 50}),
    ('input_text', {'input': 'Hello world', 'temperature': 0.0, 'maxOutputTokens': 50}),
    ('content_text', {'content': 'Hello world', 'temperature': 0.0, 'maxOutputTokens': 50}),
    ('content_parts', {'content': [{'type': 'text', 'text': 'Hello world'}], 'temperature': 0.0, 'maxOutputTokens': 50}),
    ('messages', {'messages': [{'author': 'user', 'content': [{'type': 'text', 'text': 'Hello world'}]}], 'temperature': 0.0, 'topP': 0.9, 'maxOutputTokens': 50}),
    ('instances_text', {'instances': ['Hello world']}),
    ('instances_obj', {'instances': [{'content': [{'type': 'text', 'text': 'Hello world'}]}]}),
    ('input_obj', {'input': {'text': 'Hello world'}, 'temperature': 0.0, 'maxOutputTokens': 50}),
]

for ep in endpoints:
    print('=== METHOD', ep)
    for name, payload in payloads:
        print('---', name)
        data = json.dumps(payload).encode('utf-8')
        url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:{ep}?key={key}'
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                text = r.read().decode('utf-8', 'replace')
                print('OK', name, r.status)
                print(text[:500])
        except HTTPError as e:
            print('ERR', name, e.code)
            print(e.read().decode('utf-8', 'replace')[:500])
        except URLError as e:
            print('FAIL', name, e)
