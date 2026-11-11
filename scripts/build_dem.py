"""Merge the two SRTM tiles covering the Khumbu and fill their voids.
Expects N27E086.hgt and N28E086.hgt (SRTM3, 1201x1201 big-endian int16) in data/raw/.
The void-free N27E086 matters most: it carries Everest, Lhotse, Ama Dablam and Thamserku."""
import numpy as np
from scipy import ndimage
from pathlib import Path
RAW = Path(__file__).resolve().parents[1] / 'data' / 'raw'
OUT = Path(__file__).resolve().parents[1] / 'data' / 'merged.npy'
def load(name):
    a = np.fromfile(RAW / name, dtype='>i2').reshape(1201, 1201).astype(np.float64)
    void = a < -1000
    if void.any():
        idx = ndimage.distance_transform_edt(void, return_distances=False, return_indices=True)
        f = a[tuple(idx)]
        for _ in range(200):
            f[void] = ndimage.uniform_filter(f, 3)[void]
        a = np.where(void, f, a)
    return a
M = np.vstack([load('N28E086.hgt')[:-1], load('N27E086.hgt')])   # rows run lat 29 -> 27
np.save(OUT, M.astype(np.float32))
print('merged', M.shape, 'min', M.min(), 'max', M.max(), '->', OUT)
