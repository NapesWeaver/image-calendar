'use strict';

let imageFiles = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let lastCheckedDate = new Date().toDateString();

document.getElementById('selectFolder').addEventListener('click', async () => {
  const status = document.getElementById('status');
  status.textContent = 'Scanning folder...';
  imageFiles = [];

  try {
    const dirHandle = await window.showDirectoryPicker();
    for await (const entry of dirHandle.values()) {
      
      if (entry.kind === 'file' && /\.(bmp|gif|jpe?g|png)$/i.test(entry.name)) {
        const file = await entry.getFile();
        imageFiles.push(file);
      }
    }
    renderCalendar(currentYear, currentMonth);
  } catch (err) {
    status.textContent = 'Error or folder access denied.';
    console.error(err);
  }
});

document.getElementById('prevMonth').onclick = () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar(currentYear, currentMonth);
};

document.getElementById('nextMonth').onclick = () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar(currentYear, currentMonth);
};

function renderCalendar(year, month) {
  const calendar = document.getElementById('calendar');
  const monthLabel = document.getElementById('monthLabel');
  const date = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  calendar.innerHTML = '';
  monthLabel.textContent = date.toLocaleString('default', { month: 'long', year: 'numeric' });

  let row = calendar.insertRow();
  for (let i = 0; i < date.getDay(); i++) row.insertCell();

  for (let day = 1; day <= daysInMonth; day++) {
    if (row.cells.length === 7) row = calendar.insertRow();
    const cell = row.insertCell();
    cell.textContent = day;
    if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      cell.classList.add('today');
    }
    cell.onclick = () => showImageForDate(month + 1, day);
  }

  // Auto-update image for the first day of the month
  if (imageFiles.length > 0) showImageForDate(month + 1, 1);
}

function showImageForDate(month, day) {
  const imgEl = document.getElementById('displayImage');
  const status = document.getElementById('status');
  let closestFiles = [];
  let closestDiff = Infinity;
  let processed = 0;

  imageFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = function (e) {
      let dateStr;
      let usedFallback = false;

      try {
        const tags = EXIF.readFromBinaryFile(e.target.result);
        dateStr = tags?.DateTimeOriginal;
      } catch (err) {
        console.warn("EXIF parse failed:", err);
      }

      if (!dateStr) {
        const fallbackDate = new Date(file.lastModified);
        dateStr = `${fallbackDate.getFullYear()}:${String(fallbackDate.getMonth()+1).padStart(2, '0')}:${String(fallbackDate.getDate()).padStart(2, '0')} ${String(fallbackDate.getHours()).padStart(2, '0')}:${String(fallbackDate.getMinutes()).padStart(2, '0')}:00`;
        usedFallback = true;
      }

      if (dateStr) {
        const [datePart] = dateStr.split(' ');
        const [year, m, d] = datePart.split(':').map(Number);
        const diff = Math.abs((m - month) * 31 + (d - day));

        if (diff < closestDiff) {
          closestDiff = diff;
          closestFiles = [{ file, dateStr }];
        } else if (diff === closestDiff) {
          closestFiles.push({ file, dateStr });
        }
      }

      processed++;

      if (processed === imageFiles.length) {
        if (closestFiles.length > 0) {
          const chosen = closestFiles[Math.floor(Math.random() * closestFiles.length)];
          const url = URL.createObjectURL(chosen.file);
          imgEl.src = url;
          status.textContent = `📅 Random image closest to ${month}/${day} — raw date: ${chosen.dateStr}`;
        } else {
          status.textContent = 'No matching image found.';
          imgEl.src = '';
        }
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

setInterval(() => {
  const now = new Date();
  const currentDate = now.toDateString();
  if (currentDate !== lastCheckedDate) {
  lastCheckedDate = currentDate;
  currentMonth = now.getMonth();
  currentYear = now.getFullYear();
  renderCalendar(currentYear, currentMonth);
  }
}, 60000);// Check every 60 seconds