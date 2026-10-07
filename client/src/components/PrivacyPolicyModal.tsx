import React from 'react';
import {
  ShieldCheck,
  X,
  Lock,
  Eye,
  Trash2,
  Users,
  FileText,
  AlertCircle,
  HelpCircle,
  Server,
  HeartHandshake,
} from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-7 space-y-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>GDPR Guide & Privacy Policy</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  UK / EU GDPR & DPA 2018
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Data protection guidelines, legal rules, and privacy policy for grassroots youth football.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-xs text-slate-300 leading-relaxed">
          {/* Quick Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
              <HelpCircle className="w-4 h-4" />
              <span>Do I need a Privacy Policy & GDPR rules for my youth football team?</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              <strong>Yes, absolutely.</strong> Because you record player names, squad numbers, holiday/absence dates, and pitch playing time for <strong>children under 18</strong>, this constitutes personal data under the <strong>UK Data Protection Act 2018</strong>, <strong>EU GDPR</strong>, and <strong>COPPA (US)</strong>. As a coach or club administrator, you are considered a <em>Data Controller</em>.
            </p>
          </div>

          {/* Core GDPR Rules Checklist for Coaches */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span>5 Core GDPR Rules You Must Implement</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-sky-300">
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span>1. Parental Consent / Notice</span>
                </div>
                <p className="text-slate-400">
                  Children under 13/16 cannot provide legal consent. Your football club’s annual registration form should include a clause confirming player names and attendance are stored in coaching rotation software.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>2. Data Minimisation</span>
                </div>
                <p className="text-slate-400">
                  Only store what is strictly necessary (first name, initials, squad number). Never store residential addresses, bank details, or sensitive medical files in the squad roster.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>3. Right to Erasure (Deletion)</span>
                </div>
                <p className="text-slate-400">
                  Parents have the legal right to request their child's data be deleted when leaving the club. In SubShuffle, coaches can immediately remove players using the Squad tab "Delete" button.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                  <Server className="w-3.5 h-3.5 text-indigo-400" />
                  <span>4. Account Isolation & Security</span>
                </div>
                <p className="text-slate-400">
                  SubShuffle isolates team data per authenticated user. Data is never shared publicly or indexed by search engines. Only coaches invited via email can access squad lineups.
                </p>
              </div>
            </div>
          </div>

          {/* Official Privacy Policy Text */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Standard Privacy Policy (SubShuffle Application)</span>
            </h3>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3 text-[11px] text-slate-300">
              <div>
                <h4 className="font-bold text-white mb-0.5">1. Who We Are & Scope</h4>
                <p className="text-slate-400">
                  This application ("SubShuffle") is operated by youth football team coaches and club officials to manage equal playing time, rotation matrices, and matchday team sheets in compliance with FA youth development guidelines.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white mb-0.5">2. Personal Data Processed</h4>
                <ul className="list-disc list-inside text-slate-400 space-y-1">
                  <li><strong>Player Records:</strong> Player name/initials, squad shirt number, preferred positions, sign-on/leave dates.</li>
                  <li><strong>Attendance & Availability:</strong> Scheduled unavailable/holiday dates to prevent incorrect squad selection.</li>
                  <li><strong>Match Statistics:</strong> Historical match appearances, minutes played on pitch, goalkeeper rotation.</li>
                  <li><strong>Coach Information:</strong> Google Account email and user ID for authentication and multi-coach collaboration.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-white mb-0.5">3. Lawful Basis for Processing (GDPR Article 6 & 9)</h4>
                <p className="text-slate-400">
                  We process data under <strong>Legitimate Interests (Art. 6(1)(f))</strong> to administer youth football fixtures and ensure equal playing time fairness. Where required by local jurisdiction, seasonal parental consent is collected during club registration.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white mb-0.5">4. Third-Party Data Hosting & Processors</h4>
                <p className="text-slate-400">
                  SubShuffle data is processed via <strong>Google Cloud Platform (Cloud Run & Cloud Firestore)</strong> with certified ISO/IEC 27001 data centres and encrypted transfer (HTTPS/TLS).
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white mb-0.5">5. Parental Rights</h4>
                <p className="text-slate-400">
                  Parents or legal guardians may contact the team coach or club welfare officer at any time to inspect their child's playing time records, correct information, or request immediate deletion of records from the squad database.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <HeartHandshake className="w-3.5 h-3.5 text-emerald-400" />
            <span>Built for Grassroots Youth Football Fair Play</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
