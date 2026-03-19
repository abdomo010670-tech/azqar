// File: script.js (محدث - إزالة Toast التقدم في الأذكار)
// ====================== التطبيق الرئيسي (نسخة كاملة مع تحسينات) ======================

// ---------- الحالة العامة ----------
let currentSection = 'homeSection';
let morningProgress = JSON.parse(localStorage.getItem('morningProgress')) || {};
let eveningProgress = JSON.parse(localStorage.getItem('eveningProgress')) || {};
let wirdProgress = JSON.parse(localStorage.getItem('wirdProgress')) || {};
let tasbeehState = JSON.parse(localStorage.getItem('tasbeehState')) || { type: 'سبحان الله', count: 0 };
let darkMode = localStorage.getItem('darkMode') === 'true';

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

// عرض الأذكار (صباح / مساء) مع إلغاء Toast التقدم
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
      const currentCount = parseInt(document.getElementById(`count-${id}`).innerText);
      
      if (currentCount < max) {
        const newCount = currentCount + 1;
        document.getElementById(`count-${id}`).innerText = newCount;
        saveProgress(type, id, newCount);
        
        if (newCount >= max) {
          this.classList.add('completed');
          this.closest('.zkr-card').classList.add('completed');
          showToast(`✅ تم إكمال الذكر (${newCount}/${max})`, 'success');
        }
        // تم إزالة Toast التقدم (الـ else block)
      } else {
        showToast(`📿 لقد أكملت هذا الذكر بالفعل (${currentCount}/${max})`, 'info');
      }
    });
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
      // إذا كان الضغط على الـ checkbox نفسه، لا تفعل شيئًا إضافيًا
      if (e.target.tagName === 'INPUT') return;

      const taskId = this.dataset.taskId;
      const task = dailyWird.find(t => t.id === taskId);
      if (!task) return;

      // توجيه المستخدم بناءً على نص المهمة
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
  // اختياري: إبقاء Toast للتسبيح (يمكن إزالته إذا أراد المستخدم)
  showToast(`📿 ${tasbeehState.type} - ${tasbeehState.count}`, 'info');
});

resetTasbeeh.addEventListener('click', function() {
  tasbeehState.count = 0;
  tasbeehCount.innerText = '0';
  localStorage.setItem('tasbeehState', JSON.stringify(tasbeehState));
  showToast('🔄 تم التصفير');
});

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