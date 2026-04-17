"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface Options {
  totalSteps: number;
  autoPlayMs?: number;
}

interface Return {
  currentStep: number;
  totalSteps: number;
  next: () => void;
  prev: () => void;
  reset: () => void;
  goToStep: (n: number) => void;
  isPlaying: boolean;
  toggleAutoPlay: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function useSteppedVisualization({
  totalSteps,
  autoPlayMs = 2000,
}: Options): Return {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, totalSteps - 1));
  }, [totalSteps]);

  const prev = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  const goToStep = useCallback(
    (n: number) => setCurrentStep(Math.max(0, Math.min(n, totalSteps - 1))),
    [totalSteps]
  );

  const toggleAutoPlay = useCallback(() => setIsPlaying((p) => !p), []);

  useEffect(() => {
    if (isPlaying) {
      timer.current = setInterval(() => {
        setCurrentStep((s) => {
          if (s >= totalSteps - 1) {
            setIsPlaying(false);
            return s;
          }
          return s + 1;
        });
      }, autoPlayMs);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [isPlaying, totalSteps, autoPlayMs]);

  return {
    currentStep,
    totalSteps,
    next,
    prev,
    reset,
    goToStep,
    isPlaying,
    toggleAutoPlay,
    isFirst: currentStep === 0,
    isLast: currentStep === totalSteps - 1,
  };
}
