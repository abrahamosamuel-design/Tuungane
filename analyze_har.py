import json
import sys

try:
    with open('C:\\Users\\USER\\Downloads\\localhost.har', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    entries = data['log']['entries']
    
    sorted_entries = sorted(entries, key=lambda x: x.get('time', 0), reverse=True)
    
    print(f"Total requests: {len(entries)}")
    print("Top 20 slowest requests:")
    for entry in sorted_entries[:20]:
        req = entry['request']
        url = req['url']
        method = req['method']
        time = entry.get('time', 0)
        timings = entry.get('timings', {})
        print(f"[{method}] {url}")
        print(f"  Total Time: {time}ms")
        print(f"  Wait (TTFB): {timings.get('wait', 0)}ms, Receive: {timings.get('receive', 0)}ms, Blocked: {timings.get('blocked', 0)}ms")
        print("-" * 40)
except Exception as e:
    print(f"Error: {e}")
