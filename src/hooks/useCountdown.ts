import { useState, useRef, useCallback, useEffect } from 'react';

interface UseCountdownOptions {
  initialValue: number;
  onComplete: () => void;
  onCancel?: () => void;
}

interface UseCountdownResult {
  value: number;
  isActive: boolean;
  start: () => void;
  cancel: () => void;
}

export function useCountdown(options: UseCountdownOptions): UseCountdownResult {
  const { initialValue, onComplete, onCancel } = options;

  const [value, setValue] = useState(initialValue);
  const [isActive, setIsActive] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onCancelRef = useRef(onCancel);

  // Keep callbacks fresh
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onCancelRef.current = onCancel;
  }, [onComplete, onCancel]);

  // Countdown logic
  useEffect(() => {
    if (isActive && value > 0) {
      intervalRef.current = window.setInterval(() => {
        setValue((v) => v - 1);
      }, 1000);
    } else if (value === 0 && isActive) {
      setIsActive(false);
      onCompleteRef.current();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, value]);

  const start = useCallback(() => {
    setValue(initialValue);
    setIsActive(true);
  }, [initialValue]);

  const cancel = useCallback(() => {
    setIsActive(false);
    setValue(initialValue);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onCancelRef.current?.();
  }, [initialValue]);

  return { value, isActive, start, cancel };
}
