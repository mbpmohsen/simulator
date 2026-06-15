# import json
# import time
# from pathlib import Path
# from typing import Any, Dict
# from googletrans import Translator
# import random
#
# class PersianTranslator:
#     """Translates all text fields in JSON to Persian using googletrans (free)"""
#
#     def __init__(self, input_file: str, output_file: str):
#         self.input_file = input_file
#         self.output_file = output_file
#         self.translator = Translator()
#         self.translation_cache = {}
#         self.stats = {
#             'total_translations': 0,
#             'cached_translations': 0,
#             'errors': 0,
#             'skipped': 0
#         }
#
#     def translate_text(self, text: str, max_retries: int = 5) -> str:
#         """Translate text to Persian with caching and retry logic"""
#         if not text or not isinstance(text, str) or text.strip() == "":
#             return text
#
#         # Check cache first
#         if text in self.translation_cache:
#             self.stats['cached_translations'] += 1
#             return self.translation_cache[text]
#
#         # Try translation with retries
#         for attempt in range(max_retries):
#             try:
#                 # Add random delay to avoid rate limiting
#                 time.sleep(random.uniform(0.5, 1.5))
#
#                 result = self.translator.translate(text, src='en', dest='fa')
#                 translated = result.text
#
#                 self.translation_cache[text] = translated
#                 self.stats['total_translations'] += 1
#
#                 return translated
#
#             except Exception as e:
#                 print(f"  ⚠ Translation error (attempt {attempt + 1}/{max_retries}): {str(e)}")
#
#                 if attempt < max_retries - 1:
#                     # Exponential backoff with jitter
#                     wait_time = (2 ** attempt) + random.uniform(0, 1)
#                     print(f"  ⏳ Waiting {wait_time:.1f}s before retry...")
#                     time.sleep(wait_time)
#
#                     # Reinitialize translator on error
#                     self.translator = Translator()
#                 else:
#                     print(f"  ❌ Failed to translate after {max_retries} attempts")
#                     self.stats['errors'] += 1
#                     return text
#
#         return text
#
#     def translate_object(self, obj: Dict[str, Any]) -> Dict[str, Any]:
#         """Recursively translate all relevant fields in an object"""
#
#         # Translate main description
#         if 'description' in obj and obj['description']:
#             print(f"  📝 Translating description...")
#             obj['description_fa'] = self.translate_text(obj['description'])
#
#         # Translate main name
#         if 'name' in obj and obj['name']:
#             print(f"  📝 Translating name: {obj['name']}")
#             obj['name_fa'] = self.translate_text(obj['name'])
#
#         # Translate external references
#         if 'external_references' in obj and isinstance(obj['external_references'], list):
#             for idx, ref in enumerate(obj['external_references']):
#                 if isinstance(ref, dict):
#                     # Translate source_name
#                     if 'source_name' in ref and ref['source_name']:
#                         if not ref.get('source_name_fa'):
#                             print(f"  📝 Translating source_name [{idx+1}]: {ref['source_name']}")
#                             ref['source_name_fa'] = self.translate_text(ref['source_name'])
#                         else:
#                             self.stats['skipped'] += 1
#
#                     # Translate description in external reference
#                     if 'description' in ref and ref['description']:
#                         if not ref.get('description_fa'):
#                             print(f"  📝 Translating external ref description [{idx+1}]")
#                             ref['description_fa'] = self.translate_text(ref['description'])
#                         else:
#                             self.stats['skipped'] += 1
#
#         # Translate x_mitre_detection
#         if 'x_mitre_detection' in obj and obj['x_mitre_detection']:
#             if not obj.get('x_mitre_detection_fa'):
#                 print(f"  📝 Translating x_mitre_detection")
#                 obj['x_mitre_detection_fa'] = self.translate_text(obj['x_mitre_detection'])
#             else:
#                 self.stats['skipped'] += 1
#
#         # Translate definition
#         if 'definition' in obj and isinstance(obj['definition'], dict):
#             if 'statement' in obj['definition'] and obj['definition']['statement']:
#                 if not obj['definition'].get('statement_fa'):
#                     print(f"  📝 Translating definition statement")
#                     obj['definition']['statement_fa'] = self.translate_text(obj['definition']['statement'])
#                 else:
#                     self.stats['skipped'] += 1
#
#         return obj
#
#     def process_json(self):
#         """Process the entire JSON file"""
#         print(f"📂 Loading JSON from: {self.input_file}")
#
#         # Load JSON
#         try:
#             with open(self.input_file, 'r', encoding='utf-8') as f:
#                 data = json.load(f)
#         except Exception as e:
#             print(f"❌ Error loading JSON: {e}")
#             return
#
#         # Process all objects
#         if 'objects' in data and isinstance(data['objects'], list):
#             total = len(data['objects'])
#             print(f"\n🔄 Processing {total} objects...\n")
#
#             for idx, obj in enumerate(data['objects'], 1):
#                 obj_name = obj.get('name', obj.get('id', 'Unknown'))
#                 print(f"\n{'='*60}")
#                 print(f"[{idx}/{total}] Processing: {obj_name}")
#                 print(f"{'='*60}")
#
#                 data['objects'][idx - 1] = self.translate_object(obj)
#
#                 # Save progress every 5 objects
#                 if idx % 5 == 0:
#                     self.save_progress(data)
#                     print(f"\n💾 Progress saved at {idx}/{total}")
#
#         # Final save
#         self.save_progress(data)
#
#         # Print statistics
#         print("\n" + "="*60)
#         print("✅ TRANSLATION COMPLETE!")
#         print("="*60)
#         print(f"📊 Statistics:")
#         print(f"  • Total new translations: {self.stats['total_translations']}")
#         print(f"  • Cached translations: {self.stats['cached_translations']}")
#         print(f"  • Already translated (skipped): {self.stats['skipped']}")
#         print(f"  • Errors: {self.stats['errors']}")
#         print(f"  • Output saved to: {self.output_file}")
#         print("="*60)
#
#     def save_progress(self, data: Dict):
#         """Save current progress to output file"""
#         try:
#             with open(self.output_file, 'w', encoding='utf-8') as f:
#                 json.dump(data, f, ensure_ascii=False, indent=2)
#         except Exception as e:
#             print(f"❌ Error saving file: {e}")
#
#
# def main():
#     """Main execution function"""
#
#     # Configuration
#     INPUT_FILE = "enterprise-attack-17.1-t.json"  # Change this to your input file
#     OUTPUT_FILE = "output_translated.json"  # Output file name
#
#     print("="*60)
#     print("🇮🇷 MITRE ATT&CK Persian Translator")
#     print("="*60)
#     print("Using googletrans library (free, no API key needed)\n")
#
#     # Check if input file exists
#     if not Path(INPUT_FILE).exists():
#         print(f"❌ Error: Input file '{INPUT_FILE}' not found!")
#         print("Please update INPUT_FILE variable with your JSON file path.")
#         return
#
#     # Create translator and process
#     translator = PersianTranslator(INPUT_FILE, OUTPUT_FILE)
#     translator.process_json()
#
#
# if __name__ == "__main__":
#     main()

import json
import time
from pathlib import Path
from typing import Any, Dict, List
from googletrans import Translator
import random
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
import copy

class PersianTranslator:
    """Translates all text fields in JSON to Persian using googletrans (free) with parallel processing"""

    def __init__(self, input_file: str, output_file: str, num_workers: int = 10):
        self.input_file = input_file
        self.output_file = output_file
        self.num_workers = num_workers
        self.translation_cache = {}
        self.cache_lock = Lock()
        self.stats = {
            'total_translations': 0,
            'cached_translations': 0,
            'errors': 0,
            'skipped': 0
        }
        self.stats_lock = Lock()

    def translate_text(self, text: str, translator: Translator, max_retries: int = 3) -> str:
        """Translate text to Persian with caching and retry logic"""
        if not text or not isinstance(text, str) or text.strip() == "":
            return text

        # Check cache first (thread-safe)
        with self.cache_lock:
            if text in self.translation_cache:
                with self.stats_lock:
                    self.stats['cached_translations'] += 1
                return self.translation_cache[text]

        # Try translation with retries
        for attempt in range(max_retries):
            try:
                # Reduced delay for parallel processing
                time.sleep(random.uniform(0.1, 0.3))

                result = translator.translate(text, src='en', dest='fa')
                translated = result.text

                # Update cache (thread-safe)
                with self.cache_lock:
                    self.translation_cache[text] = translated

                with self.stats_lock:
                    self.stats['total_translations'] += 1

                return translated

            except Exception as e:
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 0.5
                    time.sleep(wait_time)
                    translator = Translator()
                else:
                    with self.stats_lock:
                        self.stats['errors'] += 1
                    return text

        return text

    def translate_object(self, obj: Dict[str, Any], obj_idx: int, total: int) -> Dict[str, Any]:
        """Translate all relevant fields in an object (runs in parallel)"""
        translator = Translator()  # Each thread gets its own translator
        obj = copy.deepcopy(obj)  # Deep copy to avoid race conditions

        translations_done = 0

        # Translate main description
        if 'description' in obj and obj['description']:
            obj['description_fa'] = self.translate_text(obj['description'], translator)
            translations_done += 1

        # Translate main name
        if 'name' in obj and obj['name']:
            obj['name_fa'] = self.translate_text(obj['name'], translator)
            translations_done += 1

        # Translate external references
        if 'external_references' in obj and isinstance(obj['external_references'], list):
            for idx, ref in enumerate(obj['external_references']):
                if isinstance(ref, dict):
                    if 'source_name' in ref and ref['source_name']:
                        if not ref.get('source_name_fa'):
                            ref['source_name_fa'] = self.translate_text(ref['source_name'], translator)
                            translations_done += 1

                    if 'description' in ref and ref['description']:
                        if not ref.get('description_fa'):
                            ref['description_fa'] = self.translate_text(ref['description'], translator)
                            translations_done += 1

        # Translate x_mitre_detection
        if 'x_mitre_detection' in obj and obj['x_mitre_detection']:
            if not obj.get('x_mitre_detection_fa'):
                obj['x_mitre_detection_fa'] = self.translate_text(obj['x_mitre_detection'], translator)
                translations_done += 1

        # Translate definition
        if 'definition' in obj and isinstance(obj['definition'], dict):
            if 'statement' in obj['definition'] and obj['definition']['statement']:
                if not obj['definition'].get('statement_fa'):
                    obj['definition']['statement_fa'] = self.translate_text(obj['definition']['statement'], translator)
                    translations_done += 1

        return obj, obj_idx, translations_done

    def process_json(self):
        """Process the entire JSON file with parallel processing"""
        print(f"📂 Loading JSON from: {self.input_file}")

        # Load JSON
        try:
            with open(self.input_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"❌ Error loading JSON: {e}")
            return

        # Process all objects in parallel
        if 'objects' in data and isinstance(data['objects'], list):
            total = len(data['objects'])
            print(f"\n🔄 Processing {total} objects with {self.num_workers} parallel workers...\n")
            print(f"⚡ This should be ~{self.num_workers}x faster!\n")

            # Create a copy of objects list for parallel processing
            objects_to_process = list(enumerate(data['objects']))
            processed_objects = [None] * total

            start_time = time.time()
            last_save_time = start_time
            completed = 0

            # Process objects in parallel
            with ThreadPoolExecutor(max_workers=self.num_workers) as executor:
                # Submit all tasks
                future_to_idx = {
                    executor.submit(self.translate_object, obj, idx, total): idx
                    for idx, obj in objects_to_process
                }

                # Process completed tasks
                for future in as_completed(future_to_idx):
                    try:
                        translated_obj, obj_idx, trans_count = future.result()
                        processed_objects[obj_idx] = translated_obj
                        completed += 1

                        # Progress update
                        elapsed = time.time() - start_time
                        rate = completed / elapsed if elapsed > 0 else 0
                        eta = (total - completed) / rate if rate > 0 else 0

                        if completed % 10 == 0 or completed == total:
                            print(f"✓ [{completed}/{total}] ({completed*100//total}%) | "
                                  f"Rate: {rate:.1f} obj/s | ETA: {eta/60:.1f} min")

                        # Auto-save every 30 seconds
                        current_time = time.time()
                        if current_time - last_save_time > 30:
                            # Update data with processed objects so far
                            for i, processed_obj in enumerate(processed_objects):
                                if processed_obj is not None:
                                    data['objects'][i] = processed_obj
                            self.save_progress(data)
                            print(f"💾 Auto-saved at {completed}/{total}")
                            last_save_time = current_time

                    except Exception as e:
                        print(f"❌ Error processing object: {e}")

            # Final update with all processed objects
            for i, processed_obj in enumerate(processed_objects):
                if processed_obj is not None:
                    data['objects'][i] = processed_obj

        # Final save
        self.save_progress(data)

        # Print statistics
        elapsed_time = time.time() - start_time
        print("\n" + "="*60)
        print("✅ TRANSLATION COMPLETE!")
        print("="*60)
        print(f"⏱️  Total time: {elapsed_time/60:.1f} minutes")
        print(f"⚡ Average rate: {total/elapsed_time:.1f} objects/second")
        print(f"📊 Statistics:")
        print(f"  • Total new translations: {self.stats['total_translations']}")
        print(f"  • Cached translations: {self.stats['cached_translations']}")
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
    INPUT_FILE = "enterprise-attack-18.1.json"
    OUTPUT_FILE = "output_translated.json"
    NUM_WORKERS = 15  # Increase this for more speed (10-20 is good)

    print("="*60)
    print("🇮🇷 MITRE ATT&CK Persian Translator (PARALLEL)")
    print("="*60)
    print(f"⚡ Using {NUM_WORKERS} parallel workers\n")

    # Check if input file exists
    if not Path(INPUT_FILE).exists():
        print(f"❌ Error: Input file '{INPUT_FILE}' not found!")
        return

    # Create translator and process
    translator = PersianTranslator(INPUT_FILE, OUTPUT_FILE, num_workers=NUM_WORKERS)
    translator.process_json()


if __name__ == "__main__":
    main()