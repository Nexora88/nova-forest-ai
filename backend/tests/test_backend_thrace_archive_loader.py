from datetime import date

from scripts.build_thrace_dataset import load_firms_archives


def test_load_firms_archive_filters_bbox_date_and_bad_rows(tmp_path):
    path = tmp_path / "firms_archive.csv"
    path.write_text(
        "latitude,longitude,acq_date,acq_time,instrument,frp\n"
        "41.7,26.5,2020-07-01,1030,VIIRS,4.2\n"
        "41.7,30.5,2020-07-01,1030,VIIRS,5.1\n"
        "41.7,26.5,2019-07-01,1030,VIIRS,5.1\n"
        "bad,26.5,2020-07-01,1030,VIIRS,1\n",
        encoding="utf-8",
    )
    rows = load_firms_archives([str(path)], date(2020, 1, 1), date(2020, 12, 31))
    assert len(rows) == 1
    assert rows[0]["_lat"] == 41.7
    assert rows[0]["_lon"] == 26.5
    assert rows[0]["_date"] == date(2020, 7, 1)
    assert rows[0]["satellite"] == "VIIRS"


def test_load_firms_archive_accepts_utf8_bom_and_deduplicates_same_cell_day(tmp_path):
    path = tmp_path / "firms_archive_bom.csv"
    path.write_text(
        "\ufefflatitude,longitude,acq_date,acq_time\n"
        "41.7001,26.5001,2020-07-01,1030\n"
        "41.7002,26.5002,2020-07-01,1040\n",
        encoding="utf-8",
    )
    rows = load_firms_archives([str(path)], date(2020, 7, 1), date(2020, 7, 1))
    assert len(rows) == 1
