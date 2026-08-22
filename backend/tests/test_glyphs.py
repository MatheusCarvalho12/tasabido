from __future__ import annotations

import hashlib
from pathlib import Path

import pytest

from app.glyphs import (
    CANONICAL_GLYPH_SET_VERSION,
    MissingGlyphError,
    canonical_glyph_set,
    first_name_grapheme,
    first_name_graphemes,
    resolve_first_name_glyph,
    resolve_first_name_glyphs,
)


def test_canonical_set_contains_latin_uppercase_and_portuguese_accents() -> None:
    glyph_set = canonical_glyph_set()
    assert glyph_set.version == CANONICAL_GLYPH_SET_VERSION
    assert set("ABCDEFGHIJKLMNOPQRSTUVWXYZ") <= glyph_set.geometry.keys()
    assert set("ÀÁÂÃÇÉÊÍÓÔÕÚ") <= glyph_set.geometry.keys()
    assert "Ü" in glyph_set.geometry
    assert len(glyph_set.geometry) == 39
    assert all(strokes for strokes in glyph_set.geometry.values())


def test_canonical_artifact_is_deterministic_and_matches_versioned_svg() -> None:
    glyph_set = canonical_glyph_set()
    path = Path(__file__).parents[1] / "storage/svgs/glyphs/uppercase-block-v1.svg"
    assert glyph_set.artifact == path.read_bytes()
    assert glyph_set.artifact_sha256 == hashlib.sha256(glyph_set.artifact).hexdigest()
    assert (
        glyph_set.artifact_sha256
        == "06e400a3aa41eb277f6885ede84ec75088e77a0764bb252ffd3210867bda1e9d"
    )


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("ana clara", "A"),
        ("  Álvaro", "Á"),
        ("A\u0301lvaro", "Á"),
        ("Érica", "É"),
        ("çícero", "Ç"),
        ("Úrsula", "Ú"),
    ],
)
def test_first_name_grapheme_is_unicode_aware(name: str, expected: str) -> None:
    assert first_name_grapheme(name) == expected
    assert resolve_first_name_glyph(name)[0] == expected


@pytest.mark.parametrize(
    ("name", "expected"),
    [("MATEUS Silva", "MATEUS"), ("ÁLVARO", "ÁLVARO"), ("A\u0301LVARO", "ÁLVARO")],
)
def test_entire_first_name_sequence_resolves_in_order(name: str, expected: str) -> None:
    assert "".join(first_name_graphemes(name)) == expected
    resolved = resolve_first_name_glyphs(name)
    assert [grapheme for grapheme, _ in resolved] == list(expected)
    assert [geometry for _, geometry in resolved] == [
        canonical_glyph_set().geometry[c] for c in expected
    ]


def test_all_canonical_geometry_is_in_normalized_scoring_domain() -> None:
    glyph_set = canonical_glyph_set()
    points = [
        point for glyph in glyph_set.geometry.values() for stroke in glyph for point in stroke
    ]
    assert all(0 <= coordinate <= 1 for point in points for coordinate in point)


def test_missing_later_grapheme_rejection_is_deterministic() -> None:
    with pytest.raises(MissingGlyphError, match="grapheme 'ẞ'") as first:
        resolve_first_name_glyphs("MATEUẞ")
    with pytest.raises(MissingGlyphError) as second:
        resolve_first_name_glyphs("MATEUẞ")
    assert str(first.value) == str(second.value)


def test_missing_glyph_rejection_is_deterministic() -> None:
    with pytest.raises(MissingGlyphError, match="grapheme 'ẞ'") as first:
        resolve_first_name_glyph("ẞia")
    with pytest.raises(MissingGlyphError) as second:
        resolve_first_name_glyph("ẞia")
    assert str(first.value) == str(second.value)


def test_empty_name_is_rejected_before_glyph_lookup() -> None:
    with pytest.raises(ValueError, match="at least one grapheme"):
        first_name_grapheme(" \t")
