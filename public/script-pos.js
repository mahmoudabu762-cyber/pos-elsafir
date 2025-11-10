console.log("✅ السكربت اتحمّل");
console.log("📡 الاتصال بـ Firebase:", db, auth, storage);

import { db, auth, storage } from "./firebase-config.js";

import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.5.2/firebase-storage.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";



onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ المستخدم مسجل دخول:", user.uid);
    window.currentUser = user; // نخزن المستخدم في متغير عام
  } else {
    console.warn("❌ المستخدم غير مسجل دخول");
    window.currentUser = null;
  }
});

// ✅ دالة التوست

// ✅ دالة التوست

// ✅ دالة تحميل الرسائل
function listenForMessages() {
  const container = document.getElementById("messageList");
  container.innerHTML = `
  <div style="text-align:center; padding:20px; color:#555;">
    <img src="https://i.gifer.com/ZZ5H.gif" alt="No messages" style="width:60px; height:60px;"><br>
    <div style="margin-top:10px; font-size:18px;">📭 لا توجد رسائل حالياً.</div>
  </div>
`;
  const currentUser = localStorage.getItem("userName") || "مستخدم";
  const currentRole = localStorage.getItem("userRole") || "كاشير";

  const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));

  onSnapshot(q, (snapshot) => {
    container.innerHTML = "";

    if (snapshot.empty) {
  container.textContent = "📭 لا توجد رسائل حالياً.";
  return;
}


    snapshot.forEach(messageDoc => {
      const msg = messageDoc.data();

      // ✅ المدير يشوف كل الرسائل، غير المدير يشوف فقط الرسائل الموجهة له
      if (currentRole !== "مدير" && msg.recipient !== currentUser) return;

      const ts = msg.timestamp?.toDate();
      const time = ts ? ts.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "بدون وقت";
      const date = ts ? ts.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "بدون تاريخ";

      const div = document.createElement("div");
      div.style = "padding: 8px; margin-bottom: 5px; background: #e0f7fa; border-radius: 5px;";
      div.style.whiteSpace = "normal";
      div.style.wordBreak = "break-word";

      div.innerHTML = `
        <div style="font-weight:bold; margin-bottom:4px;color:#669;">🧑 ${msg.sender} (${msg.role})</div>
        <div style="margin-bottom:6px;color:#668;">💬 ${msg.text}</div>
        <div style="font-size:12px; color:#668;">📅 ${date} - 🕒 ${time}</div>
      `;

      // ✅ زر الحذف
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️ حذف";
      deleteBtn.style = "margin-top: 5px; background: red; color: white; border: none; padding: 4px 8px; border-radius: 4px;";
      deleteBtn.onclick = async () => {
  const confirmDelete = confirm("⚠️ هل أنت متأكد أنك تريد حذف هذه الرسالة؟");
  if (!confirmDelete) return;

  try {
    await deleteDoc(doc(db, "messages", messageDoc.id));
    div.remove();
  } catch (err) {
    console.error("❌ فشل حذف الرسالة:", err.message);
  }
};

      div.appendChild(deleteBtn);
      container.appendChild(div);
    });

    container.scrollTop = container.scrollHeight;
  }, (error) => {
    container.textContent = "❌ فشل تحميل الرسائل.";
    console.error("💥 خطأ في onSnapshot:", error.message);
  });
}


async function loadRecipients() {
  const select = document.getElementById("recipientSelect");
  if (!select) {
    console.warn("❌ عنصر القائمة مش موجود");
    return;
  }

  select.innerHTML = `<option value="">اختر المستلم</option>`;
  console.log("📥 جاري تحميل المستخدمين...");

  try {
    const snapshot = await getDocs(collection(db, "users"));
    console.log("📦 عدد المستخدمين:", snapshot.size);

    snapshot.forEach(doc => {
      const data = doc.data();
      console.log("👤 مستخدم:", data.name, "| الدور:", data.role);

      const option = document.createElement("option");
      option.value = data.name;
      option.textContent = `${data.name} (${data.role})`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("❌ فشل تحميل المستخدمين:", err.message);
  }
}


// ✅ تحميل بيانات المستخدم + الملاحظات + الرسائل
window.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.replace("index.html");
      return;
    }
await loadRecipients(); // ✅ تحميل قائمة المستلمين

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.warn("❌ لا يوجد مستند للمستخدم");
        window.location.replace("index.html");
        return;
      }

      const data = userSnap.data();
      const { name, branch, role } = data;

      const userInfo = document.getElementById("userInfo");
      if (userInfo) {
        userInfo.innerHTML = `
          👤 <strong>${name}</strong><br>
          🧩 الدور: ${role}<br>
          🏢 الفرع: ${branch}
        `;
      }

      const today = new Date().toISOString().split("T")[0];
      const noteKey = `${name}_${today}`;
      const noteSnap = await getDoc(doc(db, "notes", noteKey));

      if (noteSnap.exists()) {
        const note = noteSnap.data().text;
        showToast(`📅 ملاحظة اليوم: ${note}`);
      }

      if (role === "مدير" || role === "كاشير") {
        listenForMessages();
      }

    } catch (err) {
      console.error("💥 خطأ أثناء تحميل البيانات:", err.message);
    }
  });



  // ضبط الثيم حسب الاختيار
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
  } else {
    document.body.classList.remove("dark-theme");
  }

  // زر تبديل الوضع مع تأثير دخان وتنبيه
  const themeBtn = document.getElementById("themeToggle");
if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark-theme");

    // تأثير دخان
    const smoke = document.createElement("div");
    smoke.className = "smoke-effect";
    document.body.appendChild(smoke);
    setTimeout(() => smoke.remove(), 900);

    // تبديل الثيم
    html.classList.toggle("dark-theme");
    const newTheme = wasDark ? "light" : "dark";
    localStorage.setItem("theme", newTheme);

    // تنبيه أنيق
    showToast(`🌗 تم تبديل المظهر إلى: ${newTheme === "dark" ? "داكن" : "فاتح"}`);
  });
}


  // تشغيل الساعة
  function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const dateString = now.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const clockEl = document.getElementById("clock");
    if (clockEl) {
      clockEl.textContent = `🕒 ${timeString} | 📅 ${dateString}`;
    }
  }
  updateClock();
  setInterval(updateClock, 1000);

  // تحميل الشاشة الأخيرة
  const lastScreen = localStorage.getItem("lastScreen") || "msgScreen";
  showScreen(lastScreen);

  // تحميل العدادات
  countMessages();
  updateStockCount(5);
});



// الساعة والتاريخ
function updateClock() {
  const clock = document.getElementById("clock");
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const daysArabic = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const dayName = daysArabic[now.getDay()];
  const greeting = hh < 12 ? "صباح الخير" : "مساء الخير";
  clock.textContent = `🕒 ${hh}:${mm}:${ss} | 📅 ${dayName} ${dd}/${mo}/${yyyy} | ${greeting}`;
if (now.getMinutes() === 0 && now.getSeconds() === 0) {
  showToast("⏰ ساعة جديدة بدأت الآن");
}
if (now.getMinutes() === 0 && now.getSeconds() === 0) {
  getDoc(doc(db, "notes", noteKey)).then(snapshot => {
    if (snapshot.exists()) {
      const note = snapshot.data().text;
      showToast(`⏰ تذكير الساعة: ${note}`);
    }
  });
}

}

// عرض شاشة معينة
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.style.display = "none";
  });

  const target = document.getElementById(id);
  if (target) {
    target.style.display = "block";
    localStorage.setItem("lastScreen", id);
    if (id === "msgScreen") listenForMessages();
    if (id === "calendarScreen") loadNotes();
  }

  const dropdown = document.getElementById("settingsDropdown");
  if (dropdown) dropdown.style.display = "none";
}
window.showScreen = showScreen;

// عرض نموذج إعدادات
function showSettingsForm(formId) {
  document.querySelectorAll(".settings-form").forEach(form => {
    form.style.display = "none";
  });
  document.getElementById(formId).style.display = "block";
}
window.showSettingsForm = showSettingsForm;

// زر الإعدادات
function toggleDropdown() {
  const dropdown = document.getElementById("settingsDropdown");
  dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}
window.toggleDropdown = toggleDropdown;

// زر الخروج
function logout() {
  localStorage.clear();
  sessionStorage.setItem("loggedOut", "true");
  window.location.href = "goodbye.html";
}
window.logout = logout;

// إرسال رسالة
async function sendMessage() {
  const input = document.getElementById("chatInput");
  const status = document.getElementById("sendStatus");
  const recipient = document.getElementById("recipientSelect")?.value;
  const message = input?.value.trim();

  if (!message) {
    status.textContent = "❌ اكتب الرسالة أولاً";
    status.style.color = "red";
    status.style.display = "block";
    return;
  }

  if (!recipient) {
    status.textContent = "❌ اختر المستلم أولاً";
    status.style.color = "red";
    status.style.display = "block";
    return;
  }

  const name = localStorage.getItem("userName") || "مستخدم";
  const role = localStorage.getItem("userRole") || "كاشير";

  try {
    await addDoc(collection(db, "messages"), {
      sender: name,
      role: role,
      recipient: recipient,
      text: message,
      timestamp: serverTimestamp()
    });

    input.value = "";
    status.textContent = "✅ تم إرسال الرسالة";
    status.style.color = "green";
    status.style.display = "block";
    setTimeout(() => status.style.display = "none", 3000);
  } catch (err) {
    status.textContent = "❌ فشل إرسال الرسالة";
    status.style.color = "red";
    status.style.display = "block";
    console.error("💥 خطأ أثناء إرسال الرسالة:", err.message);
  }
}
window.sendMessage = sendMessage;

// تحميل الرسائل الحية

// عداد الرسائل
async function countMessages() {
  const q = query(collection(db, "messages"));
  const snapshot = await getDocs(q);
  updateMessageCount(snapshot.size);
}

function updateMessageCount(count) {
  const badge = document.getElementById("msgCount");
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-block" : "none";
  }
}

// عداد المنتهية
function updateStockCount(count) {
  const badge = document.getElementById("stockCount");
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-block" : "none";
  }
}

// نافذة كلمة السر
function openPasswordModal() {
  document.getElementById("passwordModal").style.display = "flex";
}
window.openPasswordModal = openPasswordModal;

function closePasswordModal() {
  document.getElementById("passwordModal").style.display = "none";
}
window.closePasswordModal = closePasswordModal;

function verifySettingsPassword() {
  const input = document.getElementById("settingsPassword").value;
  const status = document.getElementById("authStatus");

  if (input === "1989") {
    status.textContent = "✅ تم التحقق بنجاح";
    document.getElementById("passwordModal").style.display = "none";
    const dropdown = document.getElementById("settingsDropdown");
const settingsBtn = document.querySelector(".icon-button[onclick*='openPasswordModal']");

if (settingsBtn) {
  const rect = settingsBtn.getBoundingClientRect();
  dropdown.style.position = "absolute";
  dropdown.style.top = `${rect.bottom + window.scrollY + 5}px`;
  dropdown.style.right = `${window.innerWidth - rect.right}px`;
  dropdown.style.display = "block";
}

  } else {
    status.textContent = "❌ كلمة السر غير صحيحة";
  }
}

window.verifySettingsPassword = verifySettingsPassword;

// التقويم: حفظ وتحميل وتعديل وحذف
// التقويم: حفظ وتحميل وتعديل وحذف
function openCalendar() {
  showScreen("calendarScreen");
  //loadNotes(); // تحميل الملاحظات عند فتح الشاشة
}
window.openCalendar = openCalendar;

async function saveNote() {
  const date = document.getElementById("calendarDate").value;
  const note = document.getElementById("calendarNote").value.trim();
  const name = localStorage.getItem("userName");

  if (!date || !note) {
    showNoteStatus("⚠️ أدخل التاريخ والملاحظة.", "red");
    return;
  }

  try {
    await setDoc(doc(db, "notes", `${name}_${date}`), {
      user: name,
      date: date,
      text: note
    });

    document.getElementById("calendarNote").value = "";
    showNoteStatus("✅ تم حفظ الملاحظة بنجاح.", "green");
   // loadNotes();
  } catch (error) {
    showNoteStatus("❌ فشل الحفظ: " + error.message, "red");
  }
}
window.saveNote = saveNote;

async function loadNotes() {
  const name = localStorage.getItem("userName");
  const noteList = document.getElementById("noteList");
  noteList.innerHTML = "";

  try {
    const snapshot = await getDocs(collection(db, "notes"));
    const notes = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.user === name) {
        notes.push(data);
      }
    });

    if (notes.length === 0) {
      noteList.innerHTML = "<p>لا توجد ملاحظات محفوظة.</p>";
      return;
    }

    notes.sort((a, b) => a.date.localeCompare(b.date));

    notes.forEach(({ date, text }) => {
      const div = document.createElement("div");
      div.className = "note-box";
      div.innerHTML = `
        <strong>📅 ${date}</strong><br>
        📝 <span id="note-${date}">${text}</span><br>
        <button onclick="editNote('${date}')">✏️ تعديل</button>
        <button onclick="deleteNote('${date}')">🗑 حذف</button>
      `;
      noteList.appendChild(div);
    });
  } catch (error) {
    noteList.innerHTML = "<p>❌ فشل التحميل: " + error.message + "</p>";
  }
}
window.loadNotes = loadNotes;

async function editNote(date) {
  const name = localStorage.getItem("userName");
  const currentText = document.getElementById(`note-${date}`).textContent;
  const newNote = prompt("📝 اكتب الملاحظة الجديدة:", currentText);

  if (newNote !== null && newNote.trim() !== "") {
    try {
      await setDoc(doc(db, "notes", `${name}_${date}`), {
        user: name,
        date: date,
        text: newNote.trim()
      });

      document.getElementById(`note-${date}`).textContent = newNote.trim();
      alert("✅ تم تعديل الملاحظة.");
    } catch (error) {
      alert("❌ فشل التعديل: " + error.message);
    }
  }
}
window.editNote = editNote;

async function deleteNote(date) {
  const name = localStorage.getItem("userName");
  if (confirm("⚠️ هل أنت متأكد من حذف هذه الملاحظة؟")) {
    try {
      await deleteDoc(doc(db, "notes", `${name}_${date}`));
      loadNotes();
      alert("🗑 تم حذف الملاحظة.");
    } catch (error) {
      alert("❌ فشل الحذف: " + error.message);
    }
  }
}
window.deleteNote = deleteNote;

function showNoteStatus(message, color) {
  const status = document.getElementById("noteStatus");
  status.textContent = message;
  status.style.color = color;
  status.style.fontWeight = "bold";
}
window.openCalendar = openCalendar;
window.saveNote = saveNote;
window.loadNotes = loadNotes;
window.editNote = editNote;
window.deleteNote = deleteNote;

function showToast(message) {
  const toast = document.getElementById("topToast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 4000);
}
setTimeout(() => {
  const btn = document.getElementById("themeToggle");
  if (btn) {
    btn.addEventListener("click", () => {
      document.body.classList.toggle("dark-theme");
      const newTheme = document.body.classList.contains("dark-theme") ? "dark" : "light";
      localStorage.setItem("theme", newTheme);
      showToast(`🌗 تم تبديل المظهر إلى: ${newTheme === "dark" ? "داكن" : "فاتح"}`);
    });
  } else {
    console.warn("زر تبديل الثيم غير موجود في الصفحة.");
  }
}, 500); 
// تأخير بسيط لضمان تحميل الزر

function hideDropdown() {
  const dropdown = document.getElementById("settingsDropdown");
  if (dropdown) {
    dropdown.style.display = "none";
  }
}
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = "flex";
  } else {
    console.warn("❌ لم يتم العثور على النافذة:", id);
  }
}
window.openModal = openModal;

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = "none";
  }
}
window.closeModal = closeModal;


// دالة التصنيف حفظ وتعديل وحذف 

// ✅ دالة حفظ التصنيف
async function saveCategory() {
  const name = document.getElementById("categoryName").value.trim();
  const imageFile = document.getElementById("categoryImage").files[0];
  const status = document.getElementById("categoryStatus");

  if (!name) {
    status.textContent = "⚠️ أدخل اسم التصنيف";
    status.style.color = "red";
    return;
  }

  let imageName = null;
  if (imageFile) {
    const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
    const ext = imageFile.name.split(".").pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      status.textContent = "❌ امتداد غير مسموح. استخدم صورة بصيغة JPG أو PNG أو WEBP فقط.";
      status.style.color = "red";
      return;
    }
    imageName = imageFile.name;
  }

  try {
    const docRef = await addDoc(collection(db, "categories"), {
      categoryName: name,
      imageName: imageName || null,
      imageUrl: "", // 👈 نسيب الرابط فاضي
      createdAt: serverTimestamp()
    });

    status.textContent = "✅ تم حفظ التصنيف";
    status.style.color = "green";

    document.getElementById("categoryName").value = "";
    document.getElementById("categoryImage").value = "";
    loadCategoriesList();
  } catch (err) {
    console.error("❌ خطأ في الحفظ:", err);
    status.textContent = "❌ فشل الحفظ: " + err.message;
    status.style.color = "red";
  }
}







// ✅ دالة فحص العمليات المرتبطة (غير مفعّلة حاليًا)
async function hasCategoryTransactions(categoryId) {
  const q = query(collection(db, "transactions"), where("categoryId", "==", categoryId));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// ✅ بدء تعديل التصنيف
function editCategory(id, name, imageName) {
  const nameInput = document.getElementById("categoryName");
  const imageInput = document.getElementById("categoryImage");
  const saveBtn = document.getElementById("categorySaveBtn");
  const status = document.getElementById("categoryStatus");

  nameInput.value = name;
  imageInput.value = "";

  saveBtn.textContent = "🔄 تعديل التصنيف";
  saveBtn.onclick = () => updateCategory(id);

  status.textContent = "📝 جاهز لتعديل التصنيف (⚠️ فحص العمليات غير مفعّل)";
  status.style.color = "blue";
}
window.editCategory = editCategory;

// ✅ تنفيذ التعديل
async function updateCategory(id) {
  const name = document.getElementById("categoryName").value.trim();
  const imageFile = document.getElementById("categoryImage").files[0];
  const status = document.getElementById("categoryStatus");

  if (!name) {
    status.textContent = "⚠️ أدخل اسم التصنيف";
    status.style.color = "red";
    return;
  }

  // ✅ فحص العمليات المرتبطة (جاهز للتفعيل لاحقًا)
  // try {
  //   const hasOps = await hasCategoryTransactions(id);
  //   if (hasOps) {
  //     const confirmEdit = confirm("⚠️ هذا التصنيف مرتبط بعمليات. هل تريد تعديل البيانات؟");
  //     if (!confirmEdit) return;
  //   }
  // } catch (err) {
  //   console.error("❌ خطأ في فحص العمليات:", err);
  //   status.textContent = "⚠️ فشل فحص العمليات: " + err.message;
  //   status.style.color = "orange";
  //   return;
  // }

  let imageName = null;
  if (imageFile) {
    const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
    const ext = imageFile.name.split(".").pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      status.textContent = "❌ امتداد غير مسموح. استخدم صورة بصيغة JPG أو PNG أو WEBP فقط.";
      status.style.color = "red";
      return;
    }
    imageName = imageFile.name;
  }

  try {
    const docRef = doc(db, "categories", id);
    const updateData = {
      categoryName: name,
      updatedAt: serverTimestamp()
    };
    if (imageName) updateData.imageName = imageName;

    await updateDoc(docRef, updateData);

    status.textContent = "✅ تم تعديل التصنيف";
    status.style.color = "green";

    document.getElementById("categoryName").value = "";
    document.getElementById("categoryImage").value = "";
    const saveBtn = document.getElementById("categorySaveBtn");
    saveBtn.textContent = "💾 حفظ التصنيف";
    saveBtn.onclick = saveCategory;

    loadCategoriesList();
  } catch (err) {
    console.error("❌ خطأ في التعديل:", err);
    status.textContent = "❌ فشل التعديل: " + err.message;
    status.style.color = "red";
  }
}

// ✅ حذف التصنيف
async function deleteCategory(id) {
  const status = document.getElementById("categoryStatus");

  // ✅ فحص العمليات المرتبطة (جاهز للتفعيل لاحقًا)
  // try {
  //   const hasOps = await hasCategoryTransactions(id);
  //   if (hasOps) {
  //     alert("⚠️ لا يمكن حذف هذا التصنيف لأنه مرتبط بعمليات.");
  //     return;
  //   }
  // } catch (err) {
  //   console.error("❌ خطأ في فحص العمليات:", err);
  //   status.textContent = "⚠️ فشل فحص العمليات: " + err.message;
  //   status.style.color = "orange";
  //   return;
  // }

  if (!confirm("⚠️ هل أنت متأكد من حذف هذا التصنيف؟")) return;

  try {
    await deleteDoc(doc(db, "categories", id));
    status.textContent = "🗑 تم حذف التصنيف";
    status.style.color = "orange";
    loadCategoriesList();
  } catch (err) {
    console.error("❌ خطأ في الحذف:", err);
    status.textContent = "❌ فشل الحذف: " + err.message;
    status.style.color = "red";
  }
}
window.deleteCategory = deleteCategory;

// ✅ تحميل وعرض التصنيفات
async function loadCategoriesList() {
  const container = document.getElementById("categoryList");
  container.innerHTML = "";

  try {
    const snapshot = await getDocs(collection(db, "categories"));

    const addButton = document.createElement("button");
    addButton.textContent = "➕ إضافة جديد";
    addButton.className = "add-category-btn";
    addButton.onclick = () => {
      document.getElementById("categoryName").value = "";
      document.getElementById("categoryImage").value = "";
      const saveBtn = document.getElementById("categorySaveBtn");
      saveBtn.textContent = "💾 حفظ التصنيف";
      saveBtn.onclick = saveCategory;
      document.getElementById("categoryStatus").textContent = "⚠️ فحص العمليات غير مفعّل حاليًا";
      document.getElementById("categoryStatus").style.color = "orange";
      openModal("categoryModal");
    };
    container.appendChild(addButton);

    if (snapshot.empty) {
      container.innerHTML += "<p>📭 لا توجد تصنيفات محفوظة.</p>";
      return;
    }

    const table = document.createElement("table");
    table.className = "styled-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>📁</th>
          <th>اسم التصنيف</th>
          <th>✏️</th>
          <th>🗑</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const row = document.createElement("tr");

      const imageCell = document.createElement("td");
      const imageBtn = document.createElement("button");
      imageBtn.textContent = "📁";
      imageBtn.className = "image-btn";
      imageBtn.onclick = () => {
        if (data.imageName) {
          const folderId = "1N00R75Wptxf0UB8OCnBW8ztU4b1sILe6";
          const imageName = data.imageName;
          const previewLink = `https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(imageName)}&parent=${folderId}`;
          window.open(previewLink, "_blank");
        } else {
          alert("📭 لا توجد صورة محفوظة لهذا التصنيف");
        }
      };
      imageCell.appendChild(imageBtn);

      const nameCell = document.createElement("td");
      nameCell.textContent = data.categoryName;

      const editCell = document.createElement("td");
      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️";
      editBtn.className = "edit-btn";
      editBtn.onclick = () => {
        editCategory(docSnap.id, data.categoryName, data.imageName);
      };
      editCell.appendChild(editBtn);

      const deleteCell = document.createElement("td");
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑";
      deleteBtn.className = "delete-btn";
      deleteBtn.onclick = () => {
        deleteCategory(docSnap.id);
      };
      deleteCell.appendChild(deleteBtn);

      row.appendChild(imageCell);
      row.appendChild(nameCell);
      row.appendChild(editCell);
      row.appendChild(deleteCell);
      tbody.appendChild(row);
    });

    container.appendChild(table);
  } catch (err) {
    console.error("❌ خطأ في تحميل التصنيفات:", err);
    container.innerHTML = "<p>❌ فشل تحميل التصنيفات</p>";
  }
}
window.loadCategoriesList = loadCategoriesList;






//نهاية دالة التصنيف
//كود شاشة حالة النظام 
async function loadGeneralSettings() {
  const container = document.getElementById("generalStatus");
  container.innerHTML = "⏳ جاري تحميل حالة النظام...";

  try {
    const [catSnap, prodSnap] = await Promise.all([
      getDocs(collection(db, "categories")),
      getDocs(collection(db, "products"))
    ]);

    const categoryCount = catSnap.size;
    const productCount = prodSnap.size;

    container.innerHTML = `
      ✅ عدد التصنيفات: ${categoryCount}<br>
      📦 عدد المنتجات: ${productCount}<br>
      🖼️ عدد الصور (تقريبي): ${categoryCount + productCount}<br><br>
      ⚠️ لا يمكن قراءة المساحة المستخدمة مباشرة من Firebase<br>
      📌 راجع Firebase Console → Storage → Usage<br>
      💡 الخطة المجانية تسمح بـ 1GB تخزين و 10GB تحميل شهريًا
    `;
  } catch (err) {
    container.innerHTML = "❌ فشل تحميل الحالة: " + err.message;
  }
}
window.loadGeneralSettings = loadGeneralSettings;
// دوال حفظ الفرع 
// حفظ الفرع
async function saveBranch() {
  const name = document.getElementById("branchName").value.trim();
  const status = document.getElementById("branchStatus");

  if (!name) {
    status.textContent = "⚠️ أدخل اسم الفرع";
    status.style.color = "red";
    return;
  }

  try {
    await setDoc(doc(db, "branches", name), {
      branchName: name,
      createdAt: serverTimestamp()
    });

    document.getElementById("branchName").value = "";
    status.textContent = "✅ تم حفظ الفرع بنجاح";
    status.style.color = "green";
    loadBranchesList();
  } catch (err) {
    status.textContent = "❌ فشل الحفظ: " + err.message;
    status.style.color = "red";
  }
}
window.saveBranch = saveBranch;

// عرض الفروع
async function loadBranchesList() {
  const container = document.getElementById("branchList");
  container.innerHTML = "";
  const snapshot = await getDocs(collection(db, "branches"));
  if (snapshot.empty) {
    container.innerHTML = "<p>📭 لا توجد فروع محفوظة.</p>";
    return;
  }

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "record-row";
    div.innerHTML = `
      <strong>${data.branchName}</strong>
      <button onclick="editBranch('${docSnap.id}', '${data.branchName}')">✏️ تعديل</button>
      <button onclick="deleteBranch('${docSnap.id}')">🗑 حذف</button>
    `;
    container.appendChild(div);
  });
}
window.loadBranchesList = loadBranchesList;
// دالة فحص الفروع 
async function hasBranchTransactions(branchId) {
  const q = query(collection(db, "transactions"), where("branchId", "==", branchId));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}
// حذف الفرع
async function editBranch(id, oldName) {
  const newName = prompt("✏️ أدخل الاسم الجديد للفرع:", oldName);
  const status = document.getElementById("branchStatus");
  if (!newName || newName.trim() === "") return;

  // 🛑 تم تعليق فحص العمليات مؤقتًا لحين إنشاء جدول الحركات
  // const hasOps = await hasBranchTransactions(id);
  // if (hasOps) {
  //   if (!confirm("⚠️ هذا الفرع مرتبط بعمليات. هل تريد تعديل الاسم؟")) return;
  // }

  try {
    const docRef = doc(db, "branches", id);
    await updateDoc(docRef, {
      branchName: newName.trim(),
      updatedAt: serverTimestamp()
    });

    status.textContent = "✅ تم تعديل الفرع";
    status.style.color = "green";
    loadBranchesList();
  } catch (err) {
    status.textContent = "❌ فشل التعديل: " + err.message;
    status.style.color = "red";
  }
}
window.editBranch = editBranch;

async function deleteBranch(id) {
  const status = document.getElementById("branchStatus");
  if (!confirm("⚠️ هل أنت متأكد من حذف الفرع؟")) return;

  // 🛑 تم تعليق فحص العمليات مؤقتًا لحين إنشاء جدول الحركات
  // const hasOps = await hasBranchTransactions(id);
  // if (hasOps) {
  //   status.textContent = "🚫 لا يمكن حذف هذا الفرع لأنه مرتبط بعمليات مسجلة";
  //   status.style.color = "red";
  //   return;
  // }

  try {
    await deleteDoc(doc(db, "branches", id));
    status.textContent = "🗑️ تم حذف الفرع";
    status.style.color = "green";
    loadBranchesList();
  } catch (err) {
    status.textContent = "❌ فشل الحذف: " + err.message;
    status.style.color = "red";
  }
}
window.deleteBranch = deleteBranch;

// نهاية دوال حفظ الفرع
//دوال حفظ الصنف 
// اولا دالة مزامنة سعر الصنف 
function syncBranchCost() {
  const base = document.getElementById("baseCost").value;
  const checkbox = document.getElementById("copyBaseCost");
  const branch = document.getElementById("branchCost");
  if (checkbox.checked && base !== "") {
    branch.value = base;
  }
}
//دالة شاشة الاصناف 
// اولا ملئ التصنيفات async function fillCategorySelect() {
 async function fillCategorySelectForItems() {
  const select = document.getElementById("categorySelect");
  if (!select) return;

  select.innerHTML = `<option value="">— اختر التصنيف —</option>`;

  const snapshot = await getDocs(collection(db, "categories"));
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.categoryName) {
      const option = document.createElement("option");
      option.value = data.categoryName;
      option.textContent = data.categoryName;
      select.appendChild(option);
    }
  });
}

async function fillBranchSelectForItems() {
  const select = document.getElementById("branchSelect");
  if (!select) return;

  select.innerHTML = `<option value="">— اختر الفرع —</option>`;

  const snapshot = await getDocs(collection(db, "branches"));
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.branchName) {
      const option = document.createElement("option");
      option.value = data.branchName;
      option.textContent = data.branchName;
      select.appendChild(option);
    }
  });
}


// دالة الحفظ الصنف
window.saveItem = async function () {
  const status = document.getElementById("itemStatus");

  // جمع البيانات من النموذج
  const itemName = document.getElementById("itemName").value.trim();
  const categoryName = document.getElementById("categorySelect").value;
  const branchName = document.getElementById("branchSelect").value;
  const quantity = Number(document.getElementById("quantity").value);
  const baseCost = Number(document.getElementById("baseCost").value);
  const branchCost = Number(document.getElementById("branchCost").value);
  const reorderLimit = Number(document.getElementById("reorderLimit").value);
  const imageInput = document.getElementById("itemImage");
  const file = imageInput.files[0];

  // التحقق من البيانات
  if (!itemName || !categoryName || !branchName || !file) {
    status.textContent = "❌ يجب إدخال كل البيانات واختيار صورة";
    status.style.color = "red";
    return;
  }

  // تجهيز البيانات للحفظ
  const itemData = {
    itemCode: "ITEM-" + Date.now(),
    itemName,
    categoryName,
    branchName,
    quantity,
    baseCost,
    branchCost,
    baseTotal: baseCost * quantity,
    branchTotal: branchCost * quantity,
    reorderLimit,
    imageName: file.name,
    imageUrl: "", // ممكن نضيف رابط لاحقًا لو رفعت الصورة
    createdAt: serverTimestamp()
  };

  try {
    // حفظ البيانات في Firestore
    await addDoc(collection(db, "items"), itemData);

    // رسالة نجاح
    status.textContent = "✅ تم حفظ الصنف بنجاح";
    status.style.color = "green";

    // تفريغ النموذج يدويًا
    document.getElementById("itemName").value = "";
    document.getElementById("categorySelect").value = "";
    document.getElementById("branchSelect").value = "";
    document.getElementById("quantity").value = 0;
    document.getElementById("baseCost").value = 0;
    document.getElementById("branchCost").value = 0;
    document.getElementById("reorderLimit").value = 0;
    document.getElementById("itemImage").value = "";
    document.getElementById("itemImagePreview").textContent = "";

    // تحديث الجدول لو عندك دالة عرض
    if (window.loadItems) loadItems();

  } catch (err) {
    console.error("❌ خطأ أثناء الحفظ:", err);
    status.textContent = "❌ فشل في حفظ الصنف";
    status.style.color = "red";
  }
};


// نهاية الحفظ 
window.openItemModal = function () {
  openModal("itemModal");
  fillCategorySelectForItems();
  fillBranchSelectForItems();
};



