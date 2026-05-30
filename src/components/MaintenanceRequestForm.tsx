import React, { useState, useRef } from 'react';
import { submitServiceRequest, fetchCadets } from '../services/db';
import type { UserProfile } from '../types';
import { CheckCircle, ArrowRight, PenTool, Image as ImageIcon, X } from 'lucide-react';

interface Props {
  profile: UserProfile;
  onClose: () => void;
}

export default function MaintenanceRequestForm({ profile, onClose }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    location: '',
    description: '',
    severity: 'רגילה',
  });
  const [imageString, setImageString] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress image using canvas
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setImageString(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const cadets = await fetchCadets();
      const myCadet = cadets.find(c => c.personal_id === profile.personal_id);
      if (!myCadet) return;

      const requestDetails = {
        title: 'תקלת בינוי ותשתיות',
        requestDate: new Date().toLocaleDateString('he-IL'),
        name: profile.full_name,
        team: profile.team_number || 'ללא צוות',
        location: formData.location,
        description: formData.description,
        severity: formData.severity,
        image: imageString
      };

      await submitServiceRequest({
        cadet_id: myCadet.cadet_id,
        type: 'maintenance',
        details: requestDetails,
        status: 'pending'
      });

      setSubmitted(true);
      setTimeout(() => onClose(), 2500);
    } catch (err) {
      console.error(err);
      alert('אירעה שגיאה בשליחת הבקשה');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center animate-fade-in">
        <CheckCircle size={64} className="text-emerald-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">התקלה דווחה בהצלחה!</h2>
        <p className="text-slate-500 mt-2">הסגל יטפל בתקלה בהקדם.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-slide-up pb-12">

      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
            <PenTool size={28} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">דיווח תקלת בינוי</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">מיקום התקלה (בניין, חדר, אזור)</label>
              <input
                required
                type="text"
                placeholder="לדוגמה: בניין תקשוב, חדר 204"
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-shadow"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">דרגת חומרה</label>
              <select
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-shadow"
                value={formData.severity}
                onChange={e => setFormData({ ...formData, severity: e.target.value })}
              >
                <option value="נמוכה">נמוכה (מטרד קל)</option>
                <option value="רגילה">רגילה (תקלה שגרתית)</option>
                <option value="דחופה">דחופה (מפריעה למהלך תקין)</option>
                <option value="קריטית">קריטית (סכנה בטיחותית / מושבת לחלוטין)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">תיאור התקלה</label>
            <textarea
              required
              rows={4}
              placeholder="פרט ככל הניתן על התקלה..."
              className="w-full bg-white border border-slate-200 rounded-xl p-4 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none transition-shadow"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">הוספת תמונה (אופציונלי)</label>
            {!imageString ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:bg-slate-50 hover:border-orange-400 transition-colors"
              >
                <ImageIcon className="mx-auto text-slate-400 mb-2" size={32} />
                <p className="text-sm font-medium text-slate-600">לחץ להעלאת תמונה</p>
                <p className="text-xs text-slate-400 mt-1">או צלם מהטלפון</p>
              </div>
            ) : (
              <div className="relative inline-block">
                <img src={imageString} alt="Preview" className="rounded-xl max-h-48 border border-slate-200 shadow-sm" />
                <button 
                  type="button"
                  onClick={() => setImageString(null)}
                  className="absolute -top-3 -right-3 bg-rose-500 text-white rounded-full p-1 shadow-md hover:bg-rose-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-lg py-4 rounded-xl transition-all shadow-lg active:scale-95 mt-4 flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'שולח...' : 'שלח דיווח תקלה'}
          </button>
        </form>
      </div>
    </div>
  );
}
