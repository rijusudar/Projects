import {
  amplitudeMotion,
  motionState,
  qualityLabel,
  roomConfidence,
  rssiQuality,
} from '../src/domain/presence';

describe('presence heuristics', () => {
  it('maps RSSI to a 0..1 quality', () => {
    expect(rssiQuality(-30)).toBeCloseTo(1, 5);
    expect(rssiQuality(-90)).toBeCloseTo(0, 5);
    expect(rssiQuality(-60)).toBeCloseTo(0.5, 5);
    expect(rssiQuality(undefined)).toBe(0);
  });

  it('labels quality bands', () => {
    expect(qualityLabel(0.9)).toBe('high');
    expect(qualityLabel(0.5)).toBe('medium');
    expect(qualityLabel(0.1)).toBe('low');
  });

  it('computes motion energy from amplitude change and ignores bad input', () => {
    expect(amplitudeMotion([1, 1, 1], [1, 1, 1])).toBe(0);
    expect(amplitudeMotion(undefined, [1, 2])).toBe(0);
    expect(amplitudeMotion([1, 2], [1])).toBe(0); // length mismatch
    expect(amplitudeMotion([0, 0, 0], [0.2, 0.2, 0.2])).toBeGreaterThan(0);
  });

  it('classifies motion state', () => {
    expect(motionState(0)).toBe('still');
    expect(motionState(0.15)).toBe('walking');
    expect(motionState(0.6)).toBe('moving');
  });

  it('room confidence is bounded and scales with liveness', () => {
    const occupied = roomConfidence({
      occupied: true,
      liveness: 1,
      signalScore: 0.8,
      motionScore: 0.5,
      poseScore: 0,
    });
    expect(occupied).toBeGreaterThan(0);
    expect(occupied).toBeLessThanOrEqual(1);

    const halfLive = roomConfidence({
      occupied: true,
      liveness: 0.5,
      signalScore: 0.8,
      motionScore: 0.5,
      poseScore: 0,
    });
    expect(halfLive).toBeLessThan(occupied);

    // empty-room confidence == how well the room is sensed
    expect(
      roomConfidence({ occupied: false, liveness: 1, signalScore: 0.9, motionScore: 0, poseScore: 0 }),
    ).toBeCloseTo(0.9, 5);
    expect(
      roomConfidence({ occupied: false, liveness: 0, signalScore: 0.9, motionScore: 0, poseScore: 0 }),
    ).toBe(0);
  });
});
