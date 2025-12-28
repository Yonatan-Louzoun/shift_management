// ייבוא פונקציות Firebase (גרסה יציבה 10.7.1)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- ההגדרות שלך מ-Firebase ---
const firebaseConfig = {
    apiKey: "AIzaSyDZlNeTqqGZHAChV1W62NPqig6RsjYJDyM",
    authDomain: "shift-management-12d93.firebaseapp.com",
    projectId: "shift-management-12d93",
    storageBucket: "shift-management-12d93.firebasestorage.app",
    messagingSenderId: "165089906528",
    appId: "1:165089906528:web:330da5738de0528d8c9805",
    measurementId: "G-CD8Z4S7VVN"
};

// אתחול האפליקציה והתחברות למסד הנתונים
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const constraintsCol = collection(db, "constraints");

// משתנים גלובליים
let currentViewDate = new Date();
let constraints = []; 

// --- האזנה בזמן אמת (Real-time Listener) ---
// פונקציה זו רצה אוטומטית בכל פעם שיש שינוי ב-Firebase (מישהו הוסיף/מחק אילוץ)
onSnapshot(constraintsCol, (snapshot) => {
    constraints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderCalendar(); // ריענון התצוגה לכולם בו זמנית
});

document.addEventListener('DOMContentLoaded', () => {
    // מאזינים לכפתורים
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

// --- פונקציות עזר לתאריך עברי (גימטריה) ---
function toGematria(num) {
    // טיפול ספציפי בשנים (אם המספר גדול מ-700, זו כנראה שנה)
    if (num >= 700 && num < 1000) {
        const yearSuffix = num - 700; // מקבלים למשל 86 עבור תשפ"ו
        
        const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
        const units = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
        
        let result = "תש"; // קידומת ל-5000
        
        if (yearSuffix >= 10) {
            result += tens[Math.floor(yearSuffix / 10)];
        }
        result += units[yearSuffix % 10];
        
        // הוספת גרשיים/מרכאות לפי הכללים
        if (result.length === 3) return result + "'";
        return result.slice(0, -1) + '"' + result.slice(-1);
    }

    // לוגיקה רגילה לימים בחודש (1-30)
    if (num === 15) return 'ט"ו';
    if (num === 16) return 'ט"ז';
    
    const units = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
    const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
    
    let res = "";
    if (num >= 10) {
        res += tens[Math.floor(num / 10)];
    }
    res += units[num % 10];
    
    if (res.length === 1) return res + "'";
    return res.slice(0, -1) + '"' + res.slice(-1);
}

// כותרת חודש עברית + לועזית
function getHebrewMonthTitle(date) {
    const parts = new Intl.DateTimeFormat('he-u-ca-hebrew', {month: 'long', year: 'numeric'}).formatToParts(date);
    const month = parts.find(p => p.type === 'month').value;
    const yearRaw = parts.find(p => p.type === 'year').value;
    
    // ניקוי תווים שאינם מספרים והפיכה למספר (למשל 5786 הופך ל-786)
    const yearNum = parseInt(yearRaw.replace(/[^0-9]/g, '')) % 1000;
    
    return `${month} ${toGematria(yearNum)}`;
}

// יום עברי לתא
function getHebrewDay(date) {
    const parts = new Intl.DateTimeFormat('he-u-ca-hebrew', {day: 'numeric'}).formatToParts(date);
    const dayNum = parseInt(parts.find(p => p.type === 'day').value);
    return toGematria(dayNum);
}

// --- פונקציית הרינדור (בניית הלוח) ---
function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return; // הגנה למקרה שהדף לא נטען
    grid.innerHTML = '';

    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    
    const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
    
    // כותרת משולבת
    const hebrewTitle = getHebrewMonthTitle(currentViewDate);
    document.getElementById('monthTitle').textContent = `${monthNames[month]} ${year} | ${hebrewTitle}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // ריקים
    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="day-cell empty"></div>`;
    }

    // ימים
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

        // סינון אילוצים מה-Database
        const dayCons = constraints.filter(c => {
            if (c.type === 'single') return c.date === dateKey;
            // בדיקת אילוץ חוזר (לפי יום בשבוע + חודש ושנה נוכחיים)
            return c.type === 'recurring' && c.dayOfWeek === dayOfWeek && c.month === month && c.year === year;
        });

        dayCons.forEach(con => {
    const tag = document.createElement('div');
    // החלפת רווחים בקו תחתון עבור ה-CSS
    const shiftClass = con.shift ? con.shift.replace(/\s+/g, '_') : 'כל_היום';
    tag.className = `tag ${shiftClass}`;
    
    // בניית פורמט הטקסט: שם משמרת; הערה (אם קיימת)
    const notePart = con.note ? `; ${con.note}` : "";
    
    tag.innerHTML = `
        <span class="tag-content">${con.name} ${con.shift}${notePart}</span>
    `;
    cell.appendChild(tag);
});

        cell.onclick = () => openModal(dateKey, dayOfWeek, hebDay, dayCons);
        grid.appendChild(cell);
    }
}

// --- ניהול מודל ---
let activeDateKey = '';
let activeDayOfWeek = 0;

function openModal(dateKey, dayOfWeek, hebDay, dayCons) {
    activeDateKey = dateKey;
    activeDayOfWeek = dayOfWeek;
    document.getElementById('displayDate').textContent = dateKey;
    document.getElementById('displayHebrewDate').textContent = hebDay + " בחודש";
    
    const list = document.getElementById('constraintsList');
    list.innerHTML = '';

    if(dayCons.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#999;">אין אילוצים ליום זה</p>';
    }

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

// --- הוספה ל-Firebase (אסינכרוני) ---
async function handleAdd(e) {
    e.preventDefault();
    
    // יצירת אובייקט הנתונים
    const newCon = {
        name: document.getElementById('teamMember').value,
        shift: document.getElementById('shiftType').value,
        type: document.getElementById('isRecurring').checked ? 'recurring' : 'single',
        note: document.getElementById('note').value,
        date: activeDateKey,
        dayOfWeek: activeDayOfWeek,
        month: currentViewDate.getMonth(), // חשוב לאילוצים חוזרים
        year: currentViewDate.getFullYear()
    };

    try {
        // שליחה לשרת
        await addDoc(constraintsCol, newCon);
        closeModal();
        // אין צורך לקרוא ל-renderCalendar ידנית, ה-onSnapshot יעשה זאת אוטומטית
    } catch (error) {
        console.error("Error adding document: ", error);
        alert("אירעה שגיאה בשמירה. בדוק את החיבור לרשת.");
    }
}

// --- מחיקה מ-Firebase ---
window.deleteConstraint = async function(id) {
    if(!confirm("למחוק את האילוץ?")) return;
    
    try {
        await deleteDoc(doc(db, "constraints", id));
        closeModal();
    } catch (error) {
        console.error("Error removing document: ", error);
        alert("שגיאה במחיקה.");
    }
};

function changeMonth(dir) {
    currentViewDate.setMonth(currentViewDate.getMonth() + dir);
    renderCalendar();
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('constraintForm').reset();
}

