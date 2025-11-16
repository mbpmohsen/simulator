import json
from googletrans import Translator

def translate_text(text, translator):
    if not text:
        return None
    try:
        return translator.translate(text, dest='fa').text
    except Exception as e:
        print(f"Translation error: {e}")
        return text  # Fallback to original if translation fails

# Load the JSON file
input_file = 'enterprise-attack-17.1-t.json'  # Replace with your actual input file path
output_file = 'enterprise-attack-17.1-t-output.json'  # Replace with your desired output file path

with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

translator = Translator()

# Traverse the objects
if 'objects' in data:
    for obj in data['objects']:
        # Translate name if present
        if 'name' in obj:
            obj['name_fa'] = translate_text(obj['name'], translator)

        # Translate description if present
        if 'description' in obj:
            obj['description_fa'] = translate_text(obj['description'], translator)

        # Translate external_references if present
        if 'external_references' in obj:
            for ref in obj['external_references']:
                # Translate source_name
                if 'source_name' in ref:
                    ref['source_name_fa'] = translate_text(ref['source_name'], translator)

                # Translate description in external_references
                if 'description' in ref:
                    ref['description_fa'] = translate_text(ref['description'], translator)

# Save the updated JSON
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

print(f"Translation completed. Output saved to {output_file}")