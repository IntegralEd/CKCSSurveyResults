'use client';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface Props {
  message?: string;
  /** Full-viewport overlay (for initial page hydration). Default: false (inline). */
  fullScreen?: boolean;
}

export default function LoadingOverlay({ message, fullScreen = false }: Props) {
  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4"
        style={{ background: '#f8fafc' }}
      >
        <DotLottieReact
          src="/loading.lottie"
          loop
          autoplay
          style={{ width: 220, height: 220 }}
        />
        {message && (
          <p className="text-sm font-medium" style={{ color: '#5E738C' }}>
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[320px] py-12 gap-3">
      <DotLottieReact
        src="/loading.lottie"
        loop
        autoplay
        style={{ width: 180, height: 180 }}
      />
      {message && (
        <p className="text-sm font-medium" style={{ color: '#5E738C' }}>
          {message}
        </p>
      )}
    </div>
  );
}
