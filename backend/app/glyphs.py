"""Versioned canonical glyph artifacts used by the tracing game.

The glyph set is deliberately represented as normalized line geometry instead of
as a rendered bitmap.  The same immutable geometry is used for scoring and the
deterministic SVG artifact, so a run can always be replayed against the exact
artifact version and digest that it recorded.
"""

from __future__ import annotations

import hashlib
import html
import unicodedata
from collections.abc import Mapping
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from types import MappingProxyType
from typing import TypeAlias

Point: TypeAlias = tuple[float, float]  # noqa: UP040
Stroke: TypeAlias = tuple[Point, ...]  # noqa: UP040
GlyphGeometry: TypeAlias = tuple[Stroke, ...]  # noqa: UP040

CANONICAL_GLYPH_SET_VERSION = "uppercase-block-v1"
CANONICAL_GLYPH_ARTIFACT_PATH = "svgs/glyphs/uppercase-block-v1.svg"


class MissingGlyphError(ValueError):
    """Raised when a profile name starts with no glyph in the pinned artifact."""

    def __init__(self, grapheme: str, version: str = CANONICAL_GLYPH_SET_VERSION) -> None:
        self.grapheme = grapheme
        self.version = version
        super().__init__(
            f"Missing canonical glyph for first-name grapheme {grapheme!r} in glyph set {version}"
        )


@dataclass(frozen=True, slots=True)
class CanonicalGlyphSet:
    """Immutable glyph geometry plus its byte-exact SVG artifact."""

    version: str
    geometry: Mapping[str, GlyphGeometry]
    artifact: bytes
    artifact_sha256: str
    artifact_path: str = CANONICAL_GLYPH_ARTIFACT_PATH


def _strokes(*strokes: tuple[Point, ...]) -> GlyphGeometry:
    return tuple(strokes)


# Coordinates are normalized to a 1 x 1 em square.  They are intentionally
# line-based: the client may render them as dotted guides, while the server can
# score against the same canonical geometry without depending on an SVG parser.
_BASE_GLYPHS: dict[str, GlyphGeometry] = {
    "A": _strokes(((0.08, 1.0), (0.50, 0.0), (0.92, 1.0)), ((0.24, 0.59), (0.76, 0.59))),
    "B": _strokes(
        ((0.16, 0.0), (0.16, 1.0)),
        ((0.16, 0.0), (0.62, 0.0), (0.83, 0.13), (0.83, 0.35), (0.62, 0.50), (0.16, 0.50)),
        ((0.16, 0.50), (0.64, 0.50), (0.85, 0.65), (0.85, 0.87), (0.64, 1.0), (0.16, 1.0)),
    ),
    "C": _strokes(
        (
            (0.86, 0.12),
            (0.68, 0.02),
            (0.36, 0.02),
            (0.12, 0.20),
            (0.08, 0.80),
            (0.36, 0.98),
            (0.68, 0.98),
            (0.86, 0.88),
        )
    ),
    "D": _strokes(
        ((0.16, 0.0), (0.16, 1.0)),
        ((0.16, 0.0), (0.56, 0.0), (0.86, 0.20), (0.86, 0.80), (0.56, 1.0), (0.16, 1.0)),
    ),
    "E": _strokes(
        ((0.84, 0.0), (0.14, 0.0), (0.14, 1.0), (0.84, 1.0)), ((0.14, 0.50), (0.70, 0.50))
    ),
    "F": _strokes(((0.16, 1.0), (0.16, 0.0), (0.84, 0.0)), ((0.16, 0.50), (0.68, 0.50))),
    "G": _strokes(
        (
            (0.86, 0.17),
            (0.68, 0.03),
            (0.36, 0.03),
            (0.12, 0.20),
            (0.08, 0.80),
            (0.36, 0.98),
            (0.68, 0.98),
            (0.86, 0.82),
            (0.86, 0.58),
            (0.53, 0.58),
        )
    ),
    "H": _strokes(
        ((0.14, 0.0), (0.14, 1.0)), ((0.86, 0.0), (0.86, 1.0)), ((0.14, 0.50), (0.86, 0.50))
    ),
    "I": _strokes(
        ((0.20, 0.0), (0.80, 0.0)), ((0.50, 0.0), (0.50, 1.0)), ((0.20, 1.0), (0.80, 1.0))
    ),
    "J": _strokes(
        ((0.20, 0.0), (0.82, 0.0)),
        ((0.62, 0.0), (0.62, 0.80), (0.48, 0.98), (0.24, 0.98), (0.08, 0.82)),
    ),
    "K": _strokes(((0.14, 0.0), (0.14, 1.0)), ((0.86, 0.0), (0.14, 0.52), (0.86, 1.0))),
    "L": _strokes(((0.16, 0.0), (0.16, 1.0), (0.86, 1.0))),
    "M": _strokes(((0.10, 1.0), (0.10, 0.0), (0.50, 0.56), (0.90, 0.0), (0.90, 1.0))),
    "N": _strokes(((0.12, 1.0), (0.12, 0.0), (0.88, 1.0), (0.88, 0.0))),
    "O": _strokes(
        (
            (0.36, 0.02),
            (0.64, 0.02),
            (0.88, 0.20),
            (0.88, 0.80),
            (0.64, 0.98),
            (0.36, 0.98),
            (0.12, 0.80),
            (0.12, 0.20),
            (0.36, 0.02),
        )
    ),
    "P": _strokes(
        ((0.16, 1.0), (0.16, 0.0)),
        ((0.16, 0.0), (0.62, 0.0), (0.84, 0.16), (0.84, 0.36), (0.62, 0.52), (0.16, 0.52)),
    ),
    "Q": _strokes(
        (
            (0.36, 0.02),
            (0.64, 0.02),
            (0.88, 0.20),
            (0.88, 0.80),
            (0.64, 0.98),
            (0.36, 0.98),
            (0.12, 0.80),
            (0.12, 0.20),
            (0.36, 0.02),
        ),
        ((0.56, 0.68), (0.92, 1.0)),
    ),
    "R": _strokes(
        ((0.16, 1.0), (0.16, 0.0)),
        ((0.16, 0.0), (0.62, 0.0), (0.84, 0.16), (0.84, 0.36), (0.62, 0.52), (0.16, 0.52)),
        ((0.52, 0.52), (0.88, 1.0)),
    ),
    "S": _strokes(
        (
            (0.84, 0.14),
            (0.64, 0.02),
            (0.30, 0.02),
            (0.10, 0.18),
            (0.10, 0.38),
            (0.30, 0.50),
            (0.66, 0.50),
            (0.86, 0.64),
            (0.86, 0.84),
            (0.66, 0.98),
            (0.30, 0.98),
            (0.10, 0.86),
        )
    ),
    "T": _strokes(((0.10, 0.0), (0.90, 0.0)), ((0.50, 0.0), (0.50, 1.0))),
    "U": _strokes(
        ((0.12, 0.0), (0.12, 0.80), (0.32, 0.98), (0.68, 0.98), (0.88, 0.80), (0.88, 0.0))
    ),
    "V": _strokes(((0.08, 0.0), (0.50, 1.0), (0.92, 0.0))),
    "W": _strokes(((0.06, 0.0), (0.28, 1.0), (0.50, 0.46), (0.72, 1.0), (0.94, 0.0))),
    "X": _strokes(((0.12, 0.0), (0.88, 1.0)), ((0.88, 0.0), (0.12, 1.0))),
    "Y": _strokes(((0.10, 0.0), (0.50, 0.48), (0.90, 0.0)), ((0.50, 0.48), (0.50, 1.0))),
    "Z": _strokes(((0.10, 0.0), (0.90, 0.0), (0.10, 1.0), (0.90, 1.0))),
}


_ACCENTS: dict[str, tuple[str, GlyphGeometry]] = {
    "À": (
        "A",
        _strokes(
            ((0.28, -0.04), (0.10, -0.20)),
        ),
    ),
    "Á": (
        "A",
        _strokes(
            ((0.26, -0.20), (0.44, -0.04)),
        ),
    ),
    "Â": (
        "A",
        _strokes(
            ((0.20, -0.10), (0.36, -0.22), (0.52, -0.10), (0.68, -0.22), (0.82, -0.10)),
        ),
    ),
    "Ã": (
        "A",
        _strokes(
            ((0.18, -0.08), (0.32, -0.20), (0.48, -0.08), (0.64, -0.20), (0.80, -0.08)),
        ),
    ),
    "Ç": (
        "C",
        _strokes(((0.42, 1.00), (0.50, 1.18), (0.66, 1.18))),
    ),
    "É": (
        "E",
        _strokes(
            ((0.26, -0.20), (0.44, -0.04)),
        ),
    ),
    "Ê": (
        "E",
        _strokes(
            ((0.22, -0.10), (0.38, -0.22), (0.54, -0.10), (0.70, -0.22), (0.84, -0.10)),
        ),
    ),
    "Í": (
        "I",
        _strokes(
            ((0.42, -0.20), (0.60, -0.04)),
        ),
    ),
    "Ó": (
        "O",
        _strokes(
            ((0.42, -0.20), (0.60, -0.04)),
        ),
    ),
    "Ô": (
        "O",
        _strokes(
            ((0.26, -0.10), (0.42, -0.22), (0.58, -0.10), (0.74, -0.22), (0.88, -0.10)),
        ),
    ),
    "Õ": (
        "O",
        _strokes(
            ((0.22, -0.08), (0.36, -0.20), (0.52, -0.08), (0.68, -0.20), (0.82, -0.08)),
        ),
    ),
    "Ú": (
        "U",
        _strokes(
            ((0.42, -0.20), (0.60, -0.04)),
        ),
    ),
    "Ü": (
        "U",
        _strokes(((0.30, -0.10), (0.30, -0.22)), ((0.68, -0.10), (0.68, -0.22))),
    ),
}


def _normalize_geometry(raw_geometry: Mapping[str, GlyphGeometry]) -> dict[str, GlyphGeometry]:
    """Map the complete em plus accent box into the scorer's [0, 1] domain."""

    points = [point for glyph in raw_geometry.values() for stroke in glyph for point in stroke]
    min_x = min(point[0] for point in points)
    max_x = max(point[0] for point in points)
    min_y = min(point[1] for point in points)
    max_y = max(point[1] for point in points)
    width = max_x - min_x
    height = max_y - min_y
    return {
        grapheme: tuple(
            tuple(
                (round((x - min_x) / width, 9), round((y - min_y) / height, 9)) for x, y in stroke
            )
            for stroke in glyph
        )
        for grapheme, glyph in raw_geometry.items()
    }


def _build_geometry() -> dict[str, GlyphGeometry]:
    result = dict(_BASE_GLYPHS)
    for accented, (base, accent) in _ACCENTS.items():
        result[accented] = result[base] + accent
    return _normalize_geometry(result)


def _path_for_geometry(geometry: GlyphGeometry, scale: float = 100.0) -> str:
    commands: list[str] = []
    for stroke in geometry:
        if not stroke:
            continue
        first_x, first_y = stroke[0]
        commands.append(f"M {first_x * scale:.2f} {first_y * scale:.2f}")
        commands.extend(f"L {x * scale:.2f} {y * scale:.2f}" for x, y in stroke[1:])
    return " ".join(commands)


def _artifact_for_geometry(geometry: Mapping[str, GlyphGeometry]) -> bytes:
    lines = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" '
        'data-glyph-set="uppercase-block-v1" data-coordinate-system="normalized-em-box">',
        "  <title>Ta Sabido canonical uppercase block glyphs</title>",
    ]
    for grapheme in sorted(geometry):
        path = _path_for_geometry(geometry[grapheme])
        lines.append(
            f'  <g id="glyph-{html.escape(grapheme)}" data-grapheme="{html.escape(grapheme)}">'
            f'<path d="{path}" fill="none" stroke="currentColor"/></g>'
        )
    lines.append("</svg>")
    return ("\n".join(lines) + "\n").encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    """Return the lowercase SHA-256 digest used for immutable artifacts."""

    return hashlib.sha256(value).hexdigest()


def artifact_sha256(value: bytes) -> str:
    """Return the digest used to pin a canonical artifact version."""

    return sha256_bytes(value)


@lru_cache(maxsize=1)
def canonical_glyph_set() -> CanonicalGlyphSet:
    geometry = MappingProxyType(_build_geometry())
    artifact = _artifact_for_geometry(geometry)
    return CanonicalGlyphSet(
        version=CANONICAL_GLYPH_SET_VERSION,
        geometry=geometry,
        artifact=artifact,
        artifact_sha256=sha256_bytes(artifact),
    )


def _first_name_word(name: str) -> str:
    words = name.strip().split()
    if not words:
        raise ValueError("A profile name must contain at least one grapheme")
    return words[0]


def first_name_graphemes(name: str) -> tuple[str, ...]:
    """Resolve every Unicode grapheme-like cluster in the first name.

    Profile names accept letters and whitespace.  Combining marks are joined to
    their base character before NFC normalization, which makes both ``Á`` and
    ``A\u0301`` resolve to the same canonical glyph without splitting an accent.
    """

    first_word = _first_name_word(name)
    graphemes: list[str] = []
    cluster: list[str] = []
    for character in first_word:
        if cluster and not unicodedata.category(character).startswith("M"):
            uppercase = unicodedata.normalize("NFC", "".join(cluster)).upper()
            graphemes.extend(_split_uppercase_expansion(uppercase))
            cluster = []
        cluster.append(character)
    if cluster:
        uppercase = unicodedata.normalize("NFC", "".join(cluster)).upper()
        graphemes.extend(_split_uppercase_expansion(uppercase))
    return tuple(graphemes)


def _split_uppercase_expansion(value: str) -> tuple[str, ...]:
    """Keep uppercase expansions deterministic while retaining combining marks."""

    result: list[str] = []
    cluster: list[str] = []
    for character in value:
        if cluster and not unicodedata.category(character).startswith("M"):
            result.append(unicodedata.normalize("NFC", "".join(cluster)))
            cluster = []
        cluster.append(character)
    if cluster:
        result.append(unicodedata.normalize("NFC", "".join(cluster)))
    return tuple(result)


def first_name_grapheme(name: str) -> str:
    """Return the first grapheme as a compatibility convenience."""

    return first_name_graphemes(name)[0]


def resolve_first_name_glyphs(
    name: str, glyph_set: CanonicalGlyphSet | None = None
) -> tuple[tuple[str, GlyphGeometry], ...]:
    """Resolve the complete ordered first-name grapheme sequence."""

    selected = glyph_set or canonical_glyph_set()
    resolved: list[tuple[str, GlyphGeometry]] = []
    for grapheme in first_name_graphemes(name):
        geometry = selected.geometry.get(grapheme)
        if geometry is None:
            raise MissingGlyphError(grapheme, selected.version)
        resolved.append((grapheme, geometry))
    return tuple(resolved)


def resolve_first_name_glyph(
    name: str, glyph_set: CanonicalGlyphSet | None = None
) -> tuple[str, GlyphGeometry]:
    """Return the canonical first grapheme and geometry or reject deterministically."""

    return resolve_first_name_glyphs(name, glyph_set)[0]


def canonical_artifact_path(root: Path) -> Path:
    """Resolve the versioned artifact path below a backend storage root."""

    return root / CANONICAL_GLYPH_ARTIFACT_PATH
