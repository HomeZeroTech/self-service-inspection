import { useState, useEffect } from 'react';
import { checkDeviceCapabilities, getRecommendedDevice } from '../utils/deviceChecks';
import type { DeviceCapabilities, DeviceType } from '../types';

interface UseDeviceCapabilitiesResult {
  capabilities: DeviceCapabilities | null;
  isChecking: boolean;
  recommendedDevice: DeviceType;
  error: string | null;
}

export function useDeviceCapabilities(): UseDeviceCapabilitiesResult {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const caps = await checkDeviceCapabilities();
        setCapabilities(caps);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check device capabilities');
      } finally {
        setIsChecking(false);
      }
    }
    check();
  }, []);

  const recommendedDevice: DeviceType = capabilities
    ? getRecommendedDevice(capabilities)
    : 'wasm';

  return { capabilities, isChecking, recommendedDevice, error };
}
