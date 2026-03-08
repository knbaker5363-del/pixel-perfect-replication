

## خطة التنفيذ المقترحة:

### 1️⃣ إضافة رقم ID مميز لكل حساب
**تغييرات قاعدة البيانات:**
```sql
-- إضافة عمود display_id للملفات الشخصية
ALTER TABLE profiles ADD COLUMN display_id TEXT UNIQUE;

-- إنشاء trigger لتوليد ID تلقائياً
-- الطالب: STU00001
-- المعلم: TCH00001
-- الأدمن: ADM00001
```

**تغييرات الواجهة:**
- عرض الـ ID في صفحة `Profile.tsx`
- عرض الـ ID في بطاقة المستخدم في الـ Header

---

### 2️⃣ إضافة رفع صور البروفايل
**تغييرات قاعدة البيانات:**
```sql
-- إنشاء bucket جديد لصور البروفايل
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- سياسات الوصول
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
```

**تغييرات الواجهة:**
- إضافة زر "تغيير الصورة" في `Profile.tsx`
- معاينة الصورة قبل الرفع
- ضغط الصورة تلقائياً

---

### 3️⃣ تحسين جدول المواد وإضافة التفاصيل
**تغييرات قاعدة البيانات:**
```sql
-- إضافة أعمدة جديدة للمواد
ALTER TABLE subjects ADD COLUMN objectives TEXT;  -- أهداف المادة
ALTER TABLE subjects ADD COLUMN syllabus TEXT;    -- المنهج

-- تحديث جدول الأسعار بمدة الاشتراك
ALTER TABLE subject_prices ADD COLUMN duration_type TEXT DEFAULT 'semester'; -- semester, month, week, lifetime
ALTER TABLE subject_prices ADD COLUMN duration_value INTEGER DEFAULT 1;       -- عدد الوحدات
```

---

### 4️⃣ إنشاء صفحة تفاصيل المادة الكاملة
**ملف جديد: `SubjectDetails.tsx`**

عند الضغط على المادة تظهر صفحة تحتوي على:
- **معلومات عامة**: اسم المادة، الوصف، المعلم
- **أهداف المادة**: قائمة بالأهداف التعليمية
- **تفاصيل الاشتراك**:
  - المدة (فصل/شهر/أسبوع)
  - السعر بالنقاط
  - السعر بالمال (معطل حالياً)
- **المنهج الدراسي** (اختياري)
- **زر الاشتراك**

---

### 5️⃣ تحديث صفحة إنشاء/تعديل المادة للمعلم
**في `TeacherPanel.tsx`:**
- إضافة حقل "أهداف المادة"
- إضافة حقل "المنهج الدراسي"
- اختيار مدة الاشتراك
- تحديد السعر

---

## ملخص الملفات المتأثرة:

| الملف | التغيير |
|-------|---------|
| `profiles` table | إضافة `display_id` |
| `subjects` table | إضافة `objectives`, `syllabus` |
| `subject_prices` table | إضافة `duration_type`, `duration_value` |
| Storage | إنشاء bucket `avatars` |
| `Profile.tsx` | رفع الصور + عرض ID |
| `SubjectDetails.tsx` | صفحة جديدة لتفاصيل المادة |
| `TeacherPanel.tsx` | تحديث فورم إنشاء المادة |
| `App.tsx` | إضافة route جديد |

