# Vocab Mastery: High-Frequency Words & Mnemonics

[![Live Demo](https://img.shields.io/badge/Live_Demo-vocab--mastery.netlify.app-success?style=for-the-badge&logo=netlify)](https://vocab-mastery.netlify.app/)

A premium, high-performance web application designed for students and GRE aspirants to master 4,600+ high-frequency vocabulary words using Bengali meanings, audio pronunciations, and memory-boosting mnemonics.

## ✨ Features

- **4,600+ Word Database:** Includes the complete Barron's 333 and 800 lists.
- **Native Audio Pronunciation:** Click the speaker icon to hear the word using the built-in Web Speech API.
- **Bengali Support:** Includes Bengali meanings and phonetic pronunciation spelling (`[অ্যাবেট্]`) fetched from english-bangla.com.
- **Mnemonics Gallery:** Displays multiple mnemonics per word with a color-matched scrollbar.
- **Personal Checklist:** Mark words as "Memorized" to save them to your local checklist.
- **Deep Search:** Search by word, English meaning, or Bengali meaning instantly.
- **Clean Design:** Modern dark-mode UI with smooth micro-animations.

## 🚀 How to Run Locally

Since this is a static project, you can simply open `index.html` in any modern browser. 

Alternatively, use a local server:
```bash
python -m http.server 8100
```
Then visit `http://localhost:8100`

## 🛠️ Data Generation
If you wish to update or modify the word list:
1. Update `Barrons333_words.xlsx` or `Barrons800_words.csv`.
2. Run the scraper: `python generate_db.py`.
3. Refresh the web page.

## 👤 Credits
Developed by **Nayan** ([@onlynayan](https://github.com/onlynayan))

---
*Built to make vocabulary learning effortless and visual.*
