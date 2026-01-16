import { DeviceCapabilities, DeviceType } from '../types';
import { getBrowserInfo, isMobileDevice } from '../utils/deviceChecks';

interface Props {
  capabilities: DeviceCapabilities | null;
  isChecking: boolean;
  selectedDevice: DeviceType;
}

export function DeviceCompatibility({ capabilities, isChecking, selectedDevice }: Props) {
  const browserInfo = getBrowserInfo();
  const isMobile = isMobileDevice();

  if (isChecking) {
    return (
      <div className="device-compatibility checking">
        <p>Checking device capabilities...</p>
      </div>
    );
  }

  if (!capabilities) {
    return (
      <div className="device-compatibility error">
        <p>Failed to check device capabilities</p>
      </div>
    );
  }

  const hasWarnings = capabilities.errors.length > 0;

  return (
    <div className={`device-compatibility ${hasWarnings ? 'has-warnings' : ''}`}>
      <h3>Device Status</h3>
      <ul className="status-list">
        <li className={capabilities.webgpuSupported ? 'supported' : 'unsupported'}>
          <span className="status-icon">{capabilities.webgpuSupported ? '✓' : '✗'}</span>
          <span>WebGPU: {capabilities.webgpuSupported ? 'Supported' : 'Not available'}</span>
        </li>
        <li className={capabilities.crossOriginIsolated ? 'supported' : 'unsupported'}>
          <span className="status-icon">{capabilities.crossOriginIsolated ? '✓' : '✗'}</span>
          <span>Cross-Origin Isolated: {capabilities.crossOriginIsolated ? 'Yes' : 'No'}</span>
        </li>
        <li className="info">
          <span className="status-icon">⚡</span>
          <span>Using: <strong>{selectedDevice.toUpperCase()}</strong></span>
        </li>
        <li className="info">
          <span className="status-icon">📱</span>
          <span>Browser: {browserInfo.name} {browserInfo.version} {isMobile ? '(Mobile)' : '(Desktop)'}</span>
        </li>
        {capabilities.estimatedMemoryMB > 0 && (
          <li className="info">
            <span className="status-icon">💾</span>
            <span>Est. GPU Memory: ~{capabilities.estimatedMemoryMB.toFixed(0)}MB</span>
          </li>
        )}
      </ul>

      {hasWarnings && (
        <div className="device-warnings">
          <h4>Warnings</h4>
          {capabilities.errors.map((err, i) => (
            <p key={i} className="warning">
              {err}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
