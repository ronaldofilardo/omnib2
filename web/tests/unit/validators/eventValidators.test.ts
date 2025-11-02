import { validateEventData, validateTimeFormat, validateDateFormat, checkEventOverlap } from '@/lib/validators/eventValidators';
import { vi } from 'vitest';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    healthEvent: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

describe('Event Validators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateTimeFormat', () => {
    it('should accept valid time formats', () => {
      expect(validateTimeFormat('09:00')).toBe(true);
      expect(validateTimeFormat('23:59')).toBe(true);
      expect(validateTimeFormat('00:00')).toBe(true);
      expect(validateTimeFormat('12:30')).toBe(true);
    });

    it('should reject invalid time formats', () => {
      expect(validateTimeFormat('25:00')).toBe(false);
      expect(validateTimeFormat('09:60')).toBe(false);
      expect(validateTimeFormat('9:00')).toBe(false);
      expect(validateTimeFormat('09:0')).toBe(false);
      expect(validateTimeFormat('')).toBe(false);
      expect(validateTimeFormat('abc')).toBe(false);
      expect(validateTimeFormat('09:00:00')).toBe(false);
    });
  });

  describe('validateDateFormat', () => {
    it('should accept valid date formats', () => {
      expect(validateDateFormat('2024-01-15')).toBe(true);
      expect(validateDateFormat('2024-12-31')).toBe(true);
      expect(validateDateFormat('2024-02-29')).toBe(true); // Valid leap year
    });

    it('should reject invalid date formats', () => {
      expect(validateDateFormat('2024-13-01')).toBe(false);
      expect(validateDateFormat('2024-01-32')).toBe(false);
      expect(validateDateFormat('2024-02-30')).toBe(false);
      expect(validateDateFormat('2024-1-15')).toBe(false);
      expect(validateDateFormat('24-01-15')).toBe(false);
      expect(validateDateFormat('')).toBe(false);
      expect(validateDateFormat('abc')).toBe(false);
    });

    it('should reject invalid leap year dates', () => {
      expect(validateDateFormat('2023-02-29')).toBe(false); // 2023 is not a leap year
    });
  });

  describe('checkEventOverlap', () => {
    it('should return false when no overlapping events exist', async () => {
      const mockEvents = [
        {
          id: '1',
          date: '2024-01-15',
          startTime: '08:00',
          endTime: '09:00',
        },
      ];

      (prisma.healthEvent.findMany as any).mockResolvedValue(mockEvents);

      const result = await checkEventOverlap(
        'user-1',
        '2024-01-15',
        '10:00',
        '11:00',
        'prof-1'
      );

      expect(result).toBe(false);
      expect(prisma.healthEvent.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          date: '2024-01-15',
          professionalId: 'prof-1',
        },
      });
    });

    it('should return true when events overlap', async () => {
      const mockEvents = [
        {
          id: '1',
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '10:30',
        },
      ];

      (prisma.healthEvent.findMany as any).mockResolvedValue(mockEvents);

      // New event: 10:00 - 11:00 overlaps with existing 09:00 - 10:30
      const result = await checkEventOverlap(
        'user-1',
        '2024-01-15',
        '10:00',
        '11:00',
        'prof-1'
      );

      expect(result).toBe(true);
    });

    it('should return false for adjacent events', async () => {
      const mockEvents = [
        {
          id: '1',
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '10:00',
        },
      ];

      (prisma.healthEvent.findMany as any).mockResolvedValue(mockEvents);

      // New event: 10:00 - 11:00 is adjacent but doesn't overlap
      const result = await checkEventOverlap(
        'user-1',
        '2024-01-15',
        '10:00',
        '11:00',
        'prof-1'
      );

      expect(result).toBe(false);
    });

    it('should handle events that start before and end during existing event', async () => {
      const mockEvents = [
        {
          id: '1',
          date: '2024-01-15',
          startTime: '10:00',
          endTime: '11:00',
        },
      ];

      (prisma.healthEvent.findMany as any).mockResolvedValue(mockEvents);

      // New event: 09:30 - 10:30 overlaps with existing 10:00 - 11:00
      const result = await checkEventOverlap(
        'user-1',
        '2024-01-15',
        '09:30',
        '10:30',
        'prof-1'
      );

      expect(result).toBe(true);
    });

    it('should handle events that start during and end after existing event', async () => {
      const mockEvents = [
        {
          id: '1',
          date: '2024-01-15',
          startTime: '10:00',
          endTime: '11:00',
        },
      ];

      (prisma.healthEvent.findMany as any).mockResolvedValue(mockEvents);

      // New event: 10:30 - 11:30 overlaps with existing 10:00 - 11:00
      const result = await checkEventOverlap(
        'user-1',
        '2024-01-15',
        '10:30',
        '11:30',
        'prof-1'
      );

      expect(result).toBe(true);
    });

    it('should handle events that completely contain existing event', async () => {
      const mockEvents = [
        {
          id: '1',
          date: '2024-01-15',
          startTime: '10:30',
          endTime: '11:00',
        },
      ];

      (prisma.healthEvent.findMany as any).mockResolvedValue(mockEvents);

      // New event: 10:00 - 11:30 completely contains existing 10:30 - 11:00
      const result = await checkEventOverlap(
        'user-1',
        '2024-01-15',
        '10:00',
        '11:30',
        'prof-1'
      );

      expect(result).toBe(true);
    });

    it('should exclude current event when checking overlap for updates', async () => {
      const mockEvents = [
        {
          id: '1',
          date: '2024-01-15',
          startTime: '10:00',
          endTime: '11:00',
        },
      ];

      (prisma.healthEvent.findMany as any).mockResolvedValue(mockEvents);

      // When updating the same event, it should not overlap with itself
      const result = await checkEventOverlap(
        'user-1',
        '2024-01-15',
        '10:00',
        '11:00',
        'prof-1',
        '1' // Exclude current event
      );

      expect(result).toBe(false);
      expect(prisma.healthEvent.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          date: '2024-01-15',
          professionalId: 'prof-1',
          id: { not: '1' },
        },
      });
    });
  });

  describe('validateEventData', () => {
    it('should validate complete and correct event data', () => {
      const validData = {
        title: 'Consulta Médica',
        date: '2024-01-15',
        type: 'consulta',
        startTime: '10:00',
        endTime: '11:00',
        professionalId: 'prof-1',
      };

      const result = validateEventData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        title: '',
        date: '',
        type: '',
        startTime: '',
        endTime: '',
        professionalId: '',
      };

      const result = validateEventData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBeDefined();
      expect(result.errors.date).toBeDefined();
      expect(result.errors.type).toBeDefined();
      expect(result.errors.startTime).toBeDefined();
      expect(result.errors.endTime).toBeDefined();
      expect(result.errors.professionalId).toBeDefined();
    });

    it('should reject invalid date format', () => {
      const invalidData = {
        title: 'Consulta Médica',
        date: 'invalid-date',
        type: 'consulta',
        startTime: '10:00',
        endTime: '11:00',
        professionalId: 'prof-1',
      };

      const result = validateEventData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.date).toBe('Formato de data inválido. Use dd/mm/yyyy ou yyyy-MM-dd.');
    });

    it('should reject invalid time formats', () => {
      const invalidData = {
        title: 'Consulta Médica',
        date: '2024-01-15',
        type: 'consulta',
        startTime: '25:00',
        endTime: '11:00',
        professionalId: 'prof-1',
      };

      const result = validateEventData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.startTime).toBe('Formato de horário inválido. Use HH:mm.');
    });

    it('should reject end time before start time', () => {
      const invalidData = {
        title: 'Consulta Médica',
        date: '2024-01-15',
        type: 'consulta',
        startTime: '11:00',
        endTime: '10:00',
        professionalId: 'prof-1',
      };

      const result = validateEventData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.endTime).toBe('Horário de fim deve ser maior que o de início.');
    });

    it('should accept same start and end time', () => {
      const validData = {
        title: 'Consulta Médica',
        date: '2024-01-15',
        type: 'consulta',
        startTime: '10:00',
        endTime: '10:00',
        professionalId: 'prof-1',
      };

      const result = validateEventData(validData);
      expect(result.isValid).toBe(false);
      expect(result.errors.endTime).toBe('Horário de fim deve ser maior que o de início.');
    });

    it('should accept optional description field', () => {
      const validData = {
        title: 'Consulta Médica',
        description: 'Consulta de rotina',
        date: '2024-01-15',
        type: 'consulta',
        startTime: '10:00',
        endTime: '11:00',
        professionalId: 'prof-1',
      };

      const result = validateEventData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should accept optional observation field', () => {
      const validData = {
        title: 'Consulta Médica',
        date: '2024-01-15',
        type: 'consulta',
        startTime: '10:00',
        endTime: '11:00',
        professionalId: 'prof-1',
        observation: 'Paciente apresenta sintomas leves',
      };

      const result = validateEventData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should accept optional instructions field', () => {
      const validData = {
        title: 'Consulta Médica',
        date: '2024-01-15',
        type: 'consulta',
        startTime: '10:00',
        endTime: '11:00',
        professionalId: 'prof-1',
        instructions: true,
      };

      const result = validateEventData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should handle edge case with minimum valid times', () => {
      const validData = {
        title: 'Consulta Médica',
        date: '2024-01-15',
        type: 'consulta',
        startTime: '00:00',
        endTime: '00:01',
        professionalId: 'prof-1',
      };

      const result = validateEventData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should handle edge case with maximum valid times', () => {
      const validData = {
        title: 'Consulta Médica',
        date: '2024-01-15',
        type: 'consulta',
        startTime: '23:58',
        endTime: '23:59',
        professionalId: 'prof-1',
      };

      const result = validateEventData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });
  });
});
