// File: script.js
// ====================== التطبيق الرئيسي (نسخة كاملة مع حل مشكلة مواقيت الصلاة والإشعارات اليومية) ======================

// ---------- الحالة العامة ----------
let currentSection = 'homeSection';
let morningProgress = JSON.parse(localStorage.getItem('morningProgress')) || {};
let eveningProgress = JSON.parse(localStorage.getItem('eveningProgress')) || {};
let wirdProgress = JSON.parse(localStorage.getItem('wirdProgress')) || {};
let tasbeehState = JSON.parse(localStorage.getItem('tasbeehState')) || { type: 'سبحان الله', count: 0 };
let darkMode = localStorage.getItem('darkMode') === 'true';

// حالة مواقيت الصلاة والإشعارات والأذان
let prayerTimesState = JSON.parse(localStorage.getItem('prayerTimesState')) || {
  city: 'Cairo',
  method: 5, // طريقة حساب مواقيت الصلاة (5 = مصر)
  lastFetch: null,
  timings: null,
  date: null
};
let notificationPermission = localStorage.getItem('notificationPermission') === 'granted';
let notificationState = JSON.parse(localStorage.getItem('notificationState')) || {
  enabled: false,
  lastAzkarMorningDate: null,
  lastAzkarEveningDate: null,
  lastWirdDate: null
};
let azanEnabled = localStorage.getItem('azanEnabled') !== 'false'; // افتراضي مفعل

// عناصر DOM
const themeToggle = document.getElementById('themeToggle');
const globalSearch = document.getElementById('globalSearch');
const sections = document.querySelectorAll('.content-section');
const navItems = document.querySelectorAll('.nav-item');
const homeCards = document.querySelectorAll('.home-card');
const morningContainer = document.getElementById('morningContainer');
const eveningContainer = document.getElementById('eveningContainer');
const duaContainer = document.getElementById('duaContainer');
const duaCategories = document.getElementById('duaCategories');
const wirdListContainer = document.getElementById('wirdListContainer');
const wirdProgressDiv = document.getElementById('wirdProgress');
const resetWirdBtn = document.getElementById('resetWirdBtn');
const tasbeehType = document.getElementById('tasbeehType');
const tasbeehCount = document.getElementById('tasbeehCount');
const tasbeehIncrement = document.getElementById('tasbeehIncrement');
const resetTasbeeh = document.getElementById('resetTasbeeh');
const scrollTopBtn = document.getElementById('scrollTopBtn');
const toastContainer = document.getElementById('toastContainer');

// عناصر مواقيت الصلاة
const citySelect = document.getElementById('citySelect');
const detectLocationBtn = document.getElementById('detectLocationBtn');
const refreshPrayerBtn = document.getElementById('refreshPrayerBtn');
const azanToggleBtn = document.getElementById('azanToggleBtn');
const prayerTimesContainer = document.getElementById('prayerTimesContainer');
const nextPrayerName = document.getElementById('nextPrayerName');
const nextPrayerTime = document.getElementById('nextPrayerTime');
const nextPrayerCountdown = document.getElementById('nextPrayerCountdown');
const hijriDate = document.getElementById('hijriDate');

// أزرار إعادة تعيين الأذكار
const resetMorningBtn = document.getElementById('resetMorningBtn');
const resetEveningBtn = document.getElementById('resetEveningBtn');

// عنصر صوت الأذان (رابط مؤقت - يفضل استخدام ملف محلي)
let adhanAudio = null;
function initAdhanAudio() {
  if (!adhanAudio) {
    adhanAudio = new Audio('https://www.islamcan.com/audio/adhan/azan1.mp3');
    adhanAudio.preload = 'none';
  }
}
initAdhanAudio();

// تحديث أيقونة الأذان
function updateAzanIcon() {
  if (azanToggleBtn) {
    azanToggleBtn.innerHTML = azanEnabled ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
  }
}
updateAzanIcon();

if (azanToggleBtn) {
  azanToggleBtn.addEventListener('click', () => {
    azanEnabled = !azanEnabled;
    localStorage.setItem('azanEnabled', azanEnabled);
    updateAzanIcon();
    showToast(azanEnabled ? '🔔 تم تفعيل الأذان' : '🔇 تم إيقاف الأذان', 'info');
  });
}

// تهيئة الوضع الليلي
if (darkMode) document.body.classList.add('dark-mode');
themeToggle.addEventListener('click', toggleTheme);

// عرض القسم الأول
showSection('homeSection');

// أحداث الشريط السفلي والبطاقات الرئيسية
navItems.forEach(item => {
  item.addEventListener('click', () => {
    const section = item.dataset.section;
    if (section) showSection(section);
  });
});

homeCards.forEach(card => {
  card.addEventListener('click', () => {
    const section = card.dataset.section;
    if (section) showSection(section);
  });
});

// زر العودة للأعلى
window.addEventListener('scroll', () => {
  if (window.scrollY > 300) scrollTopBtn.classList.add('show');
  else scrollTopBtn.classList.remove('show');
});
scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ---------- الوظائف الأساسية ----------
function showSection(sectionId) {
  sections.forEach(s => s.classList.remove('active-section'));
  document.getElementById(sectionId).classList.add('active-section');
  currentSection = sectionId;

  // تحديث التنقل السفلي
  navItems.forEach(item => {
    item.classList.remove('active');
    if (item.dataset.section === sectionId) item.classList.add('active');
  });

  // تحميل المحتوى المناسب حسب القسم
  if (sectionId === 'azkarMorningSection') renderAzkar('morning');
  if (sectionId === 'azkarEveningSection') renderAzkar('evening');
  if (sectionId === 'duaSection') renderDuas();
  if (sectionId === 'prayerTimesSection') loadPrayerTimes();
  if (sectionId === 'dailyWirdSection') renderWird();
  if (sectionId === 'tasbeehSection') loadTasbeeh();
}

// حفظ التقدم في LocalStorage
function saveProgress(type, id, count) {
  if (type === 'morning') {
    morningProgress[id] = count;
    localStorage.setItem('morningProgress', JSON.stringify(morningProgress));
  } else if (type === 'evening') {
    eveningProgress[id] = count;
    localStorage.setItem('eveningProgress', JSON.stringify(eveningProgress));
  }
}

// عرض الأذكار (بدون Toast مع كل ضغطة)
function renderAzkar(type) {
  const data = type === 'morning' ? azkarMorning : azkarEvening;
  const container = type === 'morning' ? morningContainer : eveningContainer;
  const progress = type === 'morning' ? morningProgress : eveningProgress;

  container.innerHTML = '';
  data.forEach(zkr => {
    const savedCount = progress[zkr.id] || 0;
    const isCompleted = savedCount >= zkr.repeat;
    const card = document.createElement('div');
    card.className = `zkr-card ${isCompleted ? 'completed' : ''}`;
    card.innerHTML = `
      <div class="zkr-text">${zkr.text}</div>
      <div class="zkr-footer">
        <span class="repeat-info"><i class="fas fa-redo-alt"></i> ${zkr.repeat}</span>
        <div class="counter-actions">
          <span class="counter-display" id="count-${zkr.id}">${savedCount}</span>
          <button class="done-btn ${isCompleted ? 'completed' : ''}" data-id="${zkr.id}" data-type="${type}" data-max="${zkr.repeat}">
            <i class="fas fa-check-circle"></i>
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // إضافة فعالية الأزرار
  container.querySelectorAll('.done-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const id = this.dataset.id;
      const type = this.dataset.type;
      const max = parseInt(this.dataset.max);
      const countSpan = document.getElementById(`count-${id}`);
      if (!countSpan) return;
      let currentCount = parseInt(countSpan.innerText);

      if (currentCount < max) {
        const newCount = currentCount + 1;
        countSpan.innerText = newCount;
        saveProgress(type, id, newCount);

        if (newCount >= max) {
          this.classList.add('completed');
          this.closest('.zkr-card').classList.add('completed');
          showToast(`✅ تم إكمال الذكر`, 'success');
        }
        // لا نعرض Toast مع كل ضغطة
      } else {
        showToast('📿 لقد أكملت هذا الذكر بالفعل', 'info');
      }
    });
  });
}

// إعادة تعيين أذكار الصباح
if (resetMorningBtn) {
  resetMorningBtn.addEventListener('click', () => {
    morningProgress = {};
    localStorage.removeItem('morningProgress');
    renderAzkar('morning');
    showToast('🔄 تم إعادة تعيين أذكار الصباح', 'info');
  });
}

// إعادة تعيين أذكار المساء
if (resetEveningBtn) {
  resetEveningBtn.addEventListener('click', () => {
    eveningProgress = {};
    localStorage.removeItem('eveningProgress');
    renderAzkar('evening');
    showToast('🔄 تم إعادة تعيين أذكار المساء', 'info');
  });
}

// عرض الأدعية مع أيقونة
function renderDuas(filterCategory = 'الكل') {
  // إنشاء أزرار التصنيف
  const categories = ['الكل', ...new Set(duas.map(d => d.category))];
  duaCategories.innerHTML = categories.map(cat => 
    `<button class="filter-tab ${cat === filterCategory ? 'active' : ''}" data-cat="${cat}">${cat}</button>`
  ).join('');

  duaCategories.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => renderDuas(btn.dataset.cat));
  });

  const filtered = filterCategory === 'الكل' ? duas : duas.filter(d => d.category === filterCategory);
  duaContainer.innerHTML = filtered.map(dua => `
    <div class="dua-card" data-id="${dua.id}">
      <div class="dua-text">
        <i class="fas fa-heart dua-icon"></i> <!-- أيقونة ثابتة لجميع الأدعية -->
        ${dua.text}
      </div>
      <div class="dua-actions">
        <button class="copy-btn" data-text="${dua.text.replace(/"/g, '&quot;')}"><i class="fas fa-copy"></i> نسخ</button>
        <button class="share-btn" data-text="${dua.text.replace(/"/g, '&quot;')}"><i class="fas fa-share-alt"></i> مشاركة</button>
      </div>
    </div>
  `).join('');

  // نسخ ومشاركة
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.text;
      navigator.clipboard?.writeText(text).then(() => showToast('📋 تم النسخ')).catch(() => fallbackCopy(text));
    });
  });

  document.querySelectorAll('.share-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.text;
      if (navigator.share) navigator.share({ text }).catch(() => {});
      else fallbackCopy(text, 'تم النسخ للمشاركة');
    });
  });
}

function fallbackCopy(text, msg = 'تم النسخ') {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  showToast(`📋 ${msg}`);
}

// عرض الورد اليومي مع إمكانية النقر للانتقال
function renderWird() {
  const total = dailyWird.length;
  const completedCount = dailyWird.filter(item => wirdProgress[item.id]).length;
  const percent = Math.round((completedCount / total) * 100) || 0;
  wirdProgressDiv.style.width = percent + '%';
  wirdProgressDiv.innerText = percent + '%';

  wirdListContainer.innerHTML = dailyWird.map(item => `
    <div class="wird-item ${wirdProgress[item.id] ? 'completed' : ''}" data-task-id="${item.id}">
      <span>${item.task}</span>
      <input type="checkbox" data-id="${item.id}" ${wirdProgress[item.id] ? 'checked' : ''} onclick="event.stopPropagation();">
    </div>
  `).join('');

  // إضافة حدث النقر على العنصر (باستثناء الـ checkbox)
  document.querySelectorAll('.wird-item').forEach(item => {
    item.addEventListener('click', function(e) {
      if (e.target.tagName === 'INPUT') return;

      const taskId = this.dataset.taskId;
      const task = dailyWird.find(t => t.id === taskId);
      if (!task) return;

      const taskText = task.task;

      if (taskText.includes('أذكار الصباح')) {
        showSection('azkarMorningSection');
        showToast('🕌 أذكار الصباح - اقرأ وسبح');
      }
      else if (taskText.includes('أذكار المساء')) {
        showSection('azkarEveningSection');
        showToast('🌙 أذكار المساء - رطب لسانك');
      }
      else if (taskText.includes('قراءة جزء من القرآن')) {
        showToast('📖 افتح المصحف الشريف واقرأ وردك اليومي', 'info');
      }
      else if (taskText.includes('١٠٠ تسبيحة')) {
        showSection('tasbeehSection');
        tasbeehType.value = 'سبحان الله';
        tasbeehState.type = 'سبحان الله';
        localStorage.setItem('tasbeehState', JSON.stringify(tasbeehState));
        showToast('🔘 سبحان الله - كبر وسبح');
      }
      else if (taskText.includes('استغفار')) {
        showSection('tasbeehSection');
        tasbeehType.value = 'أستغفر الله';
        tasbeehState.type = 'أستغفر الله';
        localStorage.setItem('tasbeehState', JSON.stringify(tasbeehState));
        showToast('🕊️ أستغفر الله - أكثر من الاستغفار');
      }
      else if (taskText.includes('الصلاة على النبي')) {
        showSection('tasbeehSection');
        tasbeehType.value = 'اللهم صل وسلم على نبينا محمد';
        tasbeehState.type = 'اللهم صل وسلم على نبينا محمد';
        localStorage.setItem('tasbeehState', JSON.stringify(tasbeehState));
        showToast('💐 اللهم صل على محمد - صلوا عليه');
      }
      else if (taskText.includes('دعاء اليوم')) {
        showSection('duaSection');
        showToast('🤲 اختر دعاءً من القائمة');
      }
    });
  });

  // معالجة تغيير الـ checkbox بشكل منفصل
  wirdListContainer.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', function(e) {
      e.stopPropagation();
      const id = this.dataset.id;
      if (this.checked) wirdProgress[id] = true;
      else delete wirdProgress[id];
      localStorage.setItem('wirdProgress', JSON.stringify(wirdProgress));
      renderWird();
      showToast('📊 تم تحديث الورد');
    });
  });
}

// إعادة ضبط الورد اليومي
resetWirdBtn.addEventListener('click', () => {
  wirdProgress = {};
  localStorage.removeItem('wirdProgress');
  renderWird();
  showToast('🔄 تم إعادة ضبط الورد');
});

// التسبيح
function loadTasbeeh() {
  tasbeehType.value = tasbeehState.type;
  tasbeehCount.innerText = tasbeehState.count;
}

tasbeehType.addEventListener('change', function() {
  tasbeehState.type = this.value;
  localStorage.setItem('tasbeehState', JSON.stringify(tasbeehState));
});

tasbeehIncrement.addEventListener('click', function() {
  tasbeehState.count++;
  tasbeehCount.innerText = tasbeehState.count;
  localStorage.setItem('tasbeehState', JSON.stringify(tasbeehState));
  // لا نعرض Toast مع كل ضغطة
});

resetTasbeeh.addEventListener('click', function() {
  tasbeehState.count = 0;
  tasbeehCount.innerText = '0';
  localStorage.setItem('tasbeehState', JSON.stringify(tasbeehState));
  showToast('🔄 تم التصفير');
});

// ========= دوال مواقيت الصلاة والأذان (مُحسّنة) =========
async function loadPrayerTimes(city = prayerTimesState.city) {
  try {
    prayerTimesContainer.innerHTML = '<div class="loading-prayer">جاري تحميل مواقيت الصلاة...</div>';
    
    // الحصول على إحداثيات المدينة
    const cityCoords = await getCityCoordinates(city);
    
    const today = new Date();
    const dateStr = `${today.getDate()}-${today.getMonth()+1}-${today.getFullYear()}`;
    
    // استخدام API aladhan.com (موثوق)
    const response = await fetch(
      `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${cityCoords.lat}&longitude=${cityCoords.lng}&method=${prayerTimesState.method}`
    );
    
    if (!response.ok) throw new Error('فشل الاتصال بالخادم');
    
    const data = await response.json();
    
    if (data.code === 200) {
      const timings = data.data.timings;
      const date = data.data.date;
      
      prayerTimesState.timings = timings;
      prayerTimesState.date = date;
      prayerTimesState.lastFetch = new Date().toISOString();
      localStorage.setItem('prayerTimesState', JSON.stringify(prayerTimesState));
      
      displayPrayerTimes(timings);
      displayHijriDate(date);
      updateNextPrayer(timings);
      
      // تشغيل الأذان إذا كانت الصلاة الآن
      playAzanIfPrayerTime(timings);
    } else {
      throw new Error('فشل تحميل المواقيت');
    }
  } catch (error) {
    console.error('خطأ في تحميل مواقيت الصلاة:', error);
    prayerTimesContainer.innerHTML = '<div class="loading-prayer">⚠️ حدث خطأ في تحميل المواقيت. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.</div>';
    
    // محاولة استخدام بيانات مخزنة قديمة
    if (prayerTimesState.timings) {
      prayerTimesContainer.innerHTML = '<div class="loading-prayer">📋 عرض آخر مواقيت محفوظة</div>';
      displayPrayerTimes(prayerTimesState.timings);
      displayHijriDate(prayerTimesState.date);
      updateNextPrayer(prayerTimesState.timings);
    }
  }
}

async function getCityCoordinates(city) {
  // خريطة إحداثيات للمدن المذكورة (يمكن توسيعها)
  const cityMap = {
    'Cairo': { lat: 30.0444, lng: 31.2357 },
    'Riyadh': { lat: 24.7136, lng: 46.6753 },
    'Dubai': { lat: 25.2048, lng: 55.2708 },
    'Mecca': { lat: 21.3891, lng: 39.8579 },
    'Medina': { lat: 24.5247, lng: 39.5692 },
    'Alexandria': { lat: 31.2001, lng: 29.9187 },
    'Jeddah': { lat: 21.4858, lng: 39.1925 },
    'Doha': { lat: 25.2854, lng: 51.5310 },
    'Kuwait City': { lat: 29.3759, lng: 47.9774 },
    'Manama': { lat: 26.2285, lng: 50.5860 },
    'Muscat': { lat: 23.5880, lng: 58.3829 },
    'Amman': { lat: 31.9454, lng: 35.9284 },
    'Jerusalem': { lat: 31.7683, lng: 35.2137 },
    'Beirut': { lat: 33.8938, lng: 35.5018 },
    'Damascus': { lat: 33.5138, lng: 36.2765 },
    'Baghdad': { lat: 33.3152, lng: 44.3661 },
    'Khartoum': { lat: 15.5007, lng: 32.5599 },
    'Tripoli': { lat: 32.8872, lng: 13.1913 },
    'Tunis': { lat: 36.8065, lng: 10.1815 },
    'Algiers': { lat: 36.7538, lng: 3.0588 },
    'Rabat': { lat: 34.0209, lng: -6.8416 },
    'Nouakchott': { lat: 18.0735, lng: -15.9582 }
  };
  return cityMap[city] || { lat: 30.0444, lng: 31.2357 }; // افتراضي القاهرة
}

function displayPrayerTimes(timings) {
  const prayers = [
    { name: 'الفجر', key: 'Fajr', icon: 'fa-sun' },
    { name: 'الشروق', key: 'Sunrise', icon: 'fa-sun' },
    { name: 'الظهر', key: 'Dhuhr', icon: 'fa-sun' },
    { name: 'العصر', key: 'Asr', icon: 'fa-sun' },
    { name: 'المغرب', key: 'Maghrib', icon: 'fa-sun' },
    { name: 'العشاء', key: 'Isha', icon: 'fa-moon' }
  ];
  
  let html = '';
  prayers.forEach(prayer => {
    const time = timings[prayer.key] || '--:--';
    const formattedTime = formatTime(time);
    html += `
      <div class="prayer-row">
        <span class="prayer-name">
          <i class="fas ${prayer.icon}"></i>
          ${prayer.name}
        </span>
        <span class="prayer-time">${formattedTime}</span>
      </div>
    `;
  });
  prayerTimesContainer.innerHTML = html;
}

function formatTime(time) {
  const match = time.match(/(\d{2}:\d{2})/);
  return match ? match[1] : time;
}

function displayHijriDate(date) {
  if (date && date.hijri) {
    const hijri = date.hijri;
    hijriDate.innerHTML = `
      <i class="fas fa-calendar-alt"></i>
      ${hijri.day} ${hijri.month.ar} ${hijri.year} هـ
      - ${date.readable}
    `;
  } else {
    hijriDate.innerHTML = '<i class="fas fa-calendar-alt"></i> جاري تحميل التاريخ الهجري...';
  }
}

function updateNextPrayer(timings) {
  const prayers = [
    { name: 'الفجر', key: 'Fajr' },
    { name: 'الشروق', key: 'Sunrise' },
    { name: 'الظهر', key: 'Dhuhr' },
    { name: 'العصر', key: 'Asr' },
    { name: 'المغرب', key: 'Maghrib' },
    { name: 'العشاء', key: 'Isha' }
  ];
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  let nextPrayer = null;
  let nextPrayerTimeMinutes = null;
  
  for (let prayer of prayers) {
    const timeStr = timings[prayer.key];
    const match = timeStr.match(/(\d{2}):(\d{2})/);
    if (match) {
      const prayerMinutes = parseInt(match[1]) * 60 + parseInt(match[2]);
      if (prayerMinutes > currentTime) {
        nextPrayer = prayer;
        nextPrayerTimeMinutes = prayerMinutes;
        break;
      }
    }
  }
  
  if (!nextPrayer) {
    nextPrayer = prayers[0]; // الفجر
    const match = timings['Fajr'].match(/(\d{2}):(\d{2})/);
    if (match) {
      nextPrayerTimeMinutes = parseInt(match[1]) * 60 + parseInt(match[2]) + 24 * 60;
    }
  }
  
  if (nextPrayer && nextPrayerTimeMinutes) {
    const diffMinutes = nextPrayerTimeMinutes - currentTime;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    nextPrayerName.textContent = nextPrayer.name;
    
    const timeStr = timings[nextPrayer.key];
    const match = timeStr.match(/(\d{2}:\d{2})/);
    nextPrayerTime.textContent = match ? match[1] : timeStr;
    
    if (hours > 0) {
      nextPrayerCountdown.textContent = `متبقي ${hours} ساعة و ${minutes} دقيقة`;
    } else {
      nextPrayerCountdown.textContent = `متبقي ${minutes} دقيقة`;
    }
  }
}

let countdownInterval;
function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    if (prayerTimesState.timings) {
      updateNextPrayer(prayerTimesState.timings);
    }
  }, 60000); // كل دقيقة
}

function detectUserLocation() {
  if (!navigator.geolocation) {
    showToast('⚠️ متصفحك لا يدعم تحديد الموقع', 'info');
    return;
  }
  
  showToast('📍 جاري تحديد موقعك...', 'info');
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        
        // استخدام reverse geocoding للحصول على اسم المدينة
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar`);
        const data = await response.json();
        
        let city = null;
        if (data.address) {
          city = data.address.city || data.address.town || data.address.village;
        }
        
        if (city) {
          // محاولة مطابقة المدينة مع القائمة المتاحة
          const matchedCity = findClosestCity(city, latitude, longitude);
          citySelect.value = matchedCity;
          prayerTimesState.city = matchedCity;
          localStorage.setItem('prayerTimesState', JSON.stringify(prayerTimesState));
          loadPrayerTimes(matchedCity);
          showToast(`✅ تم تحديد موقعك: ${city}`, 'success');
        } else {
          // إذا لم نتمكن من تحديد المدينة، نستخدم الإحداثيات مباشرة (غير مدعوم في API)
          loadPrayerTimes(prayerTimesState.city);
          showToast('📍 تم تحديد الموقع ولكن المدينة غير معروفة', 'info');
        }
      } catch (error) {
        console.error('خطأ في تحديد الموقع:', error);
        showToast('⚠️ فشل تحديد الموقع', 'info');
      }
    },
    (error) => {
      console.error('خطأ في تحديد الموقع:', error);
      showToast('⚠️ لم نتمكن من الوصول لموقعك', 'info');
    }
  );
}

function findClosestCity(userCity, lat, lng) {
  const availableCities = [
    'Cairo', 'Riyadh', 'Dubai', 'Mecca', 'Medina', 'Alexandria', 'Jeddah',
    'Doha', 'Kuwait City', 'Manama', 'Muscat', 'Amman', 'Jerusalem',
    'Beirut', 'Damascus', 'Baghdad', 'Khartoum', 'Tripoli', 'Tunis',
    'Algiers', 'Rabat', 'Nouakchott'
  ];
  
  for (let city of availableCities) {
    if (userCity.toLowerCase().includes(city.toLowerCase()) || 
        city.toLowerCase().includes(userCity.toLowerCase())) {
      return city;
    }
  }
  return 'Cairo'; // افتراضي
}

function playAzanIfPrayerTime(timings) {
  if (!azanEnabled) return;
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  for (let prayer of prayers) {
    const timeStr = timings[prayer];
    const match = timeStr.match(/(\d{2}):(\d{2})/);
    if (match) {
      const prayerMin = parseInt(match[1]) * 60 + parseInt(match[2]);
      // ضمن دقيقتين من وقت الصلاة
      if (Math.abs(currentMin - prayerMin) < 2) {
        if (adhanAudio) {
          adhanAudio.play().catch(e => console.log('تعذر تشغيل الأذان:', e));
        }
        break;
      }
    }
  }
}

// ========= دوال الإشعارات اليومية =========
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('⚠️ متصفحك لا يدعم الإشعارات', 'info');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    notificationPermission = true;
    notificationState.enabled = true;
    localStorage.setItem('notificationPermission', 'granted');
    localStorage.setItem('notificationState', JSON.stringify(notificationState));
    showToast('🔔 الإشعارات مفعلة', 'success');
    return true;
  }
  
  if (Notification.permission === 'denied') {
    showToast('🔕 تم رفض الإشعارات مسبقاً. يمكنك تفعيلها من إعدادات المتصفح', 'info');
    return false;
  }
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      notificationPermission = true;
      notificationState.enabled = true;
      localStorage.setItem('notificationPermission', 'granted');
      localStorage.setItem('notificationState', JSON.stringify(notificationState));
      showToast('🔔 تم تفعيل الإشعارات بنجاح', 'success');
      
      // إرسال إشعار ترحيبي
      sendNotification('أذكار المسلم', 'شكراً لتفعيل الإشعارات! سنذكرك بأوقات الأذكار');
      return true;
    } else {
      showToast('🔕 لم يتم تفعيل الإشعارات', 'info');
      return false;
    }
  } catch (error) {
    console.error('خطأ في طلب الإشعارات:', error);
    return false;
  }
}

function sendNotification(title, body) {
  if (!notificationState.enabled && Notification.permission !== 'granted') {
    return false;
  }
  
  try {
    const notification = new Notification(title, {
      body: body,
      icon: 'https://cdn-icons-png.flaticon.com/512/1827/1827377.png', // أيقونة مسجد
      badge: 'https://cdn-icons-png.flaticon.com/512/1827/1827377.png'
    });
    
    notification.onclick = function() {
      window.focus();
      this.close();
    };
    
    return true;
  } catch (error) {
    console.error('خطأ في إرسال الإشعار:', error);
    return false;
  }
}

// التحقق من الوقت وإرسال الإشعارات اليومية
function checkDailyReminders() {
  if (!notificationState.enabled) return;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  // تذكير أذكار الصباح (بين 5:00 و 9:00 صباحاً)
  if (currentTime >= 300 && currentTime <= 540) { // 5:00 إلى 9:00
    if (notificationState.lastAzkarMorningDate !== todayStr) {
      sendNotification('🌅 تذكير بأذكار الصباح', 'حان وقت قراءة أذكار الصباح، رطب لسانك بذكر الله');
      notificationState.lastAzkarMorningDate = todayStr;
      localStorage.setItem('notificationState', JSON.stringify(notificationState));
    }
  }

  // تذكير أذكار المساء (بين 15:00 و 19:00)
  if (currentTime >= 900 && currentTime <= 1140) { // 15:00 إلى 19:00
    if (notificationState.lastAzkarEveningDate !== todayStr) {
      sendNotification('🌙 تذكير بأذكار المساء', 'أمسينا وأمسى الملك لله، اقرأ أذكار المساء');
      notificationState.lastAzkarEveningDate = todayStr;
      localStorage.setItem('notificationState', JSON.stringify(notificationState));
    }
  }

  // تذكير الورد اليومي (في المساء مثلاً 20:00 إلى 20:30)
  if (currentTime >= 1200 && currentTime <= 1230) { // 20:00 إلى 20:30
    if (notificationState.lastWirdDate !== todayStr) {
      const total = dailyWird.length;
      const completedCount = dailyWird.filter(item => wirdProgress[item.id]).length;
      const percent = Math.round((completedCount / total) * 100) || 0;
      sendNotification('📊 تذكير بالورد اليومي', `أنجزت ${percent}% من وردك اليومي. تذكر إكمال الباقي.`);
      notificationState.lastWirdDate = todayStr;
      localStorage.setItem('notificationState', JSON.stringify(notificationState));
    }
  }
}

// إضافة زر طلب الإشعارات في الصفحة الرئيسية
function addNotificationButton() {
  const homeSection = document.getElementById('homeSection');
  if (!homeSection) return;
  if (document.getElementById('notificationRequestBtn')) return;
  
  const notificationBtn = document.createElement('button');
  notificationBtn.id = 'notificationRequestBtn';
  notificationBtn.className = 'notification-request-btn';
  notificationBtn.innerHTML = '<i class="fas fa-bell"></i> تفعيل الإشعارات اليومية';
  
  notificationBtn.addEventListener('click', async () => {
    await requestNotificationPermission();
    notificationBtn.style.display = 'none'; // إخفاء بعد التفعيل
  });
  
  const homeGrid = homeSection.querySelector('.home-grid');
  if (homeGrid) {
    homeGrid.insertAdjacentElement('afterend', notificationBtn);
  }
}

// ========= ربط الأحداث الجديدة =========
if (citySelect) {
  citySelect.addEventListener('change', function() {
    prayerTimesState.city = this.value;
    localStorage.setItem('prayerTimesState', JSON.stringify(prayerTimesState));
    loadPrayerTimes();
  });
}

if (detectLocationBtn) {
  detectLocationBtn.addEventListener('click', detectUserLocation);
}

if (refreshPrayerBtn) {
  refreshPrayerBtn.addEventListener('click', () => {
    loadPrayerTimes(prayerTimesState.city);
    showToast('🔄 تم تحديث المواقيت', 'info');
  });
}

// الوضع الليلي
function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  darkMode = !darkMode;
  localStorage.setItem('darkMode', darkMode);
  themeToggle.innerHTML = darkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// البحث العام
globalSearch.addEventListener('input', function(e) {
  const term = e.target.value.trim().toLowerCase();
  if (term.length < 2) return;

  const morningResults = azkarMorning.filter(z => z.text.includes(term));
  const eveningResults = azkarEvening.filter(z => z.text.includes(term));
  const duaResults = duas.filter(d => d.text.includes(term));

  if (morningResults.length || eveningResults.length || duaResults.length) {
    showToast(`🔍 تم العثور على ${morningResults.length+eveningResults.length+duaResults.length} نتيجة`, 'info');
  } else {
    showToast('😕 لا توجد نتائج', 'info');
  }
});

// Toast notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerText = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// تهيئة التطبيق
renderAzkar('morning');
renderAzkar('evening');
renderDuas('الكل');
renderWird();
loadTasbeeh();

// أيقونة الثيم
themeToggle.innerHTML = darkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';

// تهيئة الإشعارات
if ('Notification' in window) {
  notificationPermission = Notification.permission === 'granted';
  if (notificationPermission) {
    notificationState.enabled = true;
    localStorage.setItem('notificationPermission', 'granted');
  }
}

// إضافة زر طلب الإشعارات إذا لم تكن مفعلة
setTimeout(() => {
  if (!notificationPermission && !notificationState.enabled) {
    addNotificationButton();
  }
}, 1000);

// بدء العد التنازلي لمواقيت الصلاة
startCountdown();

// التحقق من الإشعارات والأذان كل دقيقة
setInterval(() => {
  if (prayerTimesState.timings) {
    playAzanIfPrayerTime(prayerTimesState.timings);
  }
  checkDailyReminders(); // فحص الإشعارات اليومية
}, 60000);