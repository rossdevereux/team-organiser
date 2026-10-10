import React, { useState, useEffect } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { Copy, Check, ExternalLink, X, MessageSquare, Sparkles } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface WhatsAppExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppExportModal: React.FC<WhatsAppExportModalProps> = ({ isOpen, onClose }) => {
  const { activeFixture } = useMatchday();
  const { showToast } = useToast();
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(announcementText);
      setCopied(true);
      showToast('Team sheet copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(announcementText)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <img src="/logo-icon.png" alt="SubShuffle" className="w-9 h-9 object-contain drop-shadow-md" />
              <div className="absolute -bottom-0.5 -right-0.5 p-1 rounded-full bg-[#25D366] text-slate-950 shadow-sm">
                <MessageSquare className="w-2.5 h-2.5 fill-current" />
              </div>
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
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Close dialog (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Bubble Simulator */}
        <div className="relative rounded-2xl bg-[#0b141a] border border-[#202c33] p-4 text-xs font-mono text-emerald-100 shadow-inner flex-1 min-h-[160px] max-h-[55vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-slate-500 animate-pulse">
              Generating formatted WhatsApp announcement...
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-xs text-slate-200 leading-relaxed select-all">
              {announcementText}
            </pre>
          )}
        </div>

        {/* Helper Note */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-300 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Includes matchday squad, rested players, kick-off time & venue details.</span>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition cursor-pointer order-last sm:order-first flex items-center justify-center"
          >
            Close
          </button>

          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/30 font-semibold text-xs transition"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            <span>Open in WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={handleCopy}
            className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition cursor-pointer ${
              copied
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 shrink-0" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 shrink-0" />
                <span>Copy to Clipboard</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
