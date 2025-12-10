"""Simple per-frame traffic counting helpers.

This module contains a very small utility to increment counts per frame and
aggregate basic statistics. For real tracking, integrate a tracker like DeepSort.
"""
from collections import defaultdict


class TrafficCounter:
    def __init__(self):
        self.total = 0
        self.by_frame = defaultdict(int)

    def add_frame(self, frame_idx, detections):
        self.by_frame[frame_idx] = detections
        self.total += detections

    def summary(self):
        return {'total': self.total, 'frames': dict(self.by_frame)}


def example_usage():
    tc = TrafficCounter()
    tc.add_frame(0, 3)
    tc.add_frame(1, 5)
    print(tc.summary())


if __name__ == '__main__':
    example_usage()
