import json
import time
from pathlib import Path
from typing import Any, Dict
from googletrans import Translator
import random

class PersianTranslator:
    """Translates all text fields in JSON to Persian using googletrans (free)"""

    def __init__(self, input_file: str, output_file: str):
        self.input_file = input_file
        self.output_file = output_file
        self.translator = Translator()
        self.translation_cache = {}
        self.stats = {
            'total_translations': 0,
            'cached_translations': 0,
            'errors': 0,
            'skipped': 0
        }

    def translate_text(self, text: str, max_retries: int = 5) -> str:
        """Translate text to Persian with caching and retry logic"""
        if not text or not isinstance(text, str) or text.strip() == "":
            return text

        # Check cache first
        if text in self.translation_cache:
            self.stats['cached_translations'] += 1
            return self.translation_cache[text]

        # Try translation with retries
        for attempt in range(max_retries):
            try:
                # Add random delay to avoid rate limiting
                time.sleep(random.uniform(0.5, 1.5))

                result = self.translator.translate(text, src='en', dest='fa')
                translated = result.text

                self.translation_cache[text] = translated
                self.stats['total_translations'] += 1

                return translated

            except Exception as e:
                print(f"  ⚠ Translation error (attempt {attempt + 1}/{max_retries}): {str(e)}")

                if attempt < max_retries - 1:
                    # Exponential backoff with jitter
                    wait_time = (2 ** attempt) + random.uniform(0, 1)
                    print(f"  ⏳ Waiting {wait_time:.1f}s before retry...")
                    time.sleep(wait_time)

                    # Reinitialize translator on error
                    self.translator = Translator()
                else:
                    print(f"  ❌ Failed to translate after {max_retries} attempts")
                    self.stats['errors'] += 1
                    return text

        return text

    def translate_object(self, obj: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively translate all relevant fields in an object"""

        # Translate main description
        if 'description' in obj and obj['description']:
            if not obj.get('description_fa'):
                print(f"  📝 Translating description...")
                obj['description_fa'] = self.translate_text(obj['description'])
            else:
                print(f"  ✓ description_fa already exists, skipping")
                self.stats['skipped'] += 1

        # Translate main name
        if 'name' in obj and obj['name']:
            if not obj.get('name_fa'):
                print(f"  📝 Translating name: {obj['name']}")
                obj['name_fa'] = self.translate_text(obj['name'])
            else:
                print(f"  ✓ name_fa already exists, skipping")
                self.stats['skipped'] += 1

        # Translate external references
        if 'external_references' in obj and isinstance(obj['external_references'], list):
            for idx, ref in enumerate(obj['external_references']):
                if isinstance(ref, dict):
                    # Translate source_name
                    if 'source_name' in ref and ref['source_name']:
                        if not ref.get('source_name_fa'):
                            print(f"  📝 Translating source_name [{idx+1}]: {ref['source_name']}")
                            ref['source_name_fa'] = self.translate_text(ref['source_name'])
                        else:
                            self.stats['skipped'] += 1

                    # Translate description in external reference
                    if 'description' in ref and ref['description']:
                        if not ref.get('description_fa'):
                            print(f"  📝 Translating external ref description [{idx+1}]")
                            ref['description_fa'] = self.translate_text(ref['description'])
                        else:
                            self.stats['skipped'] += 1

        # Translate x_mitre_detection
        if 'x_mitre_detection' in obj and obj['x_mitre_detection']:
            if not obj.get('x_mitre_detection_fa'):
                print(f"  📝 Translating x_mitre_detection")
                obj['x_mitre_detection_fa'] = self.translate_text(obj['x_mitre_detection'])
            else:
                self.stats['skipped'] += 1

        # Translate definition
        if 'definition' in obj and isinstance(obj['definition'], dict):
            if 'statement' in obj['definition'] and obj['definition']['statement']:
                if not obj['definition'].get('statement_fa'):
                    print(f"  📝 Translating definition statement")
                    obj['definition']['statement_fa'] = self.translate_text(obj['definition']['statement'])
                else:
                    self.stats['skipped'] += 1

        return obj

    def process_json(self):
        """Process the entire JSON file"""
        print(f"📂 Loading JSON from: {self.input_file}")

        # Load JSON
        try:
            with open(self.input_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"❌ Error loading JSON: {e}")
            return

        # Process all objects
        if 'objects' in data and isinstance(data['objects'], list):
            total = len(data['objects'])
            print(f"\n🔄 Processing {total} objects...\n")

            for idx, obj in enumerate(data['objects'], 1):
                obj_name = obj.get('name', obj.get('id', 'Unknown'))
                print(f"\n{'='*60}")
                print(f"[{idx}/{total}] Processing: {obj_name}")
                print(f"{'='*60}")

                data['objects'][idx - 1] = self.translate_object(obj)

                # Save progress every 5 objects
                if idx % 5 == 0:
                    self.save_progress(data)
                    print(f"\n💾 Progress saved at {idx}/{total}")

        # Final save
        self.save_progress(data)

        # Print statistics
        print("\n" + "="*60)
        print("✅ TRANSLATION COMPLETE!")
        print("="*60)
        print(f"📊 Statistics:")
        print(f"  • Total new translations: {self.stats['total_translations']}")
        print(f"  • Cached translations: {self.stats['cached_translations']}")
        print(f"  • Already translated (skipped): {self.stats['skipped']}")
        print(f"  • Errors: {self.stats['errors']}")
        print(f"  • Output saved to: {self.output_file}")
        print("="*60)

    def save_progress(self, data: Dict):
        """Save current progress to output file"""
        try:
            with open(self.output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"❌ Error saving file: {e}")


def main():
    """Main execution function"""

    # Configuration
    INPUT_FILE = "enterprise-attack-17.1-t.json"  # Change this to your input file
    OUTPUT_FILE = "output_translated.json"  # Output file name

    print("="*60)
    print("🇮🇷 MITRE ATT&CK Persian Translator")
    print("="*60)
    print("Using googletrans library (free, no API key needed)\n")

    # Check if input file exists
    if not Path(INPUT_FILE).exists():
        print(f"❌ Error: Input file '{INPUT_FILE}' not found!")
        print("Please update INPUT_FILE variable with your JSON file path.")
        return

    # Create translator and process
    translator = PersianTranslator(INPUT_FILE, OUTPUT_FILE)
    translator.process_json()


if __name__ == "__main__":
    main()