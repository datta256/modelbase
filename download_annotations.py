import objaverse
import json

print("Loading annotations...")
annotations = objaverse.load_annotations()

print(f"Loaded {len(annotations):,} assets")

with open("annotations.json", "w", encoding="utf-8") as f:
    json.dump(annotations, f)

print("Done.")