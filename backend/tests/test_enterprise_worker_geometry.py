from worker.tasks import extract_geometry, geometry_summary


def test_worker_extracts_feature_collection_and_computes_bbox():
    geometry = extract_geometry({
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [[
                [26.5, 41.5], [26.7, 41.5], [26.7, 41.7], [26.5, 41.5]
            ]]}, "properties": {}}
        ],
    })
    summary = geometry_summary(geometry)
    assert geometry["type"] == "Polygon"
    assert summary["bbox"] == [26.5, 41.5, 26.7, 41.7]
    assert 26.5 <= summary["longitude"] <= 26.7
    assert 41.5 <= summary["latitude"] <= 41.7


def test_worker_supports_line_and_point_geometry():
    line = extract_geometry({"type": "LineString", "coordinates": [[26.5, 41.5], [26.8, 41.8]]})
    summary = geometry_summary(line)
    assert summary["bbox"] == [26.5, 41.5, 26.8, 41.8]
    point = extract_geometry({"type": "Point", "coordinates": [26.55, 41.68]})
    assert geometry_summary(point)["latitude"] == 41.68
