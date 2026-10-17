import React from 'react';
import { Sparkles, Tag } from 'lucide-react';
import { APP_VERSION, APP_VERSION_LABEL } from '../utils/version';

interface AppVersionProps {
  onClick?: () => void;
  className?: string;
  showIcon?: boolean;
  prefix?: string;
}

export const AppVersion: React.FC<AppVersionProps> = ({
  onClick,
  className = '',
  showIcon = true,
  prefix = 'v',
}) => {
  const versionText = prefix === 'v' ? APP_VERSION_LABEL : `${prefix} ${APP_VERSION}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition cursor-pointer font-mono text-xs select-none group ${className}`}
      title={`View release notes & changelog for ${APP_VERSION_LABEL}`}
      aria-label={`View changelog for version ${APP_VERSION}`}
    >
      {showIcon && (
        <Sparkles className="w-3 h-3 text-emerald-400/80 group-hover:text-emerald-300 transition shrink-0" />
      )}
      <span className="font-semibold tracking-tight">{versionText}</span>
      <span className="text-[10px] text-slate-500 font-sans group-hover:text-slate-400 hidden sm:inline">
        (Release Notes)
      </span>
    </button>
  );
};
