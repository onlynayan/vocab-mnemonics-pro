import pandas as pd
import json
import csv
import concurrent.futures
import re

import os

all_words = []
existing_cache = {}
if os.path.exists('words_data.json'):
    try:
        with open('words_data.json', 'r', encoding='utf-8') as f:
            cached_data = json.load(f)
            for w in cached_data:
                existing_cache[w['word']] = w
        print(f"Loaded {len(existing_cache)} words from cache.")
    except Exception as e:
        print(f"Could not load cache: {e}")

def clean_text(text):
    if not isinstance(text, str): return ""
    text = text.replace('_x000D_', ' ')
    text = text.replace('Powered by Mnemonic Dictionary', '')
    text = text.replace('(Tag : )', '')
    return re.sub(r'\s+', ' ', text).strip()

import requests
from bs4 import BeautifulSoup

def get_bangla_data(text):
    data = {"meaning": "", "prnc": "", "pos": ""}
    if not text or not isinstance(text, str): return data
    import time
    for attempt in range(3):
        try:
            headers = {'User-Agent': 'Mozilla/5.0'}
            r = requests.get(f'https://www.english-bangla.com/dictionary/{text}', headers=headers, timeout=10)
            if r.status_code == 200:
                s = BeautifulSoup(r.text, 'html.parser')
                meanings = s.select('.format1')
                prnc = s.select('.prnc')
                pos = s.select('.pos')
                if meanings:
                    data["meaning"] = meanings[0].text.strip()
                if prnc:
                    data["prnc"] = prnc[0].text.replace('&nbsp;', '').strip().replace('\u200c', '')
                if pos:
                    data["pos"] = pos[0].text.replace('&nbsp;', '').strip()
                break
            elif r.status_code == 429: # Too many requests
                time.sleep(3)
        except Exception as e:
            time.sleep(2)
            pass
    return data

def get_all_mnemonics(text):
    md = []
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        src = requests.get(f'https://mnemonicdictionary.com/?word={text}', headers=headers, timeout=5).text
        data = BeautifulSoup(src, 'html.parser')
        for mnemonic in data.find_all('div', class_='card mnemonic-card'):
            for content in mnemonic.find_all('div', class_='card-text'):
                txt = clean_text(content.text)
                if txt and txt not in md:
                    md.append(txt)
    except Exception as e:
        pass
    return md

print("Loading Barron's 333 words from Excel...")
try:
    df_333 = pd.read_excel('Barrons333_words.xlsx')
    for _, row in df_333.iterrows():
        word = str(row.get('Word', '')).strip()
        meaning = str(row.get('Meaning', '')).strip()
        
        if word.lower() == 'nan' or not word: continue
        if meaning.lower() == 'nan': meaning = ''
            
        mnemonics = []
        for i in range(1, 4):
            mn = str(row.get(f'Mnemonic{i}', ''))
            if mn and mn.lower() != 'nan':
                cmn = clean_text(mn)
                if cmn: mnemonics.append(cmn)
                
        all_words.append({
            "word": clean_text(word).lower(),
            "meaning": clean_text(meaning),
            "mnemonics": mnemonics,
            "category": "333",
            "bangla": ""
        })
    print(f"Loaded {len([w for w in all_words if w['category'] == '333'])} words from 333.")
except Exception as e:
    print(f"Error loading 333: {e}")

print("Loading Barron's 800 words from CSV...")
try:
    with open('Barrons800_words.csv', 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 2:
                word = str(row[0]).strip()
                meaning = str(row[1]).strip()
                if word and meaning and 'Barron GRE word list' not in meaning:
                    all_words.append({
                        "word": clean_text(word).lower(),
                        "meaning": clean_text(meaning),
                        "mnemonics": [],
                        "category": "800",
                        "bangla": ""
                    })
    print(f"Loaded {len([w for w in all_words if w['category'] == '800'])} words from 800.")
except Exception as e:
    print(f"Error loading 800: {e}")

# Deduplicate
unique_words = {}
for w in all_words:
    word_key = w['word'].lower()
    if word_key not in unique_words:
        unique_words[word_key] = w
    else:
        # 333 overrides 800 because it has mnemonics
        if unique_words[word_key]['category'] == '800' and w['category'] == '333':
            unique_words[word_key] = w

final_words = list(unique_words.values())
print(f"Total unique words: {len(final_words)}")

def process_word(word_obj):
    w_key = word_obj['word']
    
    # Check cache first for missing data!
    # If we already have the word AND it successfully scraped bangla meaning, just recycle it!
    if w_key in existing_cache:
        cached_w = existing_cache[w_key]
        if cached_w.get('bangla') and cached_w.get('prnc'):
            # It's fully scraped! Return cached version
            return cached_w

    if word_obj['meaning']:
        b_data = get_bangla_data(word_obj['word'])
        word_obj['bangla'] = b_data['meaning']
        word_obj['prnc'] = b_data['prnc']
        word_obj['pos'] = b_data['pos']
        fetched_mnemonics = get_all_mnemonics(word_obj['word'])
        if fetched_mnemonics:
            word_obj['mnemonics'] = fetched_mnemonics
    return word_obj

print("Fetching Bangla meanings and Mnemonics for ALL words (this might take a few minutes)...")
translated_words = []
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
    results = executor.map(process_word, final_words)
    for idx, r in enumerate(results):
        translated_words.append(r)
        if idx % 100 == 0 and idx > 0:
            print(f"Processed {idx} words...")

print("Saving to words_data.json and words_data.js...")
js_data = json.dumps(translated_words, ensure_ascii=False, indent=2)
with open('words_data.json', 'w', encoding='utf-8') as f:
    f.write(js_data)

with open('words_data.js', 'w', encoding='utf-8') as f:
    f.write('const wordsDatabase = ' + js_data + ';')

print("Finished generating offline database!")
