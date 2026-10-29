# π Index — Birthday Explorer

A responsive, interactive date explorer for the first appearances of calendar-date patterns in the digits of π. The recording is a visual reference; its key data states are presented as app views rather than a forced narrated video sequence.

## Run it in VS Code

1. Download and **extract** the project ZIP.
2. In VS Code, choose **File → Open Folder** and select `pi-birthday-interface`.
3. Open `index.html` in a browser, or install the **Live Server** extension and choose **Go Live**.
4. No package installation, build process, or API key is needed. Keep all project files in the same folder.

## Main app views

- **Overview:** interactive position chart, key statistics, selected-date details, and earliest matches.
- **Calendar:** all 12 months with selectable dates and month filters.
- **Rankings:** all 366 dates, sortable by first appearance or calendar order, with live search.
- **Birthday finder:** choose a month/day and inspect its first match in π.
- **Visual explorer:** the distinct visual states from the reference, made separately selectable and interactive:
  - **Digit match:** actual π digits around the selected code, with the first occurrence highlighted.
  - **Month columns:** all 366 dates and their first-match positions, grouped by month.
  - **366 positions:** animate between calendar order and a first-to-late ranking distribution.
  - **Ranking sweep:** scrub or play the rank indicator from late appearances toward the earliest dates.
  - **Top 10:** staggered cards for the ten earliest first occurrences.

The charts ease between layouts; the month columns and Top 10 cards enter with staggered motion. Reduced-motion settings are respected.

## Data notes

- `birthdays.js` contains the index for 366 valid month/day patterns, first-appearance positions, and ranks.
- `pi-digits.js` contains 70,000 actual digits after the decimal point of π. This covers all positions in the index, including the latest first appearance at position 60,872.
- Dates use **MMDD** order, so February 13 is `0213`.
- Position counting starts at the first digit after the decimal point. Leap day is included.
