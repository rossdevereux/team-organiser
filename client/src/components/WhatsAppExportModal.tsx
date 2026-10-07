import React, { useState, useEffect } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { Copy, Check, ExternalLink, X, MessageSquare, Sparkles } from 'lucide-react';

interface WhatsAppExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppExportModal: React.FC<WhatsAppExportModalProps> = ({ isOpen, onClose }) => {
  const { activeFixture } = useMatchday();
  const [announcementText, setAnnouncementText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && activeFixture) {
      setLoading(true);
      fetch(`/api/fixtures/${activeFixture.id}/export/whatsapp`)
        .then((res) => res.json())
        .then((data) => {
          if (data.announcement) {
            setAnnouncementText(data.announcement);
          }
        })
        .catch((err) => console.error('Failed to fetch WhatsApp text:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, activeFixture]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(announcementText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(announcementText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">WhatsApp Team Announcement</h3>
              <p className="text-xs text-slate-400">
                1-click copy formatted message for parents & team group chat
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

        {/* Message Bubble Simulator */}
        <div className="relative rounded-2xl bg-[#0b141a] border border-[#202c33] p-4 text-xs font-mono text-emerald-100 shadow-inner max-h-96 overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-slate-500 animate-pulse">
              Generating formatted WhatsApp announcement...
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-xs text-slate-200 leading-relaxed">
              {announcementText}
            </pre>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Includes matchday squad, rested players & reminders.
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/30 font-semibold text-xs transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in WhatsApp</span>
            </a>

            <button
              onClick={handleCopy}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy to Clipboard</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
