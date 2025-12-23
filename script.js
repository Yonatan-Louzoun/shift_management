let currentViewDate = new Date();
let constraints = JSON.parse(localStorage.getItem('teamConstraints')) || [];

document.addEventListener('DOMContentLoaded', () => {
    renderCalendar();

    document.getElementById('prevMonth').onclick = () => changeMonth(-1);
    document.getElementById('nextMonth').onclick = () => changeMonth(1);
    document.querySelector('.close-modal').onclick = closeModal;
    document.getElementById('constraintForm').onsubmit = handleAdd;

    // ניהול תפריט מובייל
    document.getElementById('mobileMenuBtn').onclick = () => {
        document.getElementById('sidebar').classList.add('open');
    };
    document.getElementById('closeSidebar').onclick = closeModal;
});

// פונקציית המרה לגימטריה (כולל שנה)
function toGematria(num) {
    if (num === 15) return 'ט"ו';
    if (num === 16) return 'ט"ז';
    
    const units = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
    const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
    const hundreds = ["", "ק", "ר", "ש", "ת"];
    
    let result = "";
    // אלפים (לא מציגים בדרך כלל, רק את ה'תשפ"ו -> תשפ"ו)
    let n = num % 1000; 

    // מאות
    if (n >= 100) {
        let h = Math.floor(n / 100);
        while (h >= 400) { result += "ת"; h -= 400; n -= 400; } // טיפול במקרים נדירים
        if (h > 0 && h <= 4) result += hundreds[h];
        n %= 100;
    }

    // עשרות
    if (n >= 10) {
        result += tens[Math.floor(n / 10)];
        n %= 10;
    }

    // יחידות
    result += units[n];

    if (result.length === 1) return result + "'";
    return result.slice(0, -1) + '"' + result.slice(-1);
}

// קבלת שם החודש ושנה עברית לכותרת
function getHebrewMonthTitle(date) {
    // שימוש ב-Intl כדי לקבל את החודש והשנה העבריים
    const parts = new Intl.DateTimeFormat('he-u-ca-hebrew', {month: 'long', year: 'numeric'}).formatToParts(date);
    const month = parts.find(p => p.type === 'month').value;
    const year = parseInt(parts.find(p => p.type === 'year').value);
    
    return `${month} ${toGematria(year)}`;
}

// קבלת יום עברי בגימטריה (לתאים)
function getHebrewDay(date) {
    const parts = new Intl.DateTimeFormat('he-u-ca-hebrew', {day: 'numeric'}).formatToParts(date);
    const dayNum = parseInt(parts.find(p => p.type === 'day').value);
    return toGematria(dayNum);
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    
    const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
    
    // בניית הכותרת המשולבת
    const hebrewTitle = getHebrewMonthTitle(currentViewDate);
    document.getElementById('monthTitle').textContent = `${monthNames[month]} ${year} | ${hebrewTitle}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="day-cell empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayOfWeek = dateObj.getDay();
        const hebDay = getHebrewDay(dateObj);
        
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        
        cell.innerHTML = `
            <div class="date-header">
                <span class="date-num">${day}</span>
                <span class="hebrew-date">${hebDay}</span>
            </div>
        `;

        const dayCons = constraints.filter(c => {
            if (c.type === 'single') return c.date === dateKey;
            return c.type === 'recurring' && c.dayOfWeek === dayOfWeek && c.month === month && c.year === year;
        });

        dayCons.forEach(con => {
            const tag = document.createElement('div');
            const shiftClass = con.shift.replace(' ', '_');
            tag.className = `tag ${shiftClass}`;
            tag.innerHTML = `
                <span class="tag-user">${con.name}</span>
                <span>${con.shift}</span>
            `;
            cell.appendChild(tag);
        });

        cell.onclick = () => openModal(dateKey, dayOfWeek, hebDay, dayCons);
        grid.appendChild(cell);
    }
}

let activeDateKey = '';
let activeDayOfWeek = 0;

function openModal(dateKey, dayOfWeek, hebDay, dayCons) {
    activeDateKey = dateKey;
    activeDayOfWeek = dayOfWeek;
    document.getElementById('displayDate').textContent = dateKey;
    document.getElementById('displayHebrewDate').textContent = hebDay + " בחודש";
    
    const list = document.getElementById('constraintsList');
    list.innerHTML = '';

    dayCons.forEach(con => {
        const div = document.createElement('div');
        div.className = 'existing-item';
        div.innerHTML = `
            <span><strong>${con.name}</strong> - ${con.shift}</span>
            <button class="del-btn" onclick="deleteConstraint('${con.id}')">מחק</button>
        `;
        list.appendChild(div);
    });

    document.getElementById('modalOverlay').style.display = 'flex';
}

function handleAdd(e) {
    e.preventDefault();
    const newCon = {
        id: 'id_' + Math.random().toString(36).substr(2, 9),
        name: document.getElementById('teamMember').value,
        shift: document.getElementById('shiftType').value,
        type: document.getElementById('isRecurring').checked ? 'recurring' : 'single',
        note: document.getElementById('note').value,
        date: activeDateKey,
        dayOfWeek: activeDayOfWeek,
        month: currentViewDate.getMonth(),
        year: currentViewDate.getFullYear()
    };

    constraints.push(newCon);
    saveData();
    closeModal();
    renderCalendar();
}

window.deleteConstraint = function(id) {
    constraints = constraints.filter(c => c.id !== id);
    saveData();
    closeModal();
    renderCalendar();
};

function saveData() {
    localStorage.setItem('teamConstraints', JSON.stringify(constraints));
}

function changeMonth(dir) {
    currentViewDate.setMonth(currentViewDate.getMonth() + dir);
    renderCalendar();
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('constraintForm').reset();
}