import React from 'react';
import { PitchView } from '../components/PitchView';
import { BenchView } from '../components/BenchView';

export const LineupPage: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-7 xl:col-span-7 space-y-4">
        <PitchView />
      </div>

      <div className="lg:col-span-5 xl:col-span-5 space-y-4">
        <BenchView />
      </div>
    </div>
  );
};
