import json

with open("annotations.json","r",encoding="utf8") as f:
    data = json.load(f)

uid = next(iter(data))

print(data[uid].keys())