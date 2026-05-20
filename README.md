# ניהול השלמה טכנולוגית

אפליקציית ווב מותאמת מובייל לניהול שוטף של השלמה חילית. המערכת נועדה לסנכרן בין מפקד ההשלמה (מה"מ), מפקדי הצוותים (ממ"שים) ובעלי תפקידי הרוחב בסגל.
האפליקציה מתמקדת בניהול לו"ז מבוסס Google Calendar, מעקב נוכחות (מצבה) בזמן אמת, וניהול נתוני צוערים.

## טכנולוגיות (Tech Stack)
* **Frontend:** React (Vite) + TypeScript + TailwindCSS
* **Backend & DB:** Supabase (PostgreSQL, Auth, RLS)
* **Integrations:** Google Calendar API
* **Deployment:** Docker + Nginx

## דרישות מוקדמות
* Node.js (גרסה 20 ומעלה) - לפיתוח מקומי
* פרויקט ב-Supabase
* מפתח API של גוגל קלנדר + ID של יומן ציבורי

## התקנה והפעלה מקומית (סביבת פיתוח)

1. **התקנת תלויות:**
   ```bash
   npm install
   ```

2. **הגדרת משתני סביבה:**
   צור קובץ `.env` בתיקיית השורש ומלא את הערכים הבאים בהתאם לסביבה שלך:
   ```env
   VITE_GOOGLE_CALENDAR_API_KEY=your_google_api_key
   VITE_SHARED_CALENDAR_ID=your_calendar_id@group.calendar.google.com
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **הרצת השרת המקומי:**
   ```bash
   npm run dev
   ```

## הגדרת מסד הנתונים (Supabase)
המערכת מסתמכת על מספר טבלאות ב-Supabase: `users`, `cadets`, `attendance_logs`.
על מנת להקים את התשתית ב-Supabase:

1. היכנס לפרויקט ה-Supabase שלך.
2. נווט ל-**SQL Editor**.
3. הרץ את סקריפט ה-SQL שמופיע בקובץ `supabase_setup.sql` שנמצא בתיקיית הארטיפקטים בפרויקט (או בקש אותו מהסוכן). הסקריפט יוצר את הטבלאות, ההרשאות (RLS) והטיפוסים הנדרשים.
4. **יצירת משתמש ראשוני:** מערכת ההתחברות מתבססת על מספר אישי וסיסמה. מאחורי הקלעים, המערכת ממפה את המספר האישי לכתובת אימייל וירטואלית.
   כדי ליצור את המשתמש הראשון (המה"מ), עבור ל-Authentication ב-Supabase, צור משתמש חדש והזן את כתובת האימייל בפורמט: `[Personal_ID]@app.idf.il` עם הסיסמה שבחרת.
   לאחר מכן, קשר את ה-ID שנוצר לווידוא מתאים בטבלת `users` הציבורית (Public).

## Docker & פריסה לענן (Deployment)
המערכת כוללת `Dockerfile` המוכן לפריסה, המשתמש ב-Build Stage לאריזת ה-React App ו-Nginx לשרת את הקבצים הסטטיים.

בניית תמונת ה-Docker (Image) מצריכה הזרקה של משתני הסביבה באמצעות `build-arg` כך שהם יוטמעו בקבצי ה-Frontend בזמן ה-build:

```bash
docker build \
  --build-arg VITE_GOOGLE_CALENDAR_API_KEY="your_api_key" \
  --build-arg VITE_SHARED_CALENDAR_ID="your_calendar_id" \
  --build-arg VITE_SUPABASE_URL="your_supabase_url" \
  --build-arg VITE_SUPABASE_ANON_KEY="your_anon_key" \
  -t idf-tech-course-app .
```

הפעלת הקונטיינר (Container):
```bash
docker run -p 8080:80 idf-tech-course-app
```
האפליקציה תהיה זמינה בכתובת `http://localhost:8080`.

## מודל הרשאות (Roles) ומבנה המסכים
* **מה"מ (Admin):** גישת על. צפייה בלו"ז מלא של כל ה-8 צוותים ביומן משותף, צפייה סטטיסטית במי מגיע ומי נעדר מכל צוות, ניהול רשימת הצוערים (הוספה/מחיקה) וגישה למסך ייצוא הנתונים לאקסל.
* **ממ"ש (מפקד צוות):** גישה מוגבלת לצוות שלו בלבד. קריאת הלו"ז, וסימון נוכחות והיעדרויות כולל סיבות ספציפיות רק לצוערים תחת פיקודו.
* **תפקיד רוחב (הדרכה/לוגיסטיקה):** צפייה בלו"ז האחיד, צפייה בספר ההשלמה (צוערים) ברמת קריאה בלבד, וגישה מלאה למסך ייצוא הנתונים המותאם.
