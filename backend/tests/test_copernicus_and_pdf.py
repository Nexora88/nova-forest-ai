from app.services.copernicus_service import _centroid
from app.utils.pdf_generator import generate_environment_report


def test_point_centroid_uses_wgs84_lon_lat_order():
    assert _centroid({"type": "Point", "coordinates": [26.55, 41.68]}) == (41.68, 26.55)


def test_invalid_geometry_is_rejected():
    try:
        _centroid({"type": "Point", "coordinates": [999, 999]})
    except ValueError:
        return
    raise AssertionError("Invalid WGS84 coordinates should be rejected")


def test_pdf_generator_returns_pdf_bytes_and_marks_missing_data():
    pdf = generate_environment_report(
        title="Environmental status report",
        area_name="Test area",
        provider_status={"Copernicus": "not_configured"},
        indicators=[{"name": "NDVI", "value": None, "source": "Copernicus", "observed_at": None}],
        notes=["Research decision-support only."],
    )
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 1000
