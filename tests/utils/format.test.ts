import { formatBytes, formatDuration } from '@/lib/utils/format';

describe('Format Utilities', () => {
  describe('formatBytes', () => {
    it('should format zero bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('should format bytes correctly', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(15728640)).toBe('15 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should handle small byte values', () => {
      expect(formatBytes(100)).toBe('100 Bytes');
      expect(formatBytes(500)).toBe('500 Bytes');
      expect(formatBytes(999)).toBe('999 Bytes');
    });

    it('should handle large values', () => {
      expect(formatBytes(1099511627776)).toBe('1 TB');
      expect(formatBytes(2199023255552)).toBe('2 TB');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds correctly', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(59)).toBe('0:59');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(150)).toBe('2:30');
    });

    it('should format hours, minutes and seconds', () => {
      expect(formatDuration(3600)).toBe('1:00:00');
      expect(formatDuration(3690)).toBe('1:01:30');
      expect(formatDuration(7200)).toBe('2:00:00');
    });

    it('should handle edge cases', () => {
      expect(formatDuration(3661)).toBe('1:01:01');
      expect(formatDuration(86400)).toBe('24:00:00');
    });
  });
});